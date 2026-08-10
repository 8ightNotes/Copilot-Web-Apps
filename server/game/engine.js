const {
  ACTION_DEFINITIONS,
  DEFAULT_START_DAY,
  DEFAULT_START_MINUTE,
  LOCATION_IDS,
  MAX_EVENT_LOG_LENGTH,
  MINUTES_PER_DAY,
} = require('./constants');
const { GameValidationError } = require('./errors');
const { ROLE_IDS, RoleState } = require('./roles');
const { SocialState } = require('./social');
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
  constructor(options = {}) {
    this.seed = options.seed;
    this.roleAssignments = options.roleAssignments;
    this.roleRandom = options.roleRandom;
    this.reset();
  }

  reset(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'seed')) {
      this.seed = options.seed;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'roleAssignments')) {
      this.roleAssignments = options.roleAssignments;
    }

    this.time = new SimulationTime(DEFAULT_START_DAY, DEFAULT_START_MINUTE);
    this.world = new World(DEFAULT_START_MINUTE, { seed: this.seed || Date.now(), npcCount: 4 });
    this.social = new SocialState(this.world);
    this.roles = new RoleState(this.world, {
      seed: this.seed,
      random: this.roleRandom,
      assignments: this.roleAssignments,
      startTime: this.time.toJSON(),
    });
    this.player = {
      ...PLAYER,
      locationId: PLAYER.startLocationId,
    };
    this.events = [];
    this.nextEventId = 1;
    this.turn = 0;
    this.notice = 'A private role has been assigned to you.';

    this.addEvent(
      'day_start',
      `You arrive at the Northstar Office. The morning is already in motion.`,
    );
    this.addEvent(
      'role_assignment',
      'A private role and objective have been assigned to you.',
    );
    this.addEvent(
      'observation',
      this.describeScene(),
    );
  }

  getState() {
    const currentLocation = this.world.getLocation(this.player.locationId);
    const nearbyNpcs = this.world.getNpcsAt(this.player.locationId);
    const social = this.social.getPublicState(this.player.id);
    const playerRole = this.roles.getPlayerView(this.player.id);
    const publicActions = ACTION_DEFINITIONS.map((action) => action.id === 'role_action'
      ? {
        ...action,
        label: playerRole.ability.label,
        description: playerRole.ability.description,
        duration: playerRole.ability.duration,
        requiresTarget: playerRole.ability.requiresTarget,
      }
      : action);
    const publicNpcs = this.world.getPublicNpcs().map((npc) => ({
      ...npc,
      relationship: this.social.getPublicRelationship(this.player.id, npc.id),
      opinion: social.relationships.find((entry) => entry.npcId === npc.id)?.opinion || null,
    }));
    const publicNearbyNpcs = nearbyNpcs.map((npc) => {
      const publicNpc = publicNpcs.find((entry) => entry.id === npc.id);
      return {
        id: publicNpc.id,
        name: publicNpc.name,
        age: publicNpc.age,
        occupation: publicNpc.occupation,
        personality: publicNpc.personality,
        traits: publicNpc.traits,
        socialStyle: publicNpc.socialStyle,
        activity: publicNpc.activity,
        goal: publicNpc.goal,
        relationship: publicNpc.relationship,
        opinion: publicNpc.opinion,
      };
    });

    return {
      title: 'A Text Impostor',
      phase: 5,
      turn: this.turn,
      time: this.time.toJSON(),
      player: {
        id: this.player.id,
        name: this.player.name,
        locationId: this.player.locationId,
        location: currentLocation ? { ...currentLocation } : null,
        role: playerRole,
      },
      locations: this.world.getPublicLocations(),
      npcs: publicNpcs,
      nearbyNpcs: publicNearbyNpcs,
      actions: publicActions,
      eventLog: this.events.slice(-MAX_EVENT_LOG_LENGTH),
      notice: this.notice,
      social,
      outcome: this.roles.getPublicOutcome(),
    };
  }

  performAction(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new GameValidationError('Choose an action before continuing.');
    }

    if (this.roles.getPublicOutcome().status !== 'active') {
      throw new GameValidationError(
        'This role challenge is complete. Reset the simulation to play again.',
        'GAME_OVER',
      );
    }

    const actionId = typeof input.action === 'string' ? input.action.trim() : '';
    if (!ACTION_DEFINITIONS.some((action) => action.id === actionId)) {
      throw new GameValidationError('That action is not available in this simulation.');
    }

    switch (actionId) {
      case 'talk':
        return this.talkTo(input.targetId, input.approach);
      case 'help':
        return this.helpNpc(input.targetId);
      case 'ask_rumor':
        return this.askRumor(input.targetId);
      case 'share_rumor':
        return this.shareRumor(input.targetId, input.rumorId);
      case 'follow':
        return this.follow(input.targetId);
      case 'role_action':
        return this.useRoleAbility(input.targetId);
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

  talkTo(targetId, approach = 'friendly') {
    const npc = this.requireNpcAtCurrentLocation(targetId);
    const now = this.getNow();
    const normalizedApproach = ['friendly', 'curious', 'direct'].includes(approach)
      ? approach
      : 'friendly';
    const conversation = this.social.getConversation(
      npc.id,
      this.time.getPeriod(),
      {
        approach: normalizedApproach,
        now,
        roleContext: this.roles.getNpcBehavior(npc.id),
      },
    );
    const changes = this.social.getTalkChanges(normalizedApproach);
    const reason = `You had a ${normalizedApproach} conversation with ${npc.name}.`;
    const npcRelationship = this.social.adjustRelationship(
      npc.id,
      this.player.id,
      changes,
      reason,
      now,
    );
    this.social.adjustRelationship(
      this.player.id,
      npc.id,
      {
        affinity: changes.affinity,
        trust: changes.trust,
        respect: changes.respect,
        interactions: changes.interactions,
      },
      `You spent time talking with ${npc.name}.`,
      now,
    );
    this.social.adjustReputation(
      {
        kindness: normalizedApproach === 'friendly' ? 2 : 0,
        trustworthiness: normalizedApproach === 'direct' ? 1 : 2,
        discretion: normalizedApproach === 'curious' ? -1 : 1,
        suspicion: normalizedApproach === 'direct' ? 1 : -1,
      },
      `Your conversation with ${npc.name} shaped how people read you.`,
      now,
    );
    this.social.addMemory(
      npc.id,
      this.player.id,
      'conversation',
      `You spoke with ${npc.name} about ${conversation.topic}. ${conversation.line}`,
      2,
      now,
      this.player.id,
    );
    this.social.addMemory(
      this.player.id,
      npc.id,
      'conversation',
      `${npc.name} said: “${conversation.line}”`,
      2,
      now,
      npc.id,
    );
    this.notice = `${conversation.speaker} answered you in a ${conversation.tone} mood.`;
    this.addEvent(
      'conversation',
      `${conversation.speaker}: “${conversation.line}”`,
      {
        speakerId: conversation.speakerId,
        context: conversation.context,
        topic: conversation.topic,
        tone: conversation.tone,
        relationship: this.social.getPublicRelationship(npc.id, this.player.id),
      },
    );
    this.recordRoleProgress('talk', npc.id, now);
    this.advanceTime(15);

    return this.getState();
  }

  helpNpc(targetId) {
    const npc = this.requireNpcAtCurrentLocation(targetId);
    const now = this.getNow();
    const goalResult = this.social.advanceGoal(
      npc.id,
      1,
      `You offered help with ${npc.goal ? npc.goal.label : 'the current work'}.`,
      now,
    );
    const madeProgress = goalResult && goalResult.progressMade > 0;
    const relationshipChanges = madeProgress
      ? { affinity: 4, trust: 4, respect: 3, suspicion: -2, interactions: 1 }
      : { affinity: 1, trust: 1, respect: 1, suspicion: -1, interactions: 1 };
    this.social.adjustRelationship(
      npc.id,
      this.player.id,
      relationshipChanges,
      `You offered useful help to ${npc.name}.`,
      now,
    );
    this.social.adjustRelationship(
      this.player.id,
      npc.id,
      {
        affinity: relationshipChanges.affinity,
        trust: relationshipChanges.trust,
        respect: relationshipChanges.respect,
        interactions: 1,
      },
      `You helped ${npc.name}.`,
      now,
    );
    this.social.adjustReputation(
      { kindness: 6, trustworthiness: 3, suspicion: -2 },
      `People noticed you helping ${npc.name}.`,
      now,
    );

    const goalText = goalResult && goalResult.completed
      ? `${npc.name} has finished the goal they were working toward.`
      : goalResult && madeProgress
        ? `${npc.name} made progress on ${npc.goal?.label || 'the current work'}.`
        : `${npc.name} appreciates the offer, even though they have already made progress on that goal.`;
    const memoryText = `You helped ${npc.name}. ${goalText}`;
    this.social.addMemory(npc.id, this.player.id, 'help', memoryText, 3, now, this.player.id);
    this.social.addMemory(this.player.id, npc.id, 'help', memoryText, 3, now, npc.id);
    this.recordSocialReactions('help', npc.id, now);
    this.recordRoleProgress('help', npc.id, now);

    this.notice = goalText;
    this.addEvent('goal_progress', goalText, {
      npcId: npc.id,
      goal: goalResult ? goalResult.goal : null,
      relationship: this.social.getPublicRelationship(npc.id, this.player.id),
    });
    this.advanceTime(20);
    return this.getState();
  }

  askRumor(targetId) {
    const npc = this.requireNpcAtCurrentLocation(targetId);
    const now = this.getNow();
    const response = this.social.getRumorResponse(npc.id);

    if (response.rumor) {
      this.social.spreadRumor(response.rumor.id, npc.id, this.player.id, now);
      this.social.addMemory(
        this.player.id,
        response.rumor.subjectId,
        'rumor',
        `${npc.name} told you: “${response.rumor.text}”`,
        2,
        now,
        npc.id,
        response.rumor.credibility / 100,
      );
    }
    this.social.adjustRelationship(
      npc.id,
      this.player.id,
      { trust: 1, respect: 2, interactions: 1 },
      `You asked ${npc.name} to share what they had heard.`,
      now,
    );
    this.social.adjustRelationship(
      this.player.id,
      npc.id,
      { trust: 1, respect: 1, interactions: 1 },
      `You asked ${npc.name} about neighborhood rumors.`,
      now,
    );
    this.social.adjustReputation(
      { discretion: -1, suspicion: 1 },
      `You asked ${npc.name} for information.`,
      now,
    );
    this.social.addMemory(
      npc.id,
      this.player.id,
      'conversation',
      `You asked about rumors. ${response.line}`,
      1,
      now,
      this.player.id,
    );

    const text = `${npc.name}: “${response.line}”`;
    this.notice = response.rumor
      ? `You learned something ${response.confidence}.`
      : `${npc.name} had nothing solid to share.`;
    this.addEvent('rumor', text, {
      speakerId: npc.id,
      rumorId: response.rumor ? response.rumor.id : null,
      confidence: response.confidence,
    });
    this.recordRoleProgress('ask_rumor', npc.id, now);
    this.advanceTime(10);
    return this.getState();
  }

  shareRumor(targetId, rumorId) {
    const npc = this.requireNpcAtCurrentLocation(targetId);
    const now = this.getNow();
    const requestedRumorId = typeof rumorId === 'string' ? rumorId.trim() : '';
    const rumor = requestedRumorId
      ? this.social.getRumorForPlayer(requestedRumorId)
      : this.social.getRumorsKnownBy(this.player.id)[0];
    if (!rumor) {
      throw new GameValidationError('You do not know a rumor you can share.');
    }

    this.social.spreadRumor(rumor.id, this.player.id, npc.id, now);
    const credible = rumor.credibility >= 60;
    const relationshipChanges = credible
      ? { trust: 1, respect: 1, suspicion: 1, interactions: 1 }
      : { affinity: -2, trust: -5, respect: -1, suspicion: 5, interactions: 1 };
    this.social.adjustRelationship(
      npc.id,
      this.player.id,
      relationshipChanges,
      `You shared a ${credible ? 'plausible' : 'dubious'} rumor with ${npc.name}.`,
      now,
    );
    this.social.adjustRelationship(
      this.player.id,
      npc.id,
      { respect: credible ? 1 : -1, suspicion: credible ? 0 : 2, interactions: 1 },
      `You repeated a rumor to ${npc.name}.`,
      now,
    );
    this.social.adjustReputation(
      {
        discretion: credible ? -2 : -6,
        trustworthiness: credible ? 0 : -3,
        suspicion: credible ? 1 : 4,
      },
      `You repeated a rumor about ${rumor.subjectName} to ${npc.name}.`,
      now,
    );
    this.social.addMemory(
      npc.id,
      this.player.id,
      'rumor',
      `You told ${npc.name}: “${rumor.text}”`,
      credible ? 2 : 3,
      now,
      this.player.id,
      rumor.credibility / 100,
    );
    this.social.addMemory(
      this.player.id,
      rumor.subjectId,
      'rumor',
      `You told ${npc.name} the rumor: “${rumor.text}”`,
      credible ? 2 : 3,
      now,
      this.player.id,
      rumor.credibility / 100,
    );
    this.recordSocialReactions('share_rumor', npc.id, now);

    const response = credible
      ? `${npc.name} files the story away, looking thoughtful.`
      : `${npc.name} looks unsettled. “That is a dangerous thing to repeat.”`;
    this.notice = credible
      ? `${npc.name} will remember that you shared the story.`
      : `${npc.name} is less sure they can trust your judgment.`;
    this.addEvent('rumor', `${response} You shared: “${rumor.text}”`, {
      rumorId: rumor.id,
      subjectId: rumor.subjectId,
      targetId: npc.id,
      credibility: rumor.credibility,
      relationship: this.social.getPublicRelationship(npc.id, this.player.id),
    });
    this.recordRoleProgress('share_rumor', npc.id, now);
    this.advanceTime(15);
    return this.getState();
  }

  useRoleAbility(targetId) {
    const ability = this.roles.getAbility(this.player.id);
    const roleId = this.roles.getRoleId(this.player.id);
    const now = this.getNow();
    const target = ability.requiresTarget
      ? this.requireNpcAtCurrentLocation(targetId)
      : null;
    let text;

    switch (roleId) {
      case ROLE_IDS.IMPOSTOR:
        if (!target) {
          throw new GameValidationError('This role ability needs someone nearby.', 'TARGET_REQUIRED');
        }
        this.social.adjustRelationship(
          target.id,
          this.player.id,
          { affinity: 2, trust: 2, respect: 1, suspicion: -1, interactions: 1 },
          `You spent ordinary time with ${target.name}.`,
          now,
        );
        this.social.adjustRelationship(
          this.player.id,
          target.id,
          { affinity: 1, trust: 1, respect: 1, interactions: 1 },
          `You blended into the day with ${target.name}.`,
          now,
        );
        this.social.adjustReputation(
          { kindness: 1, discretion: 1, suspicion: -1 },
          `You kept your interaction with ${target.name} unremarkable.`,
          now,
        );
        this.social.addMemory(
          this.player.id,
          target.id,
          'role_action',
          `You spent an ordinary moment with ${target.name}.`,
          1,
          now,
          target.id,
        );
        text = `You spend time with ${target.name}, making the interaction feel like part of an ordinary day.`;
        break;
      case ROLE_IDS.DETECTIVE: {
        const schedule = this.world.getScheduleSnapshot(this.time.minuteOfDay);
        const activePeople = schedule.filter((entry) => entry.current.locationId === this.player.locationId);
        this.social.addMemory(
          this.player.id,
          this.player.id,
          'observation',
          `You studied the day’s movements and noted ${activePeople.length} familiar ${activePeople.length === 1 ? 'face' : 'faces'} nearby.`,
          2,
          now,
          this.player.id,
        );
        text = `You compare the day’s schedules and note ${activePeople.length} familiar ${activePeople.length === 1 ? 'face' : 'faces'} nearby.`;
        break;
      }
      case ROLE_IDS.GUARDIAN:
        if (!target) {
          throw new GameValidationError('This role ability needs someone nearby.', 'TARGET_REQUIRED');
        }
        this.social.adjustRelationship(
          target.id,
          this.player.id,
          { affinity: 2, trust: 3, respect: 2, suspicion: -1, interactions: 1 },
          `You quietly looked out for ${target.name}.`,
          now,
        );
        this.social.adjustRelationship(
          this.player.id,
          target.id,
          { affinity: 1, trust: 2, respect: 2, interactions: 1 },
          `You kept an eye on ${target.name}.`,
          now,
        );
        this.social.adjustReputation(
          { kindness: 3, trustworthiness: 2, suspicion: -1 },
          `People noticed you looking out for ${target.name}.`,
          now,
        );
        this.social.addMemory(
          target.id,
          this.player.id,
          'support',
          `You quietly looked out for ${target.name}.`,
          2,
          now,
          this.player.id,
        );
        text = `You stay attentive to ${target.name} and quietly offer your support.`;
        break;
      case ROLE_IDS.JESTER:
        if (!target) {
          throw new GameValidationError('This role ability needs someone nearby.', 'TARGET_REQUIRED');
        }
        this.social.adjustRelationship(
          target.id,
          this.player.id,
          { affinity: -1, trust: -2, respect: 1, suspicion: 4, interactions: 1 },
          `You said something unexpectedly provocative to ${target.name}.`,
          now,
        );
        this.social.adjustRelationship(
          this.player.id,
          target.id,
          { respect: 1, suspicion: 1, interactions: 1 },
          `You stirred the conversation with ${target.name}.`,
          now,
        );
        this.social.adjustReputation(
          { discretion: -3, suspicion: 3 },
          `You made an intentionally unsettling impression on ${target.name}.`,
          now,
        );
        this.social.addMemory(
          target.id,
          this.player.id,
          'role_action',
          `You said something unexpectedly provocative to ${target.name}.`,
          2,
          now,
          this.player.id,
        );
        text = `You say something provocative to ${target.name} and watch the mood shift.`;
        break;
      case ROLE_IDS.INNOCENT:
        this.social.adjustReputation(
          { kindness: 1, trustworthiness: 1, discretion: 1, suspicion: -1 },
          'You reinforced your ordinary routine.',
          now,
        );
        this.social.addMemory(
          this.player.id,
          this.player.id,
          'role_action',
          'You took a deliberate moment to keep your day grounded.',
          1,
          now,
          this.player.id,
        );
        text = 'You take a deliberate moment to keep your day grounded.';
        break;
      default:
        throw new GameValidationError(
          'Your assigned role does not have an available ability.',
          'ROLE_CONFIGURATION_ERROR',
        );
    }

    const progress = this.roles.recordRoleAbility(this.player.id, target && target.id, now);
    this.addEvent('role_action', text, {
      targetId: target ? target.id : null,
      objective: progress.objective,
    });
    this.recordRoleResult(progress);
    this.notice = progress.completed
      ? 'Your private role objective is complete.'
      : `${ability.label} advanced your private objective.`;
    this.advanceTime(ability.duration);

    return this.getState();
  }

  follow(targetId) {
    const npc = this.requireNpc(targetId);
    const now = this.getNow();
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

    this.social.adjustRelationship(
      npc.id,
      this.player.id,
      { respect: 1, suspicion: 2, interactions: 1 },
      `You followed ${npc.name} through the neighborhood.`,
      now,
    );
    this.social.adjustRelationship(
      this.player.id,
      npc.id,
      { affinity: 1, respect: 1, interactions: 1 },
      `You followed ${npc.name}.`,
      now,
    );
    this.social.adjustReputation(
      { kindness: 1, suspicion: 1 },
      `You followed ${npc.name}.`,
      now,
    );
    this.social.addMemory(
      npc.id,
      this.player.id,
      'movement',
      `You followed ${npc.name} to the ${destination.shortName}.`,
      2,
      now,
      this.player.id,
      0.95,
    );
    this.social.addMemory(
      this.player.id,
      npc.id,
      'movement',
      `You followed ${npc.name} to the ${destination.shortName}.`,
      1,
      now,
      npc.id,
    );
    this.recordSocialReactions('follow', npc.id, now);
    this.recordRoleProgress('follow', npc.id, now);
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
    this.recordRoleProgress('go', null, this.getNow());
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
    this.recordRoleProgress('schedule', null, this.getNow());
    this.advanceTime(5);

    return this.getState();
  }

  wait() {
    this.addEvent(
      'waiting',
      `You wait at the ${this.world.getLocation(this.player.locationId).shortName.toLowerCase()} and watch the day move around you.`,
    );
    this.notice = 'Time passes.';
    this.recordRoleProgress('wait', null, this.getNow());
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

  requireNpcAtCurrentLocation(targetId) {
    const npc = this.requireNpc(targetId);
    if (npc.locationId !== this.player.locationId) {
      throw new GameValidationError(`${npc.name} is not at ${this.world.getLocation(this.player.locationId).shortName}.`);
    }
    return npc;
  }

  recordRoleProgress(actionId, targetId, now) {
    const progress = this.roles.recordPlayerAction(actionId, targetId, now);
    this.recordRoleResult(progress);
  }

  recordRoleResult(progress) {
    if (!progress || progress.progressMade <= 0) {
      return;
    }

    this.addEvent(
      'role_progress',
      progress.completed
        ? 'Your private role objective is complete.'
        : `Your private role objective advances to ${progress.objective.progress}/${progress.objective.threshold}.`,
      {
        objective: progress.objective,
      },
    );

    if (progress.completed) {
      this.addEvent(
        'victory',
        'You fulfilled your private role objective.',
        { outcome: this.roles.getPublicOutcome() },
      );
    }
  }

  getNow() {
    const timestamp = this.time.toJSON();
    return {
      day: timestamp.day,
      minuteOfDay: timestamp.minuteOfDay,
      clock: timestamp.clock,
    };
  }

  recordSocialReactions(actionId, targetId, now) {
    const reactions = this.social.observePlayerAction({
      actionId,
      targetId,
      locationId: this.player.locationId,
      now,
    });
    for (const reaction of reactions) {
      this.addEvent('reaction', reaction.text, { npcId: reaction.npcId });
    }
  }

  advanceTime(minutes) {
    let remaining = minutes;

    while (remaining > 0) {
      const minutesUntilDayEnd = MINUTES_PER_DAY - this.time.minuteOfDay;
      const step = Math.min(remaining, minutesUntilDayEnd);
      const previousDay = this.time.day;
      this.time.advance(step);

      if (this.time.day !== previousDay) {
        this.social.clearDailyEncounterKeys();
        this.addEvent(
          'day_start',
          `A new day begins. Day ${this.time.day} starts at ${minutesToClock(this.time.minuteOfDay)}.`,
        );
      }

      this.world.syncNpcSchedules(this.time.minuteOfDay, ({ npc, from, to, activity, entry }) => {
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

        const now = this.getNow();
        this.roles.recordNpcScheduleChange(npc.id, now);
        if (entry.goalId) {
          const goalResult = this.social.advanceGoal(
            npc.id,
            1,
            `${npc.name} reached a scheduled milestone.`,
            now,
          );
          if (goalResult && goalResult.progressMade > 0) {
            this.addEvent(
              'goal_progress',
              `${npc.name} makes progress toward ${npc.goal.label}.`,
              { npcId: npc.id, goal: goalResult.goal },
            );
          }
        }

        const socialEvent = this.social.observeScheduleChange({ npc, entry, now });
        if (socialEvent) {
          this.addEvent('social_event', socialEvent.text, {
            npcIds: socialEvent.npcIds,
            locationId: socialEvent.locationId,
            rumorCreated: socialEvent.rumorCreated,
          });
        }
      });
      remaining -= step;
    }

    const deadline = this.roles.evaluateDeadline(this.getNow(), {
      reputationScore: this.social.getPublicReputation().score,
    });
    if (deadline) {
      this.addEvent(
        deadline.outcome.status === 'won' ? 'victory' : 'role_failure',
        deadline.outcome.reason,
        { objective: deadline.objective },
      );
      this.notice = deadline.outcome.reason;
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
