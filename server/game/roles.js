const { randomInt } = require('node:crypto');
const { MINUTES_PER_DAY } = require('./constants');
const { formatClock } = require('./time');

const SEEDED_RANDOM_CONSTANT = 0x6d2b79f5;

const ROLE_IDS = Object.freeze({
  INNOCENT: 'innocent',
  IMPOSTOR: 'impostor',
  DETECTIVE: 'detective',
  GUARDIAN: 'guardian',
  JESTER: 'jester',
});

const ROLE_ORDER = Object.freeze([
  ROLE_IDS.INNOCENT,
  ROLE_IDS.IMPOSTOR,
  ROLE_IDS.DETECTIVE,
  ROLE_IDS.GUARDIAN,
  ROLE_IDS.JESTER,
]);

const ROLE_DEFINITIONS = Object.freeze({
  [ROLE_IDS.INNOCENT]: Object.freeze({
    id: ROLE_IDS.INNOCENT,
    name: 'Innocent',
    faction: 'community',
    summary: 'You are part of the community. Keep your footing and build a trustworthy presence.',
    objective: Object.freeze({
      id: 'steady-presence',
      label: 'Keep the community steady',
      description: 'Build a trustworthy presence through ordinary, helpful actions.',
      threshold: 3,
    }),
    victory: 'Complete three ordinary actions that strengthen your place in the community.',
    ability: Object.freeze({
      id: 'stay-grounded',
      label: 'Stay grounded',
      description: 'Take a deliberate moment to reinforce your ordinary routine.',
      duration: 20,
      requiresTarget: false,
    }),
    actionProgress: Object.freeze({
      talk: 1,
      help: 1,
      follow: 1,
      wait: 1,
      role_action: 1,
    }),
    deadline: Object.freeze({
      survive: true,
      successReason: 'You remained a steady part of the community for the full role challenge.',
    }),
    behaviorLine: 'I am trying to keep the day ordinary, even when everyone seems distracted.',
  }),
  [ROLE_IDS.IMPOSTOR]: Object.freeze({
    id: ROLE_IDS.IMPOSTOR,
    name: 'Impostor',
    faction: 'impostor',
    summary: 'You have a private agenda. Blend into the community and make your presence feel routine.',
    objective: Object.freeze({
      id: 'believable-routine',
      label: 'Maintain a believable routine',
      description: 'Take part in the day without giving the community a reason to question you.',
      threshold: 4,
    }),
    victory: 'Complete four social actions while keeping your public reputation above distrust.',
    ability: Object.freeze({
      id: 'blend-in',
      label: 'Blend in',
      description: 'Spend time with someone and make your presence feel unremarkable.',
      duration: 20,
      requiresTarget: true,
    }),
    actionProgress: Object.freeze({
      talk: 1,
      help: 1,
      ask_rumor: 1,
      share_rumor: 1,
      follow: 1,
      role_action: 1,
    }),
    deadline: Object.freeze({
      minimumProgress: 3,
      minimumReputation: 35,
      successReason: 'You maintained a believable routine until the role challenge ended.',
    }),
    behaviorLine: 'Routine matters. People notice when someone suddenly stops showing up.',
  }),
  [ROLE_IDS.DETECTIVE]: Object.freeze({
    id: ROLE_IDS.DETECTIVE,
    name: 'Detective',
    faction: 'community',
    summary: 'You are trained to notice patterns. Gather context without announcing what you suspect.',
    objective: Object.freeze({
      id: 'pattern-notes',
      label: 'Build a reliable picture',
      description: 'Observe schedules and conversations until the neighborhood starts to make sense.',
      threshold: 3,
    }),
    victory: 'Record three careful observations about the living neighborhood.',
    ability: Object.freeze({
      id: 'study-patterns',
      label: 'Study patterns',
      description: 'Review the day’s movements and compare them with what you have heard.',
      duration: 10,
      requiresTarget: false,
    }),
    actionProgress: Object.freeze({
      schedule: 1,
      talk: 1,
      ask_rumor: 1,
      role_action: 1,
    }),
    deadline: Object.freeze({
      minimumProgress: 2,
      successReason: 'You built a useful picture of the neighborhood before the role challenge ended.',
    }),
    behaviorLine: 'I have been keeping track of the details people tend to skip over.',
  }),
  [ROLE_IDS.GUARDIAN]: Object.freeze({
    id: ROLE_IDS.GUARDIAN,
    name: 'Guardian',
    faction: 'community',
    summary: 'You look out for people who need support. Earn trust before you try to guide anyone.',
    objective: Object.freeze({
      id: 'quiet-support',
      label: 'Build a circle of support',
      description: 'Support two different people and become someone they can rely on.',
      threshold: 2,
    }),
    victory: 'Support two different people through helpful or protective actions.',
    ability: Object.freeze({
      id: 'watch-over',
      label: 'Watch over',
      description: 'Stay attentive to someone nearby and quietly offer your support.',
      duration: 15,
      requiresTarget: true,
    }),
    actionProgress: Object.freeze({
      help: 1,
      follow: 1,
      role_action: 1,
    }),
    deadline: Object.freeze({
      minimumProgress: 1,
      successReason: 'You built a circle of support before the role challenge ended.',
    }),
    behaviorLine: 'I try to make sure nobody gets left alone with a problem they cannot solve.',
  }),
  [ROLE_IDS.JESTER]: Object.freeze({
    id: ROLE_IDS.JESTER,
    name: 'Jester',
    faction: 'independent',
    summary: 'You thrive on uncertainty. Make yourself impossible to ignore without revealing why.',
    objective: Object.freeze({
      id: 'unsettle-the-room',
      label: 'Unsettle the room',
      description: 'Create three memorable moments that make people question the easy story.',
      threshold: 3,
    }),
    victory: 'Create three memorable social disruptions before the community settles on a simple story.',
    ability: Object.freeze({
      id: 'stir-the-pot',
      label: 'Stir the pot',
      description: 'Say something provocative and watch how the room rearranges itself.',
      duration: 15,
      requiresTarget: true,
    }),
    actionProgress: Object.freeze({
      talk: 1,
      ask_rumor: 1,
      share_rumor: 1,
      role_action: 1,
    }),
    deadline: Object.freeze({
      minimumProgress: 2,
      successReason: 'You made yourself impossible to ignore before the role challenge ended.',
    }),
    behaviorLine: 'Sometimes the fastest way to learn what people believe is to say something unexpected.',
  }),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function integerOr(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

function makeTimestamp(now = {}) {
  const day = Math.max(1, integerOr(now.day, 1));
  const minuteOfDay = Math.min(
    24 * 60 - 1,
    Math.max(0, integerOr(now.minuteOfDay, 0)),
  );
  return {
    day,
    minuteOfDay,
    clock: now.clock || formatClock(minuteOfDay),
  };
}

function shuffle(values, random = randomInt) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const candidate = random(index + 1);
    const swapIndex = Number.isInteger(candidate) && candidate >= 0 && candidate <= index
      ? candidate
      : 0;
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

// A supplied seed uses a deterministic, non-cryptographic generator for repeatable tests.
// Unseeded games use crypto.randomInt above so role assignment remains unpredictable.
function createSeededRandom(seed) {
  let state = 0;
  const seedText = String(seed);

  for (let index = 0; index < seedText.length; index += 1) {
    state = (Math.imul(state, 31) + seedText.charCodeAt(index)) | 0;
  }
  if (state === 0) {
    state = SEEDED_RANDOM_CONSTANT;
  }

  return (maximum) => {
    state = (Math.imul(state ^ (state >>> 15), 1 | state) + SEEDED_RANDOM_CONSTANT) | 0;
    state = Math.imul(state ^ (state >>> 7), 61 | state) ^ state;
    const normalized = (state ^ (state >>> 14)) >>> 0;
    return maximum > 0 ? normalized % maximum : 0;
  };
}

function createObjective(definition) {
  return {
    id: definition.objective.id,
    label: definition.objective.label,
    description: definition.objective.description,
    progress: 0,
    threshold: definition.objective.threshold,
    status: 'active',
    lastChange: 'No progress has been made yet.',
    lastUpdate: null,
  };
}

function publicObjective(objective) {
  return {
    id: objective.id,
    label: objective.label,
    description: objective.description,
    progress: objective.progress,
    threshold: objective.threshold,
    status: objective.status,
    lastChange: objective.lastChange,
    lastUpdate: objective.lastUpdate,
  };
}

class RoleState {
  constructor(world, options = {}) {
    this.world = world;
    this.random = typeof options.random === 'function'
      ? options.random
      : options.seed !== undefined
        ? createSeededRandom(options.seed)
        : randomInt;
    const configuredRoleIds = Array.isArray(options.roleIds)
      ? options.roleIds.filter((roleId) => ROLE_DEFINITIONS[roleId])
      : [];
    this.roleIds = configuredRoleIds.length > 0
      ? configuredRoleIds
      : ROLE_ORDER;
    this.trialDurationMinutes = Number.isInteger(options.trialDurationMinutes)
      && options.trialDurationMinutes > 0
      ? options.trialDurationMinutes
      : MINUTES_PER_DAY;
    this.trialStart = makeTimestamp(options.startTime);
    this.trialDeadline = this.getTimestampAt(
      this.toAbsoluteMinute(this.trialStart) + this.trialDurationMinutes,
    );
    this.assignments = new Map();
    this.objectives = new Map();
    this.guardianTargets = new Map();
    this.outcome = {
      status: 'active',
      reason: null,
      day: null,
      clock: null,
    };

    this.assignRoles(options.assignments);
  }

  getCharacterIds() {
    return ['player', ...this.world.getNpcs().map((npc) => npc.id)];
  }

  assignRoles(explicitAssignments) {
    const characterIds = this.getCharacterIds();
    const assignments = explicitAssignments && typeof explicitAssignments === 'object'
      ? explicitAssignments
      : null;

    for (const characterId of characterIds) {
      const configuredRole = assignments instanceof Map
        ? assignments.get(characterId)
        : assignments && assignments[characterId];
      if (configuredRole && ROLE_DEFINITIONS[configuredRole]) {
        this.assignments.set(characterId, configuredRole);
      }
    }

    const missingCharacters = characterIds.filter((characterId) => !this.assignments.has(characterId));
    const availableRoles = [
      ...this.roleIds.slice(0, characterIds.length),
      ...Array(Math.max(0, characterIds.length - this.roleIds.length)).fill(ROLE_IDS.INNOCENT),
    ];
    for (const characterId of characterIds) {
      const assignedRole = this.assignments.get(characterId);
      const roleIndex = availableRoles.indexOf(assignedRole);
      if (roleIndex >= 0) {
        availableRoles.splice(roleIndex, 1);
      }
    }
    const rolesToAssign = shuffle(availableRoles, this.random);

    for (const characterId of missingCharacters) {
      const roleId = rolesToAssign.shift() || ROLE_IDS.INNOCENT;
      this.assignments.set(characterId, roleId);
    }

    for (const characterId of characterIds) {
      this.objectives.set(characterId, createObjective(this.getDefinition(characterId)));
    }
  }

  getDefinition(characterId) {
    return ROLE_DEFINITIONS[this.getRoleId(characterId)] || ROLE_DEFINITIONS[ROLE_IDS.INNOCENT];
  }

  getRoleId(characterId) {
    return this.assignments.get(characterId) || null;
  }

  getObjective(characterId) {
    return this.objectives.get(characterId) || null;
  }

  getAbility(characterId) {
    return this.getDefinition(characterId).ability;
  }

  getPlayerView(playerId = 'player') {
    const definition = this.getDefinition(playerId);
    const objective = this.getObjective(playerId);

    return {
      id: definition.id,
      name: definition.name,
      faction: definition.faction,
      summary: definition.summary,
      objective: objective ? publicObjective(objective) : null,
      victory: definition.victory,
      ability: clone(definition.ability),
      trial: {
        durationMinutes: this.trialDurationMinutes,
        deadline: { ...this.trialDeadline },
      },
    };
  }

  getPublicOutcome() {
    const objective = this.getObjective('player');
    return {
      ...this.outcome,
      youWon: this.outcome.status === 'won',
      objectiveStatus: objective ? objective.status : 'active',
    };
  }

  getNpcBehavior(npcId) {
    const definition = this.getDefinition(npcId);
    return {
      conversationLine: definition.behaviorLine,
    };
  }

  recordPlayerAction(actionId, targetId, now) {
    const playerRoleId = this.getRoleId('player');
    const definition = this.getDefinition('player');
    const amount = definition.actionProgress[actionId] || 0;

    if (!amount) {
      return {
        progressMade: 0,
        objective: publicObjective(this.getObjective('player')),
        completed: false,
      };
    }

    if (playerRoleId === ROLE_IDS.GUARDIAN && targetId) {
      const targets = this.guardianTargets.get('player') || new Set();
      if (targets.has(targetId)) {
        return {
          progressMade: 0,
          objective: publicObjective(this.getObjective('player')),
          completed: false,
        };
      }
      targets.add(targetId);
      this.guardianTargets.set('player', targets);
    }

    return this.advanceObjective('player', amount, this.getActionReason(definition, actionId), now);
  }

  recordRoleAbility(characterId = 'player', targetId, now) {
    const definition = this.getDefinition(characterId);
    const reason = `${definition.ability.label} advanced your private objective.`;

    if (definition.id === ROLE_IDS.GUARDIAN && targetId) {
      const targets = this.guardianTargets.get(characterId) || new Set();
      if (targets.has(targetId)) {
        return {
          progressMade: 0,
          objective: publicObjective(this.getObjective(characterId)),
          completed: false,
        };
      }
      targets.add(targetId);
      this.guardianTargets.set(characterId, targets);
    }

    return this.advanceObjective(characterId, 1, reason, now);
  }

  recordNpcScheduleChange(npcId, now) {
    const definition = this.getDefinition(npcId);
    if (definition.id === ROLE_IDS.DETECTIVE || definition.id === ROLE_IDS.GUARDIAN) {
      this.advanceObjective(
        npcId,
        1,
        `${definition.name} followed a personal routine.`,
        now,
      );
    }
  }

  evaluateDeadline(now, context = {}) {
    if (this.outcome.status !== 'active') {
      return null;
    }

    const timestamp = makeTimestamp(now);
    if (this.toAbsoluteMinute(timestamp) < this.toAbsoluteMinute(this.trialDeadline)) {
      return null;
    }

    const characterId = 'player';
    const definition = this.getDefinition(characterId);
    const objective = this.getObjective(characterId);
    const deadline = definition.deadline || {};
    const reputationScore = Number.isFinite(context.reputationScore)
      ? context.reputationScore
      : null;
    const succeeded = Boolean(deadline.survive)
      || (
        objective.progress >= (deadline.minimumProgress ?? objective.threshold)
        && (
          deadline.minimumReputation === undefined
          || (reputationScore !== null && reputationScore >= deadline.minimumReputation)
        )
      );

    if (succeeded) {
      objective.progress = objective.threshold;
      objective.status = 'complete';
      objective.lastChange = deadline.successReason || definition.victory;
      objective.lastUpdate = timestamp;
      this.outcome = {
        status: 'won',
        reason: deadline.successReason || definition.victory,
        day: timestamp.day,
        clock: timestamp.clock,
      };
    } else {
      objective.status = 'failed';
      objective.lastChange = 'The role challenge ended before the objective was complete.';
      objective.lastUpdate = timestamp;
      this.outcome = {
        status: 'lost',
        reason: 'The role challenge ended before you fulfilled your private objective.',
        day: timestamp.day,
        clock: timestamp.clock,
      };
    }

    return {
      outcome: this.getPublicOutcome(),
      objective: publicObjective(objective),
    };
  }

  advanceObjective(characterId, amount, reason, now) {
    const objective = this.getObjective(characterId);
    if (!objective || objective.status === 'complete' || !Number.isInteger(amount) || amount <= 0) {
      return {
        progressMade: 0,
        objective: objective ? publicObjective(objective) : null,
        completed: false,
      };
    }

    const timestamp = makeTimestamp(now);
    const previousProgress = objective.progress;
    objective.progress = Math.min(objective.threshold, objective.progress + amount);
    objective.status = objective.progress >= objective.threshold ? 'complete' : 'active';
    objective.lastChange = reason;
    objective.lastUpdate = timestamp;

    const completed = objective.status === 'complete' && previousProgress < objective.threshold;
    if (completed && characterId === 'player') {
      this.outcome = {
        status: 'won',
        reason: this.getDefinition(characterId).victory,
        day: timestamp.day,
        clock: timestamp.clock,
      };
    }

    return {
      progressMade: objective.progress - previousProgress,
      objective: publicObjective(objective),
      completed,
    };
  }

  getActionReason(definition, actionId) {
    const actionLabel = actionId.replace(/_/g, ' ');
    return `${definition.name} objective advanced through ${actionLabel}.`;
  }

  toAbsoluteMinute(timestamp) {
    return (timestamp.day - 1) * MINUTES_PER_DAY + timestamp.minuteOfDay;
  }

  getTimestampAt(absoluteMinute) {
    return makeTimestamp({
      day: Math.floor(absoluteMinute / MINUTES_PER_DAY) + 1,
      minuteOfDay: absoluteMinute % MINUTES_PER_DAY,
    });
  }
}

module.exports = {
  ROLE_DEFINITIONS,
  ROLE_IDS,
  ROLE_ORDER,
  RoleState,
  createSeededRandom,
  makeTimestamp,
  shuffle,
};
