const { LOCATION_IDS, MINUTES_PER_DAY } = require('./constants');
const { generateNpcs } = require('./npc-generator');

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

function scheduleEntry(start, end, locationId, activity, details = {}) {
  return {
    start,
    end,
    locationId,
    activity,
    social: false,
    companions: [],
    ...details,
  };
}

const NPC_BLUEPRINTS = [
  {
    id: 'sarah',
    name: 'Sarah Chen',
    age: 29,
    occupation: 'Product designer',
    personality: 'observant and warm',
    traits: ['observant', 'warm', 'deliberate'],
    values: ['clarity', 'craft', 'reciprocity'],
    socialStyle: 'asks careful questions before she trusts someone',
    homeLocationId: LOCATION_IDS.HOME,
    goal: {
      id: 'sarah-proposal',
      label: 'Finish the hidden proposal',
      description: 'finish a proposal before the next planning meeting',
      progress: 0,
      threshold: 3,
      status: 'active',
    },
    socialProfile: {
      playerRelationship: { affinity: 48, trust: 52, respect: 58, suspicion: 8 },
      playerOpinion: { affinity: 46, trust: 49, respect: 58, suspicion: 8 },
      relationships: {
        mike: { affinity: 62, trust: 60, respect: 48, suspicion: 8 },
        james: { affinity: 42, trust: 58, respect: 65, suspicion: 12 },
        tom: { affinity: 50, trust: 52, respect: 45, suspicion: 10 },
      },
    },
    schedule: [
      scheduleEntry(0, 7 * 60 + 45, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60 + 45, 9 * 60, LOCATION_IDS.OFFICE, 'settling in at her desk', {
        goalId: 'sarah-proposal',
      }),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'working at her desk', {
        goalId: 'sarah-proposal',
      }),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch', {
        social: true,
        companions: ['james', 'mike', 'tom'],
        socialText: 'At lunch, Sarah compares notes with Mike and Tom without revealing the whole proposal.',
        rumorText: 'Sarah is testing a proposal by asking everyone the same question.',
        rumorCredibility: 58,
      }),
      scheduleEntry(13 * 60, 17 * 60, LOCATION_IDS.OFFICE, 'sketching product ideas', {
        goalId: 'sarah-proposal',
      }),
      scheduleEntry(17 * 60, 18 * 60, LOCATION_IDS.PARK, 'walking by the river'),
      scheduleEntry(18 * 60, 21 * 60, LOCATION_IDS.CAFETERIA, 'reading over dinner', {
        social: true,
        companions: ['tom'],
      }),
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
    traits: ['sociable', 'practical', 'protective'],
    values: ['reliability', 'community', 'competence'],
    socialStyle: 'makes friends quickly but notices who keeps their word',
    homeLocationId: LOCATION_IDS.HOME,
    goal: {
      id: 'mike-office',
      label: 'Keep the office running',
      description: 'keep the office running without another emergency',
      progress: 0,
      threshold: 3,
      status: 'active',
    },
    socialProfile: {
      playerRelationship: { affinity: 55, trust: 45, respect: 53, suspicion: 15 },
      playerOpinion: { affinity: 58, trust: 48, respect: 50, suspicion: 12 },
      relationships: {
        sarah: { affinity: 66, trust: 62, respect: 45, suspicion: 6 },
        james: { affinity: 38, trust: 48, respect: 59, suspicion: 18 },
        tom: { affinity: 72, trust: 67, respect: 42, suspicion: 5 },
      },
    },
    schedule: [
      scheduleEntry(0, 7 * 60, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60, 8 * 60 + 30, LOCATION_IDS.CAFETERIA, 'grabbing breakfast'),
      scheduleEntry(8 * 60 + 30, 9 * 60, LOCATION_IDS.TOWN_SQUARE, 'walking to work'),
      scheduleEntry(9 * 60, 11 * 60, LOCATION_IDS.OFFICE, 'checking the building', {
        goalId: 'mike-office',
      }),
      scheduleEntry(11 * 60, 12 * 60, LOCATION_IDS.GYM, 'fitting in a workout'),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch', {
        social: true,
        companions: ['james', 'sarah', 'tom'],
      }),
      scheduleEntry(13 * 60, 16 * 60, LOCATION_IDS.OFFICE, 'handling maintenance requests', {
        goalId: 'mike-office',
      }),
      scheduleEntry(16 * 60, 17 * 60, LOCATION_IDS.TOWN_SQUARE, 'running errands'),
      scheduleEntry(17 * 60, 19 * 60, LOCATION_IDS.PARK, 'meeting friends', {
        social: true,
        companions: ['tom'],
        socialText: 'Mike meets Tom by the river and trades practical advice about the office.',
        rumorText: 'Mike knows which office problem everyone is quietly trying to avoid.',
        rumorCredibility: 64,
      }),
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
    traits: ['organized', 'guarded', 'accountable'],
    values: ['order', 'fairness', 'preparedness'],
    socialStyle: 'keeps conversations focused until someone proves reliable',
    homeLocationId: LOCATION_IDS.HOME,
    goal: {
      id: 'james-alignment',
      label: 'Align the project team',
      description: 'get the project team aligned before the afternoon review',
      progress: 0,
      threshold: 3,
      status: 'active',
    },
    socialProfile: {
      playerRelationship: { affinity: 36, trust: 44, respect: 60, suspicion: 20 },
      playerOpinion: { affinity: 32, trust: 39, respect: 63, suspicion: 23 },
      relationships: {
        sarah: { affinity: 42, trust: 58, respect: 66, suspicion: 12 },
        mike: { affinity: 37, trust: 47, respect: 60, suspicion: 18 },
        tom: { affinity: 31, trust: 45, respect: 56, suspicion: 22 },
      },
    },
    schedule: [
      scheduleEntry(0, 6 * 60 + 30, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(6 * 60 + 30, 8 * 60, LOCATION_IDS.GYM, 'starting the day at the gym'),
      scheduleEntry(8 * 60, 9 * 60, LOCATION_IDS.OFFICE, 'organizing his morning', {
        goalId: 'james-alignment',
      }),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'running project check-ins', {
        goalId: 'james-alignment',
        social: true,
        companions: ['sarah', 'mike', 'tom'],
      }),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch', {
        social: true,
        companions: ['sarah', 'mike', 'tom'],
      }),
      scheduleEntry(13 * 60, 18 * 60, LOCATION_IDS.OFFICE, 'reviewing project plans', {
        goalId: 'james-alignment',
      }),
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
    traits: ['curious', 'restless', 'analytical'],
    values: ['truth', 'novelty', 'patterns'],
    socialStyle: 'follows interesting questions wherever they lead',
    homeLocationId: LOCATION_IDS.HOME,
    goal: {
      id: 'tom-pattern',
      label: 'Find the pattern',
      description: 'find a pattern in the reports before anyone asks for a presentation',
      progress: 0,
      threshold: 3,
      status: 'active',
    },
    socialProfile: {
      playerRelationship: { affinity: 52, trust: 50, respect: 47, suspicion: 10 },
      playerOpinion: { affinity: 55, trust: 54, respect: 45, suspicion: 9 },
      relationships: {
        sarah: { affinity: 49, trust: 53, respect: 46, suspicion: 10 },
        mike: { affinity: 72, trust: 67, respect: 42, suspicion: 5 },
        james: { affinity: 32, trust: 46, respect: 57, suspicion: 22 },
      },
    },
    schedule: [
      scheduleEntry(0, 7 * 60 + 30, LOCATION_IDS.HOME, 'sleeping'),
      scheduleEntry(7 * 60 + 30, 8 * 60 + 30, LOCATION_IDS.GYM, 'working out'),
      scheduleEntry(8 * 60 + 30, 9 * 60, LOCATION_IDS.TOWN_SQUARE, 'commuting to work'),
      scheduleEntry(9 * 60, 12 * 60, LOCATION_IDS.OFFICE, 'analyzing reports', {
        goalId: 'tom-pattern',
      }),
      scheduleEntry(12 * 60, 13 * 60, LOCATION_IDS.CAFETERIA, 'having lunch', {
        social: true,
        companions: ['sarah', 'mike', 'james'],
      }),
      scheduleEntry(13 * 60, 16 * 60 + 30, LOCATION_IDS.OFFICE, 'building a data model', {
        goalId: 'tom-pattern',
      }),
      scheduleEntry(16 * 60 + 30, 18 * 60, LOCATION_IDS.PARK, 'clearing his head', {
        social: true,
        companions: ['mike'],
        socialText: 'Tom and Mike compare notes by the river, each pretending not to be curious about the other’s day.',
        rumorText: 'Tom has found a pattern in the reports but is waiting for someone to ask the right question.',
        rumorCredibility: 69,
      }),
      scheduleEntry(18 * 60, 20 * 60, LOCATION_IDS.CAFETERIA, 'meeting a friend', {
        social: true,
        companions: ['sarah'],
      }),
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
  const currentMinute = Number.isInteger(minuteOfDay) ? minuteOfDay : 0;
  return schedule.find((entry) => currentMinute >= entry.start && currentMinute < entry.end)
    || schedule[schedule.length - 1];
}

class World {
  constructor(initialMinuteOfDay = 0, options = {}) {
    this.locations = clone(LOCATIONS);
    const npcCount = options.npcCount || 4;
    const seed = options.seed || Date.now();
    const blueprints = options.blueprints || generateNpcs(npcCount, seed);
    this.npcs = new Map(
      blueprints.map((blueprint) => {
        const initialEntry = findScheduleEntry(blueprint.schedule, initialMinuteOfDay);
        return [
          blueprint.id,
          {
            ...clone(blueprint),
            locationId: initialEntry.locationId,
            activity: initialEntry.activity,
            dialogueIndex: 0,
          },
        ];
      }),
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
    const movements = [];

    for (const npc of this.npcs.values()) {
      const nextEntry = findScheduleEntry(npc.schedule, minuteOfDay);
      const previousLocationId = npc.locationId;
      const previousActivity = npc.activity;
      npc.locationId = nextEntry.locationId;
      npc.activity = nextEntry.activity;

      if (
        (previousLocationId !== npc.locationId || previousActivity !== npc.activity)
      ) {
        movements.push({
          npc,
          from: this.getLocation(previousLocationId),
          to: this.getLocation(npc.locationId),
          activity: npc.activity,
          entry: nextEntry,
        });
      }
    }

    if (typeof onMovement === 'function') {
      for (const movement of movements) {
        onMovement(movement);
      }
    }

    return movements;
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
      traits: [...npc.traits],
      values: [...npc.values],
      socialStyle: npc.socialStyle,
      locationId: npc.locationId,
      activity: npc.activity,
      goal: npc.goal
        ? {
          id: npc.goal.id,
          label: npc.goal.label,
          description: npc.goal.description,
          progress: npc.goal.progress,
          threshold: npc.goal.threshold,
          status: npc.goal.status,
          lastChange: npc.goal.lastChange || null,
        }
        : null,
    }));
  }

  getPublicGoal(npcId) {
    const npc = this.getNpc(npcId);
    if (!npc || !npc.goal) {
      return null;
    }

    return {
      id: npc.goal.id,
      label: npc.goal.label,
      description: npc.goal.description,
      progress: npc.goal.progress,
      threshold: npc.goal.threshold,
      status: npc.goal.status,
      lastChange: npc.goal.lastChange || null,
    };
  }

  getPublicScheduleEntry(entry) {
    if (!entry) {
      return null;
    }

    return {
      start: entry.start,
      end: entry.end,
      locationId: entry.locationId,
      activity: entry.activity,
      social: Boolean(entry.social),
      companions: [...(entry.companions || [])],
      goalId: entry.goalId || null,
    };
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
          social: Boolean(current.social),
          companions: [...(current.companions || [])],
          goalId: current.goalId || null,
        },
        next: {
          locationId: next.locationId,
          activity: next.activity,
          startsAt: next.start,
          endsAt: next.end,
          social: Boolean(next.social),
          companions: [...(next.companions || [])],
          goalId: next.goalId || null,
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
