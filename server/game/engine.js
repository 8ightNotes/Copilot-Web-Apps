const {
  ACTION_DEFINITIONS,
  DEFAULT_START_DAY,
  DEFAULT_START_MINUTE,
  LOCATION_IDS,
  MAX_EVENT_LOG_LENGTH,
  MINUTES_PER_DAY,
} = require('./constants');
const { GameValidationError } = require('./errors');
const { SimulationTime, formatClock } = require('./time');
const { World } = require('./world');

const PLAYER = {
  id: 'player',
  name: 'You',
  homeLocationId: LOCATION_IDS.HOME,
  startLocationId: LOCATION_IDS.OFFICE,
};

function minutesToClock(minutes) {
  return formatClock(minutes % (24 * 60));
}

class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.time = new SimulationTime(DEFAULT_START_DAY, DEFAULT_START_MINUTE);
    this.world = new World(DEFAULT_START_MINUTE);
    this.player = {
      ...PLAYER,
      locationId: PLAYER.startLocationId,
    };
    this.events = [];
    this.nextEventId = 1;
    this.turn = 0;
    this.notice = 'The day is waiting for you.';

    this.addEvent(
      'day_start',
      `You arrive at the Northstar Office. The morning is already in motion.`,
    );
    this.addEvent(
      'observation',
      this.describeScene(),
    );
  }

  getState() {
    const currentLocation = this.world.getLocation(this.player.locationId);
    const nearbyNpcs = this.world.getNpcsAt(this.player.locationId);

    return {
      title: 'A Text Impostor',
      phase: 1,
      turn: this.turn,
      time: this.time.toJSON(),
      player: {
        id: this.player.id,
        name: this.player.name,
        locationId: this.player.locationId,
        location: currentLocation,
      },
      locations: this.world.getPublicLocations(),
      npcs: this.world.getPublicNpcs(),
      nearbyNpcs: nearbyNpcs.map((npc) => ({
        id: npc.id,
        name: npc.name,
        age: npc.age,
        occupation: npc.occupation,
        personality: npc.personality,
        activity: npc.activity,
      })),
      actions: ACTION_DEFINITIONS,
      eventLog: this.events.slice(-MAX_EVENT_LOG_LENGTH),
      notice: this.notice,
    };
  }

  performAction(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new GameValidationError('Choose an action before continuing.');
    }

    const actionId = typeof input.action === 'string' ? input.action.trim() : '';
    if (!ACTION_DEFINITIONS.some((action) => action.id === actionId)) {
      throw new GameValidationError('That action is not available in this simulation.');
    }

    switch (actionId) {
      case 'talk':
        return this.talkTo(input.targetId);
      case 'follow':
        return this.follow(input.targetId);
      case 'go':
        return this.goTo(input.locationId);
      case 'schedule':
        return this.checkSchedule();
      case 'wait':
        return this.wait();
      default:
        throw new GameValidationError('That action is not available in this simulation.');
    }
  }

  talkTo(targetId) {
    const npc = this.requireNpc(targetId);
    if (npc.locationId !== this.player.locationId) {
      throw new GameValidationError(`${npc.name} is not at ${this.world.getLocation(this.player.locationId).shortName}.`);
    }

    const conversation = this.world.getConversation(npc.id, this.time.getPeriod());
    this.notice = `${conversation.speaker} answered you.`;
    this.addEvent(
      'conversation',
      `${conversation.speaker}: “${conversation.line}”`,
      {
        speakerId: conversation.speakerId,
        context: conversation.context,
      },
    );
    this.advanceTime(15);

    return this.getState();
  }

  follow(targetId) {
    const npc = this.requireNpc(targetId);
    const destination = this.world.getLocation(npc.locationId);
    const previousLocation = this.world.getLocation(this.player.locationId);

    if (npc.locationId === this.player.locationId) {
      this.addEvent('movement', `You stay with ${npc.name} at the ${destination.shortName.toLowerCase()}.`);
      this.notice = `${npc.name} is already here. You keep them company.`;
    } else {
      this.player.locationId = npc.locationId;
      this.addEvent(
        'movement',
        `You leave the ${previousLocation.shortName.toLowerCase()} and follow ${npc.name} to the ${destination.shortName.toLowerCase()}.`,
      );
      this.notice = `You followed ${npc.name} to the ${destination.shortName}.`;
    }

    this.advanceTime(30);
    return this.getState();
  }

  goTo(locationId) {
    const destination = this.world.getLocation(locationId);
    if (!destination) {
      throw new GameValidationError('Choose a real location from the map.');
    }

    if (destination.id === this.player.locationId) {
      throw new GameValidationError(`You are already at the ${destination.shortName.toLowerCase()}.`);
    }

    const previousLocation = this.world.getLocation(this.player.locationId);
    this.player.locationId = destination.id;
    this.addEvent(
      'movement',
      `You leave the ${previousLocation.shortName.toLowerCase()} and head to the ${destination.shortName.toLowerCase()}.`,
    );
    this.notice = `You arrived at the ${destination.shortName}.`;
    this.advanceTime(30);

    return this.getState();
  }

  checkSchedule() {
    const schedule = this.world.getScheduleSnapshot(this.time.minuteOfDay);
    const currentLocation = this.world.getLocation(this.player.locationId);
    const nearby = schedule
      .filter((entry) => entry.current.locationId === this.player.locationId)
      .map((entry) => `${entry.name} is ${entry.current.activity}`)
      .join('; ');
    const nearbySummary = nearby
      ? `At the ${currentLocation.shortName.toLowerCase()}, ${nearby}.`
      : `Nobody from your circle is scheduled at the ${currentLocation.shortName.toLowerCase()} right now.`;

    this.addEvent(
      'schedule',
      `You check the day ahead. ${nearbySummary}`,
      {
        schedule: schedule.map((entry) => ({
          name: entry.name,
          current: entry.current,
          next: entry.next,
        })),
      },
    );
    this.notice = 'You take a moment to orient yourself.';
    this.advanceTime(5);

    return this.getState();
  }

  wait() {
    this.addEvent(
      'waiting',
      `You wait at the ${this.world.getLocation(this.player.locationId).shortName.toLowerCase()} and watch the day move around you.`,
    );
    this.notice = 'Time passes.';
    this.advanceTime(30);

    return this.getState();
  }

  requireNpc(targetId) {
    const normalizedId = typeof targetId === 'string' ? targetId.trim() : '';
    const npc = this.world.getNpc(normalizedId);
    if (!npc) {
      throw new GameValidationError('Choose one of the people in the simulation.');
    }
    return npc;
  }

  advanceTime(minutes) {
    let remaining = minutes;

    while (remaining > 0) {
      const minutesUntilDayEnd = MINUTES_PER_DAY - this.time.minuteOfDay;
      const step = Math.min(remaining, Math.max(1, minutesUntilDayEnd));
      const previousDay = this.time.day;
      this.time.advance(step);

      if (this.time.day !== previousDay) {
        this.addEvent(
          'day_start',
          `A new day begins. Day ${this.time.day} starts at ${minutesToClock(this.time.minuteOfDay)}.`,
        );
      }

      this.world.syncNpcSchedules(this.time.minuteOfDay, ({ npc, from, to, activity }) => {
        let movementText;
        if (!to) {
          movementText = `${npc.name} is following a schedule with an unknown destination.`;
        } else if (!from) {
          movementText = `${npc.name} is now at the ${to.shortName.toLowerCase()} to ${activity}.`;
        } else if (from.id === to.id) {
          movementText = `${npc.name} remains at the ${to.shortName.toLowerCase()} and is now ${activity}.`;
        } else {
          movementText = `${npc.name} leaves the ${from.shortName.toLowerCase()} for the ${to.shortName.toLowerCase()} to ${activity}.`;
        }
        this.addEvent('npc_movement', movementText, { npcId: npc.id });
      });

      remaining -= step;
    }

    this.turn += 1;
  }

  describeScene() {
    const location = this.world.getLocation(this.player.locationId);
    const nearby = this.world.getNpcsAt(this.player.locationId);

    if (nearby.length === 0) {
      return `The ${location.shortName.toLowerCase()} is quiet. You have it mostly to yourself.`;
    }

    const descriptions = nearby.map(
      (npc) => `${npc.name} is here, ${npc.activity}`,
    );
    return `${location.description} ${descriptions.join('. ')}.`;
  }

  addEvent(type, text, details = {}) {
    this.events.push({
      id: this.nextEventId,
      type,
      day: this.time.day,
      minuteOfDay: this.time.minuteOfDay,
      clock: formatClock(this.time.minuteOfDay),
      text,
      ...details,
    });
    this.nextEventId += 1;

    if (this.events.length > MAX_EVENT_LOG_LENGTH) {
      this.events = this.events.slice(-MAX_EVENT_LOG_LENGTH);
    }
  }
}

module.exports = {
  GameEngine,
};
