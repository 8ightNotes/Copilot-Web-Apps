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
      render();
      return;
    }

    app.state = result;
    app.message = result.notice;
    render();
  } catch (error) {
    app.message = error.message;
    render();
  } finally {
    setBusy(false);
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
    render();
  } catch (error) {
    app.message = error.message;
    render();
  } finally {
    setBusy(false);
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
  if (app.state) {
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
  document.querySelector('#scene-heading').textContent = player.location.name;
  document.querySelector('#scene-description').textContent = describeScene();
  document.querySelector('#nearby-count').textContent = String(app.state.nearbyNpcs.length);
  document.querySelector('#action-feedback').textContent = app.message || app.state.notice;

  renderNearbyPeople();
  renderNeighborhoodMap();
  renderActions();
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
    item.append(name, details, activity);
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
  const peopleGroup = createActionGroup('People');
  const peopleActions = createElement('div', 'action-list');

  for (const npc of app.state.npcs) {
    const talkButton = actionButton(
      `${nearbyIds.has(npc.id) ? 'Talk' : 'Talk to'} ${npc.name}`,
      'talk',
      { targetId: npc.id },
      !nearbyIds.has(npc.id),
      nearbyIds.has(npc.id) ? '15 min' : locationName(npc.locationId),
    );
    const followButton = actionButton(
      `Follow ${npc.name}`,
      'follow',
      { targetId: npc.id },
      false,
      locationName(npc.locationId),
    );
    peopleActions.append(talkButton, followButton);
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
  button.disabled = disabled || app.busy;
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
