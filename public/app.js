const app = {
  state: null,
  busy: false,
  message: '',
};

const typeLabels = {
  conversation: 'Conversation',
  day_start: 'New day',
  movement: 'You moved',
  npc_movement: 'World movement',
  observation: 'Observation',
  schedule: 'Schedule',
  goal_progress: 'Goal progress',
  role_assignment: 'Private role',
  role_progress: 'Role objective',
  role_action: 'Role ability',
  victory: 'Victory',
  reaction: 'Social reaction',
  rumor: 'Rumor',
  social_event: 'Social event',
  waiting: 'Waiting',
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#action-groups').addEventListener('click', handleActionClick);
  document.querySelector('#reset-button').addEventListener('click', resetGame);
  loadGame();
});

async function loadGame() {
  try {
    const response = await fetch('/api/game');
    const payload = await parseResponse(response);
    app.state = payload;
    app.message = payload.notice;
    render();
  } catch (error) {
    showFatalError(error.message);
  }
}

async function handleActionClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button || app.busy) {
    return;
  }

  const payload = { action: button.dataset.action };
  if (button.dataset.targetId) {
    payload.targetId = button.dataset.targetId;
  }
  if (button.dataset.locationId) {
    payload.locationId = button.dataset.locationId;
  }
  if (button.dataset.rumorId) {
    payload.rumorId = button.dataset.rumorId;
  }
  if (button.dataset.approach) {
    payload.approach = button.dataset.approach;
  }

  await submitAction(payload);
}

async function submitAction(payload) {
  setBusy(true);

  try {
    const response = await fetch('/api/game/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await parseResponse(response);

    if (!response.ok) {
      if (result.state) {
        app.state = result.state;
      }
      app.message = result.error || 'That action could not be completed.';
      return;
    }

    app.state = result;
    app.message = result.notice;
  } catch (error) {
    app.message = error.message;
  } finally {
    setBusy(false);
    render();
  }
}

async function resetGame() {
  if (app.busy || !window.confirm('Start over at the beginning of Day 1?')) {
    return;
  }

  setBusy(true);
  try {
    const response = await fetch('/api/game/reset', { method: 'POST' });
    app.state = await parseResponse(response);
    app.message = 'A fresh simulation is ready.';
  } catch (error) {
    app.message = error.message;
  } finally {
    setBusy(false);
    render();
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && !payload.error) {
    throw new Error(`The server returned ${response.status}.`);
  }
  return payload;
}

function setBusy(value) {
  app.busy = value;
  document.querySelector('#action-groups').setAttribute('aria-busy', String(value));
  document.querySelector('#reset-button').disabled = value;
  if (app.state && value) {
    renderActions();
  }
}

function render() {
  if (!app.state) {
    return;
  }

  const { time, player } = app.state;
  document.querySelector('#time-label').textContent = time.label;
  document.querySelector('#location-label').textContent = player.location.shortName;
  document.querySelector('#turn-label').textContent = String(app.state.turn);
  document.querySelector('#period-label').textContent = time.period;
  document.querySelector('#reputation-label').textContent = `${app.state.social.reputation.score} · ${app.state.social.reputation.label}`;
  document.querySelector('#scene-heading').textContent = player.location.name;
  document.querySelector('#scene-description').textContent = describeScene();
  document.querySelector('#nearby-count').textContent = String(app.state.nearbyNpcs.length);
  document.querySelector('#action-feedback').textContent = app.message || app.state.notice;

  renderNearbyPeople();
  renderNeighborhoodMap();
  renderRolePanel();
  renderActions();
  renderSocialDashboard();
  renderEventLog();
}

function describeScene() {
  const location = app.state.player.location;
  const nearby = app.state.nearbyNpcs;
  if (nearby.length === 0) {
    return `${location.description} For now, you have the place mostly to yourself.`;
  }

  const people = nearby.map((npc) => `${npc.name} is ${npc.activity}`).join('. ');
  return `${location.description} ${people}.`;
}

function renderRolePanel() {
  const role = app.state.player.role;
  const outcome = app.state.outcome || { status: 'active' };
  if (!role) {
    return;
  }

  document.querySelector('#role-heading').textContent = role.name;
  document.querySelector('#role-faction').textContent = role.faction;
  document.querySelector('#role-summary').textContent = role.summary;
  document.querySelector('#role-objective-label').textContent = role.objective
    ? role.objective.label
    : 'Objective';
  document.querySelector('#role-objective-progress').textContent = role.objective
    ? `${role.objective.progress}/${role.objective.threshold}`
    : '—';
  document.querySelector('#role-objective-description').textContent = role.objective
    ? role.objective.description
    : role.victory;

  const outcomeLabel = document.querySelector('#role-outcome');
  if (outcome.status === 'won') {
    outcomeLabel.textContent = `Challenge complete: ${outcome.reason}`;
  } else if (outcome.status === 'lost') {
    outcomeLabel.textContent = `Challenge ended: ${outcome.reason}`;
  } else {
    outcomeLabel.textContent = `Ability: ${role.ability.label} · ${role.ability.description}`;
  }
}

function renderNearbyPeople() {
  const list = document.querySelector('#nearby-people');
  list.replaceChildren();

  if (app.state.nearbyNpcs.length === 0) {
    list.append(createElement('li', 'empty-copy', 'No one from your circle is here right now.'));
    return;
  }

  for (const npc of app.state.nearbyNpcs) {
    const item = createElement('li', 'person-card');
    const name = createElement('strong', '', npc.name);
    const details = createElement('span', '', `${npc.age} · ${npc.occupation}`);
    const activity = createElement('span', 'activity', capitalize(npc.activity));
    const relationship = npc.relationship
      ? createElement('span', 'relationship', `${npc.relationship.label} · Trust ${npc.relationship.trust}/100`)
      : null;
    const goal = npc.goal && npc.goal.status === 'active'
      ? createElement('span', 'goal', `${npc.goal.label} · ${npc.goal.progress}/${npc.goal.threshold}`)
      : null;
    item.append(name, details, activity);
    if (relationship) {
      item.append(relationship);
    }
    if (goal) {
      item.append(goal);
    }
    list.append(item);
  }
}

function renderNeighborhoodMap() {
  const map = document.querySelector('#neighborhood-map');
  map.replaceChildren();

  for (const location of app.state.locations) {
    const tile = createElement(
      'div',
      `location-tile${location.id === app.state.player.locationId ? ' current' : ''}`,
    );
    const name = createElement('strong', '', location.shortName);
    const population = createElement(
      'span',
      '',
      `${location.population} ${location.population === 1 ? 'person' : 'people'} nearby`,
    );
    tile.append(name, population);
    map.append(tile);
  }
}

function renderActions() {
  const groups = document.querySelector('#action-groups');
  groups.replaceChildren();
  if (!app.state) {
    return;
  }

  const nearbyIds = new Set(app.state.nearbyNpcs.map((npc) => npc.id));
  const role = app.state.player.role;
  if (role && role.ability) {
    const roleGroup = createActionGroup('Private role');
    const roleActions = createElement('div', 'action-list');
    if (role.ability.requiresTarget) {
      if (app.state.nearbyNpcs.length === 0) {
        roleActions.append(actionButton(
          role.ability.label,
          'role_action',
          {},
          true,
          'Need someone nearby',
        ));
      } else {
        for (const npc of app.state.nearbyNpcs) {
          roleActions.append(actionButton(
            `${role.ability.label} · ${npc.name}`,
            'role_action',
            { targetId: npc.id },
            false,
            `${role.ability.duration} min`,
          ));
        }
      }
    } else {
      roleActions.append(actionButton(
        role.ability.label,
        'role_action',
        {},
        false,
        `${role.ability.duration} min`,
      ));
    }
    roleGroup.append(roleActions);
    groups.append(roleGroup);
  }

  const peopleGroup = createActionGroup('People');
  const peopleActions = createElement('div', 'action-list');

  for (const npc of app.state.npcs) {
    const talkButton = actionButton(
      `${nearbyIds.has(npc.id) ? 'Talk with' : 'Talk to'} ${npc.name}`,
      'talk',
      { targetId: npc.id },
      !nearbyIds.has(npc.id),
      nearbyIds.has(npc.id)
        ? `${npc.relationship ? npc.relationship.label : '15 min'}`
        : locationName(npc.locationId),
    );
    const followButton = actionButton(
      `Follow ${npc.name}`,
      'follow',
      { targetId: npc.id },
      false,
      locationName(npc.locationId),
    );
    const helpButton = actionButton(
      `Help ${npc.name}`,
      'help',
      { targetId: npc.id },
      !nearbyIds.has(npc.id) || !npc.goal || npc.goal.status === 'complete',
      npc.goal && npc.goal.status === 'complete' ? 'Goal complete' : '20 min',
    );
    const askRumorButton = actionButton(
      `Ask ${npc.name} what they heard`,
      'ask_rumor',
      { targetId: npc.id },
      !nearbyIds.has(npc.id),
      '10 min',
    );
    const shareRumor = app.state.social.rumors && app.state.social.rumors[0];
    const shareRumorButton = actionButton(
      `Share a rumor with ${npc.name}`,
      'share_rumor',
      { targetId: npc.id, rumorId: shareRumor ? shareRumor.id : '' },
      !nearbyIds.has(npc.id) || !shareRumor,
      shareRumor ? '15 min' : 'Nothing to share',
    );
    peopleActions.append(
      talkButton,
      helpButton,
      askRumorButton,
      shareRumorButton,
      followButton,
    );
  }
  peopleGroup.append(peopleActions);
  groups.append(peopleGroup);

  const travelGroup = createActionGroup('Go somewhere');
  const travelActions = createElement('div', 'action-list');
  for (const location of app.state.locations) {
    travelActions.append(actionButton(
      `Go to ${location.shortName}`,
      'go',
      { locationId: location.id },
      location.id === app.state.player.locationId,
      location.id === app.state.player.locationId ? 'You are here' : '30 min',
    ));
  }
  travelGroup.append(travelActions);
  groups.append(travelGroup);

  const timeGroup = createActionGroup('Take your time');
  const timeActions = createElement('div', 'action-list');
  timeActions.append(
    actionButton('Check schedule', 'schedule', {}, false, '5 min'),
    actionButton('Wait', 'wait', {}, false, '30 min'),
  );
  timeGroup.append(timeActions);
  groups.append(timeGroup);
}

function renderEventLog() {
  const log = document.querySelector('#event-log');
  log.replaceChildren();
  const entries = [...app.state.eventLog].reverse();

  for (const event of entries) {
    const item = createElement('li', 'event-entry');
    const meta = createElement('div', 'event-meta');
    const time = createElement('span', 'event-time', `Day ${event.day} · ${event.clock}`);
    const type = createElement('span', 'event-type', typeLabels[event.type] || event.type);
    const text = createElement('p', 'event-text', event.text);
    meta.append(time, type);
    item.append(meta, text);
    log.append(item);
  }
}

function renderSocialDashboard() {
  const social = app.state.social || {
    relationships: [],
    memories: [],
    rumors: [],
  };
  const relationships = document.querySelector('#relationships-list');
  const memories = document.querySelector('#memory-list');
  const rumors = document.querySelector('#rumor-list');
  relationships.replaceChildren();
  memories.replaceChildren();
  rumors.replaceChildren();

  if (social.relationships.length === 0) {
    relationships.append(createElement('li', 'empty-copy', 'No relationships have formed yet.'));
  } else {
    for (const relationship of social.relationships) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', `${relationship.name} · ${relationship.npcView.label}`),
        createElement('span', '', `Trust ${relationship.npcView.trust}/100 · Suspicion ${relationship.npcView.suspicion}/100`),
        createElement('span', 'social-note', relationship.opinion.summary),
      );
      relationships.append(item);
    }
  }

  if (social.memories.length === 0) {
    memories.append(createElement('li', 'empty-copy', 'Your memory is still a blank page.'));
  } else {
    for (const memory of social.memories.slice(0, 6)) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', memory.subjectName),
        createElement('span', '', memory.text),
        createElement('span', 'social-note', `Day ${memory.day} · ${memory.clock} · ${Math.round(memory.confidence * 100)}% confidence`),
      );
      memories.append(item);
    }
  }

  if (social.rumors.length === 0) {
    rumors.append(createElement('li', 'empty-copy', 'No rumors have reached you yet.'));
  } else {
    for (const rumor of social.rumors.slice(0, 6)) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', `${rumor.subjectName} · ${rumor.credibilityLabel}`),
        createElement('span', '', rumor.text),
        createElement('span', 'social-note', `Heard from ${rumor.sourceName} · Spread ${rumor.spreadCount} ${rumor.spreadCount === 1 ? 'time' : 'times'}`),
      );
      rumors.append(item);
    }
  }
}

function createActionGroup(title) {
  const group = createElement('section', 'action-group');
  group.append(createElement('h3', '', title));
  return group;
}

function actionButton(label, action, data, disabled, detail) {
  const button = createElement('button', 'action-button');
  button.type = 'button';
  button.dataset.action = action;
  if (data.targetId) {
    button.dataset.targetId = data.targetId;
  }
  if (data.locationId) {
    button.dataset.locationId = data.locationId;
  }
  if (data.rumorId) {
    button.dataset.rumorId = data.rumorId;
  }
  if (data.approach) {
    button.dataset.approach = data.approach;
  }
  const challengeComplete = app.state
    && app.state.outcome
    && app.state.outcome.status !== 'active';
  button.disabled = disabled || app.busy || challengeComplete;
  button.append(
    createElement('span', '', label),
    createElement('span', 'button-detail', detail),
  );
  return button;
}

function locationName(locationId) {
  const location = app.state.locations.find((entry) => entry.id === locationId);
  return location ? location.shortName : 'Unknown';
}

function createElement(tagName, className = '', text = '') {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function showFatalError(message) {
  document.querySelector('#action-feedback').textContent = `Unable to load the simulation: ${message}`;
  document.querySelector('#scene-description').textContent = 'The world could not be reached. Try refreshing the page.';
}
