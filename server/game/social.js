const {
  MAX_MEMORY_COUNT,
  MAX_RELATIONSHIP_HISTORY,
  MAX_REPUTATION_HISTORY,
  MAX_RUMOR_COUNT,
  MAX_RUMOR_HISTORY,
  SOCIAL_VALUE_MAX,
  SOCIAL_VALUE_MIN,
} = require('./constants');
const { formatClock } = require('./time');

const RELATIONSHIP_FIELDS = ['affinity', 'trust', 'respect', 'suspicion'];
const REPUTATION_FIELDS = ['trustworthiness', 'kindness', 'discretion', 'suspicion'];

function clamp(value, minimum = SOCIAL_VALUE_MIN, maximum = SOCIAL_VALUE_MAX) {
  return Math.min(maximum, Math.max(minimum, value));
}

function integerOr(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

function numberOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function makeTimestamp(now = {}) {
  const day = Math.max(1, integerOr(now.day, 1));
  const minuteOfDay = clamp(integerOr(now.minuteOfDay, 0), 0, 24 * 60 - 1);
  return {
    day,
    minuteOfDay,
    clock: now.clock || formatClock(minuteOfDay),
  };
}

function relationshipLabel(relationship) {
  if (relationship.suspicion >= 75) {
    return 'Suspicious';
  }
  if (relationship.trust >= 75 && relationship.affinity >= 70) {
    return 'Close friend';
  }
  if (relationship.trust >= 65 && relationship.affinity >= 55) {
    return 'Friend';
  }
  if (relationship.respect >= 68 && relationship.trust >= 55) {
    return 'Respected';
  }
  if (relationship.affinity >= 55) {
    return 'Friendly';
  }
  if (relationship.trust >= 62) {
    return 'Trusted acquaintance';
  }
  if (relationship.suspicion >= 55) {
    return 'Wary';
  }
  if (relationship.affinity <= 25) {
    return 'Distant';
  }
  return 'Acquaintance';
}

function reputationLabel(reputation) {
  if (reputation.score >= 82) {
    return 'Widely trusted';
  }
  if (reputation.score >= 68) {
    return 'Well regarded';
  }
  if (reputation.score >= 52) {
    return 'Unproven';
  }
  if (reputation.score >= 35) {
    return 'Questioned';
  }
  return 'Distrusted';
}

function credibilityLabel(credibility) {
  if (credibility >= 80) {
    return 'high confidence';
  }
  if (credibility >= 60) {
    return 'plausible';
  }
  if (credibility >= 40) {
    return 'uncertain';
  }
  return 'dubious';
}

function relationshipSummary(relationship) {
  return `${relationship.label}. Trust ${relationship.trust}/100 · Affinity ${relationship.affinity}/100`;
}

function opinionSummary(relationship) {
  if (relationship.suspicion >= 70) {
    return 'They are watching you closely.';
  }
  if (relationship.trust >= 72 && relationship.affinity >= 60) {
    return 'They expect you to act in good faith.';
  }
  if (relationship.trust >= 60) {
    return 'They generally believe what you tell them.';
  }
  if (relationship.affinity <= 30) {
    return 'They keep you at a careful distance.';
  }
  return 'They are still deciding what to make of you.';
}

function relationshipFrom(input = {}) {
  const relationship = {
    affinity: clamp(numberOr(input.affinity, 40)),
    trust: clamp(numberOr(input.trust, 50)),
    respect: clamp(numberOr(input.respect, 45)),
    suspicion: clamp(numberOr(input.suspicion, 10)),
    interactions: Math.max(0, integerOr(input.interactions, 0)),
    lastInteraction: input.lastInteraction || null,
    lastChange: input.lastChange || 'No meaningful interactions yet.',
    history: Array.isArray(input.history) ? input.history.slice(-MAX_RELATIONSHIP_HISTORY) : [],
  };
  relationship.label = relationshipLabel(relationship);
  return relationship;
}

function publicRelationship(relationship) {
  return {
    affinity: relationship.affinity,
    trust: relationship.trust,
    respect: relationship.respect,
    suspicion: relationship.suspicion,
    interactions: relationship.interactions,
    label: relationship.label,
    summary: relationshipSummary(relationship),
    lastInteraction: relationship.lastInteraction,
    lastChange: relationship.lastChange,
  };
}

class SocialState {
  constructor(world) {
    this.world = world;
    this.relationships = new Map();
    this.memories = new Map();
    this.rumors = [];
    this.reputation = {
      trustworthiness: 50,
      kindness: 50,
      discretion: 50,
      suspicion: 15,
      score: 59,
      label: 'Unproven',
      lastChange: 'The neighborhood is still getting to know you.',
      history: [],
    };
    this.nextMemoryId = 1;
    this.nextRumorId = 1;
    this.socialEncounterKeys = new Set();

    this.initialize();
  }

  initialize() {
    this.memories.set('player', []);

    for (const npc of this.world.getNpcs()) {
      this.memories.set(npc.id, []);
      const profile = npc.socialProfile || {};
      const playerRelationship = profile.playerRelationship || {};
      const playerOpinion = profile.playerOpinion || playerRelationship;

      this.relationships.set(
        this.relationshipKey('player', npc.id),
        relationshipFrom(playerRelationship),
      );
      this.relationships.set(
        this.relationshipKey(npc.id, 'player'),
        relationshipFrom(playerOpinion),
      );
    }

    for (const npc of this.world.getNpcs()) {
      for (const other of this.world.getNpcs()) {
        if (npc.id === other.id) {
          continue;
        }

        const configuredRelationship = npc.socialProfile
          && npc.socialProfile.relationships
          && npc.socialProfile.relationships[other.id];
        this.relationships.set(
          this.relationshipKey(npc.id, other.id),
          relationshipFrom(configuredRelationship || {}),
        );
      }
    }

    this.seedRumors();
  }

  relationshipKey(actorId, subjectId) {
    return `${actorId}:${subjectId}`;
  }

  getRelationship(actorId, subjectId) {
    const key = this.relationshipKey(actorId, subjectId);
    if (!this.relationships.has(key)) {
      this.relationships.set(key, relationshipFrom());
    }
    return this.relationships.get(key);
  }

  adjustRelationship(actorId, subjectId, changes = {}, reason, now) {
    const relationship = this.getRelationship(actorId, subjectId);
    const timestamp = makeTimestamp(now);
    const appliedChanges = {};

    for (const field of RELATIONSHIP_FIELDS) {
      if (!Number.isFinite(changes[field]) || changes[field] === 0) {
        continue;
      }

      const previous = relationship[field];
      relationship[field] = clamp(previous + changes[field]);
      const applied = relationship[field] - previous;
      if (applied !== 0) {
        appliedChanges[field] = applied;
      }
    }

    if (Number.isFinite(changes.interactions) && changes.interactions > 0) {
      relationship.interactions += Math.floor(changes.interactions);
      appliedChanges.interactions = Math.floor(changes.interactions);
    }

    if (Object.keys(appliedChanges).length === 0) {
      return relationship;
    }

    relationship.lastInteraction = timestamp;
    relationship.lastChange = reason;
    relationship.label = relationshipLabel(relationship);
    relationship.history.push({
      day: timestamp.day,
      clock: timestamp.clock,
      reason,
      changes: appliedChanges,
    });
    relationship.history = relationship.history.slice(-MAX_RELATIONSHIP_HISTORY);
    return relationship;
  }

  getPublicRelationship(actorId, subjectId) {
    return publicRelationship(this.getRelationship(actorId, subjectId));
  }

  adjustReputation(changes = {}, reason, now) {
    const timestamp = makeTimestamp(now);
    const appliedChanges = {};

    for (const field of REPUTATION_FIELDS) {
      if (!Number.isFinite(changes[field]) || changes[field] === 0) {
        continue;
      }

      const previous = this.reputation[field];
      this.reputation[field] = clamp(previous + changes[field]);
      const applied = this.reputation[field] - previous;
      if (applied !== 0) {
        appliedChanges[field] = applied;
      }
    }

    if (Object.keys(appliedChanges).length === 0) {
      return this.getPublicReputation();
    }

    this.recalculateReputation();
    this.reputation.lastChange = reason;
    this.reputation.history.push({
      day: timestamp.day,
      clock: timestamp.clock,
      reason,
      changes: appliedChanges,
    });
    this.reputation.history = this.reputation.history.slice(-MAX_REPUTATION_HISTORY);
    return this.getPublicReputation();
  }

  recalculateReputation() {
    this.reputation.score = Math.round(
      (
        this.reputation.trustworthiness
        + this.reputation.kindness
        + this.reputation.discretion
        + (SOCIAL_VALUE_MAX - this.reputation.suspicion)
      ) / 4,
    );
    this.reputation.label = reputationLabel(this.reputation);
  }

  getPublicReputation() {
    return {
      trustworthiness: this.reputation.trustworthiness,
      kindness: this.reputation.kindness,
      discretion: this.reputation.discretion,
      suspicion: this.reputation.suspicion,
      score: this.reputation.score,
      label: this.reputation.label,
      lastChange: this.reputation.lastChange,
    };
  }

  getCharacterName(characterId) {
    if (characterId === 'player') {
      return 'You';
    }
    const npc = this.world.getNpc(characterId);
    return npc ? npc.name : 'Someone';
  }

  addMemory(
    observerId,
    subjectId,
    type,
    text,
    importance = 2,
    now,
    sourceId = null,
    confidence = 0.9,
  ) {
    const timestamp = makeTimestamp(now);
    const memory = {
      id: `memory-${this.nextMemoryId}`,
      observerId,
      subjectId,
      subjectName: this.getCharacterName(subjectId),
      type,
      text,
      importance: clamp(Math.round(numberOr(importance, 2)), 1, 5),
      confidence: Number(clamp(numberOr(confidence, 0.9), 0, 1).toFixed(2)),
      day: timestamp.day,
      minuteOfDay: timestamp.minuteOfDay,
      clock: timestamp.clock,
      sourceId,
      sourceName: sourceId ? this.getCharacterName(sourceId) : null,
    };
    this.nextMemoryId += 1;

    const observerMemories = this.memories.get(observerId) || [];
    observerMemories.push(memory);
    this.memories.set(observerId, observerMemories.slice(-MAX_MEMORY_COUNT));
    return memory;
  }

  getMemories(observerId) {
    return this.memories.get(observerId) || [];
  }

  getPublicMemories(observerId, limit = 12) {
    return this.getMemories(observerId)
      .slice(-limit)
      .reverse()
      .map((memory) => ({
        id: memory.id,
        subjectId: memory.subjectId,
        subjectName: memory.subjectName,
        type: memory.type,
        text: memory.text,
        importance: memory.importance,
        confidence: memory.confidence,
        day: memory.day,
        clock: memory.clock,
        sourceName: memory.sourceName,
      }));
  }

  addRumor({
    subjectId,
    text,
    sourceId = 'player',
    credibility = 50,
    knownBy = [],
    now,
  }) {
    const timestamp = makeTimestamp(now);
    const normalizedText = String(text || '').trim();
    if (!subjectId || !normalizedText) {
      return null;
    }

    const existing = this.rumors.find(
      (rumor) => rumor.subjectId === subjectId && rumor.text === normalizedText,
    );
    if (existing) {
      for (const characterId of knownBy) {
        existing.knownBy.add(characterId);
      }
      existing.knownBy.add(sourceId);
      return existing;
    }

    const rumor = {
      id: `rumor-${this.nextRumorId}`,
      subjectId,
      subjectName: this.getCharacterName(subjectId),
      text: normalizedText,
      sourceId,
      sourceName: this.getCharacterName(sourceId),
      credibility: clamp(Math.round(numberOr(credibility, 50))),
      knownBy: new Set([...knownBy, sourceId]),
      spreadCount: 0,
      firstHeard: timestamp,
      lastSpread: null,
      history: [],
    };
    this.nextRumorId += 1;
    this.rumors.push(rumor);
    this.rumors = this.rumors.slice(-MAX_RUMOR_COUNT);
    return rumor;
  }

  seedRumors() {
    const timestamp = { day: 1, minuteOfDay: 8 * 60 };
    this.addRumor({
      subjectId: 'sarah',
      text: 'Sarah has been staying late to revise a proposal no one else has seen.',
      sourceId: 'mike',
      credibility: 72,
      knownBy: ['player', 'james'],
      now: timestamp,
    });
    this.addRumor({
      subjectId: 'mike',
      text: 'Mike has been taking the long route through Town Square after work.',
      sourceId: 'sarah',
      credibility: 61,
      knownBy: ['player'],
      now: timestamp,
    });
    this.addRumor({
      subjectId: 'james',
      text: 'James keeps a second version of the project plan in his desk.',
      sourceId: 'tom',
      credibility: 46,
      knownBy: ['tom'],
      now: timestamp,
    });
  }

  getRumorsKnownBy(characterId) {
    return this.rumors
      .filter((rumor) => rumor.knownBy.has(characterId))
      .sort((left, right) => {
        const leftTime = left.lastSpread || left.firstHeard;
        const rightTime = right.lastSpread || right.firstHeard;
        return (rightTime.day * 24 * 60 + rightTime.minuteOfDay)
          - (leftTime.day * 24 * 60 + leftTime.minuteOfDay);
      });
  }

  getRumorForPlayer(rumorId) {
    return this.getRumorsKnownBy('player').find((rumor) => rumor.id === rumorId) || null;
  }

  spreadRumor(rumorId, fromId, toId, now) {
    const rumor = this.rumors.find((entry) => entry.id === rumorId);
    if (!rumor || !rumor.knownBy.has(fromId)) {
      return null;
    }

    const timestamp = makeTimestamp(now);
    const alreadyKnown = rumor.knownBy.has(toId);
    rumor.knownBy.add(toId);
    if (!alreadyKnown) {
      rumor.spreadCount += 1;
      rumor.lastSpread = timestamp;
      rumor.history.push({
        fromId,
        toId,
        day: timestamp.day,
        clock: timestamp.clock,
      });
      rumor.history = rumor.history.slice(-MAX_RUMOR_HISTORY);
    }
    return rumor;
  }

  getPublicRumors(characterId = 'player', limit = 12) {
    return this.getRumorsKnownBy(characterId)
      .slice(0, limit)
      .map((rumor) => ({
        id: rumor.id,
        subjectId: rumor.subjectId,
        subjectName: rumor.subjectName,
        text: rumor.text,
        sourceName: rumor.sourceName,
        credibility: rumor.credibility,
        credibilityLabel: credibilityLabel(rumor.credibility),
        spreadCount: rumor.spreadCount,
        firstHeard: rumor.firstHeard,
        lastSpread: rumor.lastSpread,
      }));
  }

  getRumorResponse(npcId) {
    const npc = this.world.getNpc(npcId);
    if (!npc) {
      return null;
    }

    const rumor = this.getRumorsKnownBy(npcId)
      .find((entry) => entry.subjectId !== npcId);
    if (!rumor) {
      return {
        rumor: null,
        line: 'I have heard fragments, but nothing I would repeat as fact.',
        confidence: 'careful',
      };
    }

    const qualifier = rumor.credibility >= 70
      ? 'It sounds plausible.'
      : rumor.credibility >= 50
        ? 'I would not stake much on it.'
        : 'I would treat it as noise.';
    return {
      rumor,
      line: `The version I heard was this: “${rumor.text}” ${qualifier}`,
      confidence: credibilityLabel(rumor.credibility),
    };
  }

  getTalkChanges(approach = 'friendly') {
    switch (approach) {
      case 'curious':
        return {
          affinity: 1,
          trust: 1,
          respect: 3,
          suspicion: 1,
          interactions: 1,
        };
      case 'direct':
        return {
          affinity: -1,
          trust: 1,
          respect: 2,
          suspicion: 2,
          interactions: 1,
        };
      case 'friendly':
      default:
        return {
          affinity: 3,
          trust: 2,
          respect: 1,
          suspicion: -1,
          interactions: 1,
        };
    }
  }

  getConversation(npcId, period, { approach = 'friendly', now } = {}) {
    const npc = this.world.getNpc(npcId);
    if (!npc) {
      return null;
    }

    const relationship = this.getRelationship(npcId, 'player');
    const memories = this.getMemories(npcId)
      .filter((memory) => memory.subjectId === 'player')
      .slice(-3);
    const knownRumors = this.getRumorsKnownBy(npcId)
      .filter((rumor) => rumor.subjectId !== npcId);
    const currentEntry = this.world.getCurrentScheduleEntry(
      npcId,
      now && now.minuteOfDay,
    );
    const goal = npc.goal;
    const lines = [];

    if (relationship.suspicion >= 70) {
      lines.push('I am willing to talk, but I would feel better if you told me what you are really asking.');
    } else if (relationship.trust >= 72) {
      lines.push('I knew I could talk to you about this. Things have been moving faster than people realize.');
    }

    const recentHelp = memories.find((memory) => memory.type === 'help');
    if (recentHelp) {
      lines.push(`I have not forgotten your help. ${goal ? `I am still trying to ${goal.description.toLowerCase()}` : 'It mattered.'}`);
    }

    if (goal && goal.status === 'active' && relationship.trust >= 50) {
      lines.push(`I am trying to ${goal.description.toLowerCase()} before the day gets away from me.`);
    }

    if (knownRumors.length > 0 && relationship.affinity >= 45) {
      lines.push(`People keep talking around the edges of something. I heard that ${knownRumors[0].text.toLowerCase()}`);
    }

    if (currentEntry && currentEntry.social && currentEntry.companions && currentEntry.companions.length > 0) {
      const companionNames = currentEntry.companions
        .map((id) => this.world.getNpc(id))
        .filter(Boolean)
        .map((companion) => companion.name)
        .join(' and ');
      if (companionNames) {
        lines.push(`I am meant to be catching up with ${companionNames} soon, although plans keep changing.`);
      }
    }

    lines.push(...(npc.dialogue || []));
    const offset = (npc.dialogueIndex || 0) + relationship.interactions;
    const line = lines[offset % lines.length] || 'It is a busy day. What did you want to discuss?';
    npc.dialogueIndex = (npc.dialogueIndex || 0) + 1;

    const approachLabel = approach === 'curious'
      ? 'your questions'
      : approach === 'direct'
        ? 'your directness'
        : 'the easy conversation';

    return {
      speakerId: npc.id,
      speaker: npc.name,
      line,
      context: `${npc.name} is ${npc.activity}. They respond to ${approachLabel}.`,
      period,
      topic: goal && goal.status === 'active' ? goal.label : 'the neighborhood',
      tone: relationship.suspicion >= 70 ? 'guarded' : relationship.trust >= 72 ? 'open' : 'measured',
    };
  }

  advanceGoal(npcId, amount, reason, now) {
    const npc = this.world.getNpc(npcId);
    if (!npc || !npc.goal || npc.goal.status === 'complete') {
      return null;
    }

    const previousProgress = npc.goal.progress;
    npc.goal.progress = Math.min(
      npc.goal.threshold,
      npc.goal.progress + Math.max(0, Math.floor(numberOr(amount, 0))),
    );
    if (npc.goal.progress >= npc.goal.threshold) {
      npc.goal.status = 'complete';
    }
    npc.goal.lastUpdate = makeTimestamp(now);
    npc.goal.lastChange = reason;

    return {
      goal: { ...npc.goal },
      previousProgress,
      progressMade: npc.goal.progress - previousProgress,
      completed: npc.goal.status === 'complete' && previousProgress < npc.goal.threshold,
    };
  }

  observeScheduleChange({ npc, entry, now }) {
    if (!entry || !entry.social || !Array.isArray(entry.companions)) {
      return null;
    }

    const companions = entry.companions
      .map((id) => this.world.getNpc(id))
      .filter((companion) => companion && companion.locationId === npc.locationId);
    const companion = companions
      .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!companion) {
      return null;
    }

    const timestamp = makeTimestamp(now);
    const pair = [npc.id, companion.id].sort();
    const encounterKey = [
      timestamp.day,
      timestamp.minuteOfDay,
      ...pair,
      entry.start,
    ].join(':');
    if (this.socialEncounterKeys.has(encounterKey)) {
      return null;
    }
    this.socialEncounterKeys.add(encounterKey);

    const meetingText = entry.socialText
      || `${npc.name} catches up with ${companion.name} while ${entry.activity}.`;
    this.addMemory(
      npc.id,
      companion.id,
      'social_encounter',
      meetingText,
      2,
      timestamp,
      companion.id,
    );
    this.addMemory(
      companion.id,
      npc.id,
      'social_encounter',
      meetingText,
      2,
      timestamp,
      npc.id,
    );
    this.adjustRelationship(
      npc.id,
      companion.id,
      { affinity: 1, trust: 1, interactions: 1 },
      'A planned social meeting went well.',
      timestamp,
    );
    this.adjustRelationship(
      companion.id,
      npc.id,
      { affinity: 1, trust: 1, interactions: 1 },
      'A planned social meeting went well.',
      timestamp,
    );

    if (entry.rumorText) {
      this.addRumor({
        subjectId: entry.rumorSubjectId || npc.id,
        text: entry.rumorText,
        sourceId: npc.id,
        credibility: entry.rumorCredibility || 55,
        knownBy: [npc.id, companion.id],
        now: timestamp,
      });
    }

    return {
      text: meetingText,
      npcIds: [npc.id, companion.id],
      locationId: npc.locationId,
      rumorCreated: Boolean(entry.rumorText),
    };
  }

  observePlayerAction({ actionId, targetId, locationId, now }) {
    const witnesses = this.world
      .getNpcsAt(locationId)
      .filter((npc) => npc.id !== targetId);
    const reactions = [];

    for (const witness of witnesses) {
      const relationship = this.getRelationship(witness.id, 'player');
      let changes;
      let text;

      if (actionId === 'help') {
        changes = { trust: 1, respect: 2 };
        text = relationship.trust >= 60
          ? `${witness.name} notices that you made time to help.`
          : `${witness.name} watches you help, cautiously impressed.`;
      } else if (actionId === 'share_rumor') {
        changes = { trust: -1, suspicion: 2 };
        text = `${witness.name} hears that you passed a story along.`;
      } else if (actionId === 'follow') {
        changes = { suspicion: 1 };
        text = `${witness.name} notices you following ${this.getCharacterName(targetId)}.`;
      } else {
        continue;
      }

      this.adjustRelationship(
        witness.id,
        'player',
        changes,
        `They witnessed your ${actionId.replace('_', ' ')}.`,
        now,
      );
      this.addMemory(
        witness.id,
        'player',
        'reaction',
        text,
        1,
        now,
        'player',
        0.8,
      );
      reactions.push({
        npcId: witness.id,
        text,
      });
    }

    return reactions;
  }

  getPublicState(playerId = 'player') {
    const relationships = this.world.getNpcs().map((npc) => {
      const playerView = this.getRelationship(playerId, npc.id);
      const npcView = this.getRelationship(npc.id, playerId);
      return {
        npcId: npc.id,
        name: npc.name,
        playerView: publicRelationship(playerView),
        npcView: publicRelationship(npcView),
        opinion: {
          label: npcView.label,
          summary: opinionSummary(npcView),
          trust: npcView.trust,
          suspicion: npcView.suspicion,
        },
      };
    });

    return {
      reputation: this.getPublicReputation(),
      relationships,
      memories: this.getPublicMemories(playerId),
      rumors: this.getPublicRumors(playerId),
    };
  }
}

module.exports = {
  SocialState,
  credibilityLabel,
  opinionSummary,
  relationshipLabel,
  reputationLabel,
};
