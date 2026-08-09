const { LOCATION_IDS, MINUTES_PER_DAY } = require('./constants');

const LOCATIONS = [
  {
    id: LOCATION_IDS.HOME,
    name: 'Your apartment',
    shortName: 'Apartment',
    description: 'A small, quiet place to begin the day and collect your thoughts.',
  },
  {
    id: LOCATION_IDS.OFFICE,
    name: 'Northstar Office',
    shortName: 'Office',
    description: 'A bright shared office where deadlines, coffee, and rumors overlap.',
  },
  {
    id: LOCATION_IDS.CAFETERIA,
    name: 'Corner Cafeteria',
    shortName: 'Cafeteria',
    description: 'A neighborhood café with crowded tables and a view of the street.',
  },
  {
    id: LOCATION_IDS.PARK,
    name: 'Riverside Park',
    shortName: 'Park',
    description: 'A strip of green along the river, popular with walkers after work.',
  },
  {
    id: LOCATION_IDS.GYM,
    name: 'Pioneer Gym',
    shortName: 'Gym',
    description: 'A modest gym with loud music and an even louder regular crowd.',
  },
  {
    id: LOCATION_IDS.TOWN_SQUARE,
    name: 'Town Square',
    shortName: 'Town Square',
    description: 'The center of the neighborhood, with a bus stop and a public noticeboard.',
  },
];

function scheduleEntry(start, end, locationId, activity) {
  return { start, end, locationId, activity };
}

const NPC_BLUEPRINTS = [
  {
    id: 'sarah',
    name: 'Sarah Chen',
    age: 29,
    occupation: 'Product designer',
    personality: 'observant and warm',
    homeLocationId: LOCATION_IDS.HOME,
    schedule: [
      scheduleEntry(0, 7 * 60 + 45, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60 + 45, 9 * 60, LOCATION_IDS.OFFICE, 'settling in at her desk'),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'working at her desk'),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch'),
      scheduleEntry(13 * 60, 17 * 60, LOCATION_IDS.OFFICE, 'sketching product ideas'),
      scheduleEntry(17 * 60, 18 * 60, LOCATION_IDS.PARK, 'walking by the river'),
      scheduleEntry(18 * 60, 21 * 60, LOCATION_IDS.CAFETERIA, 'reading over dinner'),
      scheduleEntry(21 * 60, MINUTES_PER_DAY, LOCATION_IDS.HOME, 'unwinding at home'),
    ],
    dialogue: [
      'I keep noticing how different this place feels depending on who is here.',
      'The day is still young. There is plenty of time for something unexpected to happen.',
      'I was just making a list of what I know and what I am assuming.',
    ],
  },
  {
    id: 'mike',
    name: 'Mike Alvarez',
    age: 34,
    occupation: 'Facilities coordinator',
    personality: 'sociable and practical',
    homeLocationId: LOCATION_IDS.HOME,
    schedule: [
      scheduleEntry(0, 7 * 60, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60, 8 * 60 + 30, LOCATION_IDS.CAFETERIA, 'grabbing breakfast'),
      scheduleEntry(8 * 60 + 30, 9 * 60, LOCATION_IDS.TOWN_SQUARE, 'walking to work'),
      scheduleEntry(9 * 60, 11 * 60, LOCATION_IDS.OFFICE, 'checking the building'),
      scheduleEntry(11 * 60, 12 * 60, LOCATION_IDS.GYM, 'fitting in a workout'),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch'),
      scheduleEntry(13 * 60, 16 * 60, LOCATION_IDS.OFFICE, 'handling maintenance requests'),
      scheduleEntry(16 * 60, 17 * 60, LOCATION_IDS.TOWN_SQUARE, 'running errands'),
      scheduleEntry(17 * 60, 19 * 60, LOCATION_IDS.PARK, 'meeting friends'),
      scheduleEntry(19 * 60, MINUTES_PER_DAY, LOCATION_IDS.HOME, 'cooking dinner'),
    ],
    dialogue: [
      'If you want to know what is going on, start by noticing who keeps arriving late.',
      'I know everybody here, or at least I know who says they know everybody.',
      'The building has a rhythm. You can tell when something is out of place.',
    ],
  },
  {
    id: 'james',
    name: 'James Okafor',
    age: 41,
    occupation: 'Project manager',
    personality: 'organized and guarded',
    homeLocationId: LOCATION_IDS.HOME,
    schedule: [
      scheduleEntry(0, 6 * 60 + 30, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(6 * 60 + 30, 8 * 60, LOCATION_IDS.GYM, 'starting the day at the gym'),
      scheduleEntry(8 * 60, 9 * 60, LOCATION_IDS.OFFICE, 'organizing his morning'),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'running project check-ins'),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch'),
      scheduleEntry(13 * 60, 18 * 60, LOCATION_IDS.OFFICE, 'reviewing project plans'),
      scheduleEntry(18 * 60, 19 * 60, LOCATION_IDS.TOWN_SQUARE, 'taking the long way home'),
      scheduleEntry(19 * 60, MINUTES_PER_DAY, LOCATION_IDS.HOME, 'answering final messages'),
    ],
    dialogue: [
      'People remember the headline of a conversation and forget the important qualifiers.',
      'I prefer a schedule because it gives everyone a chance to explain where they were.',
      'Before you decide what happened, make sure you know when it happened.',
    ],
  },
  {
    id: 'tom',
    name: 'Tom Becker',
    age: 26,
    occupation: 'Data analyst',
    personality: 'curious and easily distracted',
    homeLocationId: LOCATION_IDS.HOME,
    schedule: [
      scheduleEntry(0, 7 * 60 + 30, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60 + 30, 8 * 60 + 30, LOCATION_IDS.GYM, 'working out'),
      scheduleEntry(8 * 60 + 30, 9 * 60, LOCATION_IDS.TOWN_SQUARE, 'commuting to work'),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'analyzing reports'),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch'),
      scheduleEntry(13 * 60, 16 * 60 + 30, LOCATION_IDS.OFFICE, 'building a data model'),
      scheduleEntry(16 * 60 + 30, 18 * 60, LOCATION_IDS.PARK, 'clearing his head'),
      scheduleEntry(18 * 60, 20 * 60, LOCATION_IDS.CAFETERIA, 'meeting a friend'),
      scheduleEntry(20 * 60, MINUTES_PER_DAY, LOCATION_IDS.HOME, 'reading at home'),
    ],
    dialogue: [
      'I like facts, but facts are not always the same thing as the truth.',
      'There is a pattern here. I just have not decided what it means yet.',
      'Ask me again later. I am still sorting the details into the right order.',
    ],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findScheduleEntry(schedule, minuteOfDay) {
  return schedule.find((entry) => minuteOfDay >= entry.start && minuteOfDay < entry.end)
    || schedule[schedule.length - 1];
}

class World {
  constructor() {
    this.locations = clone(LOCATIONS);
    this.npcs = new Map(
      NPC_BLUEPRINTS.map((blueprint) => [
        blueprint.id,
        {
          ...clone(blueprint),
          locationId: blueprint.homeLocationId,
          activity: 'sleeping',
          dialogueIndex: 0,
        },
      ]),
    );
  }

  getLocation(locationId) {
    return this.locations.find((location) => location.id === locationId) || null;
  }

  getNpc(npcId) {
    return this.npcs.get(npcId) || null;
  }

  getNpcs() {
    return [...this.npcs.values()];
  }

  getNpcsAt(locationId) {
    return this.getNpcs().filter((npc) => npc.locationId === locationId);
  }

  syncNpcSchedules(minuteOfDay, onMovement) {
    for (const npc of this.npcs.values()) {
      const nextEntry = findScheduleEntry(npc.schedule, minuteOfDay);
      const previousLocationId = npc.locationId;
      const previousActivity = npc.activity;
      npc.locationId = nextEntry.locationId;
      npc.activity = nextEntry.activity;

      if (
        typeof onMovement === 'function'
        && (previousLocationId !== npc.locationId || previousActivity !== npc.activity)
      ) {
        onMovement({
          npc,
          from: this.getLocation(previousLocationId),
          to: this.getLocation(npc.locationId),
          activity: npc.activity,
        });
      }
    }
  }

  getCurrentScheduleEntry(npcId, minuteOfDay) {
    const npc = this.getNpc(npcId);
    return npc ? findScheduleEntry(npc.schedule, minuteOfDay) : null;
  }

  getNextScheduleEntry(npcId, minuteOfDay) {
    const npc = this.getNpc(npcId);
    if (!npc) {
      return null;
    }

    const currentIndex = npc.schedule.findIndex(
      (entry) => minuteOfDay >= entry.start && minuteOfDay < entry.end,
    );
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % npc.schedule.length
      : 0;

    return npc.schedule[nextIndex];
  }

  getPublicLocations() {
    return this.locations.map((location) => ({
      ...location,
      population: this.getNpcsAt(location.id).length,
    }));
  }

  getPublicNpcs() {
    return this.getNpcs().map((npc) => ({
      id: npc.id,
      name: npc.name,
      age: npc.age,
      occupation: npc.occupation,
      personality: npc.personality,
      locationId: npc.locationId,
      activity: npc.activity,
    }));
  }

  getScheduleSnapshot(minuteOfDay) {
    return this.getNpcs().map((npc) => {
      const current = this.getCurrentScheduleEntry(npc.id, minuteOfDay);
      const next = this.getNextScheduleEntry(npc.id, minuteOfDay);

      return {
        npcId: npc.id,
        name: npc.name,
        current: {
          locationId: current.locationId,
          activity: current.activity,
        },
        next: {
          locationId: next.locationId,
          activity: next.activity,
          startsAt: next.start,
        },
      };
    });
  }

  getConversation(npcId, period) {
    const npc = this.getNpc(npcId);
    if (!npc) {
      return null;
    }

    const line = npc.dialogue[npc.dialogueIndex % npc.dialogue.length];
    npc.dialogueIndex += 1;

    return {
      speakerId: npc.id,
      speaker: npc.name,
      line,
      context: `${npc.name} is ${npc.activity}.`,
      period,
    };
  }
}

module.exports = {
  LOCATIONS,
  NPC_BLUEPRINTS,
  World,
  findScheduleEntry,
};
