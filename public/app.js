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
  role_failure: 'Role challenge ended',
  victory: 'Victory',
  reaction: 'Social reaction',
  rumor: 'Rumor',
  social_event: 'Social event',
  waiting: 'Waiting',
};

/* ===== INITIALIZATION ===== */
document.addEventListener('DOMContentLoaded', () => {
  // Menu buttons
  document.querySelector('#btn-new-game').addEventListener('click', startNewGame);
  document.querySelector('#btn-continue').addEventListener('click', continueGame);
  document.querySelector('#btn-how-to-play').addEventListener('click', () => openModal('modal-help'));

  // HUD buttons
  document.querySelector('#hud-menu-btn').addEventListener('click', () => openModal('modal-pause'));
  document.querySelector('#hud-role-btn').addEventListener('click', () => openModal('modal-role'));
  document.querySelector('#hud-map-btn').addEventListener('click', () => { renderNeighborhoodMap(); openModal('modal-map'); });
  document.querySelector('#hud-social-btn').addEventListener('click', () => { renderSocialDashboard(); openModal('modal-social'); });
  document.querySelector('#hud-log-btn').addEventListener('click', () => { renderEventLog(); openModal('modal-log'); });

  // Pause menu
  document.querySelector('#pause-resume').addEventListener('click', () => closeModal('modal-pause'));
  document.querySelector('#pause-how').addEventListener('click', () => { closeModal('modal-pause'); openModal('modal-help'); });
  document.querySelector('#pause-quit').addEventListener('click', quitToMenu);

  // Game actions
  document.querySelector('#action-groups').addEventListener('click', handleActionClick);
  document.querySelector('#reset-button').addEventListener('click', resetGame);

  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Social tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModalEl = document.querySelector('.modal-overlay.open');
      if (openModalEl) closeModal(openModalEl.id);
    }
  });
});

/* ===== SCREEN NAVIGATION ===== */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function quitToMenu() {
  closeModal('modal-pause');
  showScreen('menu-screen');
}

/* ===== MODAL MANAGEMENT ===== */
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

/* ===== TAB SWITCHING ===== */
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('hidden', content.id !== `tab-${tabName}`);
  });
}

/* ===== TOAST NOTIFICATIONS ===== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.append(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ===== GAME LOGIC ===== */
async function startNewGame() {
  try {
    const response = await fetch('/api/game/reset', { method: 'POST' });
    app.state = await parseResponse(response);
    app.message = 'A new day begins. Check your role to discover your assignment.';
    showScreen('game-screen');
    render();
    showToast('New game started!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function continueGame() {
  try {
    const response = await fetch('/api/game');
    const payload = await parseResponse(response);
    app.state = payload;
    app.message = payload.notice;
    showScreen('game-screen');
    render();
    showToast('Game loaded.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleActionClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button || app.busy) return;

  const payload = { action: button.dataset.action };
  if (button.dataset.targetId) payload.targetId = button.dataset.targetId;
  if (button.dataset.locationId) payload.locationId = button.dataset.locationId;
  if (button.dataset.rumorId) payload.rumorId = button.dataset.rumorId;
  if (button.dataset.approach) payload.approach = button.dataset.approach;

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
      if (result.state) app.state = result.state;
      app.message = result.error || 'That action could not be completed.';
      showToast(app.message, 'warning');
      return;
    }

    app.state = result;
    app.message = result.notice;
    if (result.notice) showToast(result.notice, 'success');
  } catch (error) {
    app.message = error.message;
    showToast(error.message, 'error');
  } finally {
    setBusy(false);
    render();
  }
}

async function resetGame() {
  if (app.busy || !window.confirm('Start over at the beginning of Day 1?')) return;

  setBusy(true);
  try {
    const response = await fetch('/api/game/reset', { method: 'POST' });
    app.state = await parseResponse(response);
    app.message = 'A fresh simulation is ready.';
    showToast('New day started!', 'success');
  } catch (error) {
    app.message = error.message;
    showToast(error.message, 'error');
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
  if (app.state && value) renderActions();
}

/* ===== RENDERING ===== */
function render() {
  if (!app.state) return;

  const { time, player } = app.state;
  document.querySelector('#hud-day').textContent = time.day || '1';
  document.querySelector('#hud-time').textContent = time.label;
  document.querySelector('#hud-location').textContent = player.location.shortName;
  document.querySelector('#hud-turn').textContent = String(app.state.turn);
  document.querySelector('#hud-rep').textContent = `${app.state.social.reputation.score}`;
  document.querySelector('#period-badge').textContent = time.period;
  document.querySelector('#scene-heading').textContent = player.location.name;
  document.querySelector('#scene-description').textContent = describeScene();
  document.querySelector('#nearby-count').textContent = String(app.state.nearbyNpcs.length);
  document.querySelector('#action-feedback').textContent = app.message || app.state.notice;

  renderNearbyPeople();
  renderRolePanel();
  renderActions();
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
  if (!role) return;

  document.querySelector('#role-heading').textContent = role.name;
  document.querySelector('#role-faction').textContent = role.faction;
  document.querySelector('#role-summary').textContent = role.summary;
  document.querySelector('#role-objective-label').textContent = role.objective ? role.objective.label : 'Objective';
  document.querySelector('#role-objective-progress').textContent = role.objective ? `${role.objective.progress}/${role.objective.threshold}` : '—';
  document.querySelector('#role-objective-description').textContent = role.objective ? role.objective.description : role.victory;

  const outcomeLabel = document.querySelector('#role-outcome');
  if (outcome.status === 'won') {
    outcomeLabel.textContent = `🏆 Challenge complete: ${outcome.reason}`;
    outcomeLabel.style.color = 'var(--success)';
  } else if (outcome.status === 'lost') {
    outcomeLabel.textContent = `💀 Challenge ended: ${outcome.reason}`;
    outcomeLabel.style.color = 'var(--danger)';
  } else {
    outcomeLabel.textContent = `⚡ Ability: ${role.ability.label} — ${role.ability.description}`;
    outcomeLabel.style.color = '';
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
    item.append(
      createElement('strong', '', npc.name),
      createElement('span', '', `${npc.age} · ${npc.occupation}`),
      createElement('span', 'activity', capitalize(npc.activity)),
    );
    if (npc.relationship) {
      item.append(createElement('span', 'relationship', `${npc.relationship.label} · Trust ${npc.relationship.trust}/100`));
    }
    if (npc.goal && npc.goal.status === 'active') {
      item.append(createElement('span', 'goal', `${npc.goal.label} · ${npc.goal.progress}/${npc.goal.threshold}`));
    }
    list.append(item);
  }
}

function renderNeighborhoodMap() {
  const map = document.querySelector('#neighborhood-map');
  map.replaceChildren();
  if (!app.state) return;

  for (const location of app.state.locations) {
    const tile = createElement('div', `location-tile${location.id === app.state.player.locationId ? ' current' : ''}`);
    tile.append(
      createElement('strong', '', location.shortName),
      createElement('span', '', `${location.population} ${location.population === 1 ? 'person' : 'people'} nearby`),
    );
    map.append(tile);
  }
}

function renderActions() {
  const groups = document.querySelector('#action-groups');
  groups.replaceChildren();
  if (!app.state) return;

  const nearbyIds = new Set(app.state.nearbyNpcs.map((npc) => npc.id));
  const role = app.state.player.role;

  if (role && role.ability) {
    const roleGroup = createActionGroup('⚡ Private Role');
    const roleActions = createElement('div', 'action-list');
    if (role.ability.requiresTarget) {
      if (app.state.nearbyNpcs.length === 0) {
        roleActions.append(actionButton(role.ability.label, 'role_action', {}, true, 'Need someone nearby'));
      } else {
        for (const npc of app.state.nearbyNpcs) {
          roleActions.append(actionButton(`${role.ability.label} · ${npc.name}`, 'role_action', { targetId: npc.id }, false, `${role.ability.duration} min`));
        }
      }
    } else {
      roleActions.append(actionButton(role.ability.label, 'role_action', {}, false, `${role.ability.duration} min`));
    }
    roleGroup.append(roleActions);
    groups.append(roleGroup);
  }

  const peopleGroup = createActionGroup('👤 People');
  const peopleActions = createElement('div', 'action-list');
  for (const npc of app.state.npcs) {
    peopleActions.append(
      actionButton(`${nearbyIds.has(npc.id) ? '💬 Talk with' : 'Talk to'} ${npc.name}`, 'talk', { targetId: npc.id }, !nearbyIds.has(npc.id), nearbyIds.has(npc.id) ? (npc.relationship ? npc.relationship.label : '15 min') : locationName(npc.locationId)),
      actionButton(`🤝 Help ${npc.name}`, 'help', { targetId: npc.id }, !nearbyIds.has(npc.id) || !npc.goal || npc.goal.status === 'complete', npc.goal && npc.goal.status === 'complete' ? 'Done' : '20 min'),
      actionButton(`👂 Ask ${npc.name} for rumors`, 'ask_rumor', { targetId: npc.id }, !nearbyIds.has(npc.id), '10 min'),
    );
    const shareRumor = app.state.social.rumors && app.state.social.rumors[0];
    peopleActions.append(
      actionButton(`🗣 Share rumor with ${npc.name}`, 'share_rumor', { targetId: npc.id, rumorId: shareRumor ? shareRumor.id : '' }, !nearbyIds.has(npc.id) || !shareRumor, shareRumor ? '15 min' : 'Nothing'),
      actionButton(`🚶 Follow ${npc.name}`, 'follow', { targetId: npc.id }, false, locationName(npc.locationId)),
    );
  }
  peopleGroup.append(peopleActions);
  groups.append(peopleGroup);

  const travelGroup = createActionGroup('🗺 Travel');
  const travelActions = createElement('div', 'action-list');
  for (const location of app.state.locations) {
    travelActions.append(actionButton(`Go to ${location.shortName}`, 'go', { locationId: location.id }, location.id === app.state.player.locationId, location.id === app.state.player.locationId ? 'Here' : '30 min'));
  }
  travelGroup.append(travelActions);
  groups.append(travelGroup);

  const timeGroup = createActionGroup('⏳ Time');
  const timeActions = createElement('div', 'action-list');
  timeActions.append(
    actionButton('📋 Check schedule', 'schedule', {}, false, '5 min'),
    actionButton('⏸ Wait', 'wait', {}, false, '30 min'),
  );
  timeGroup.append(timeActions);
  groups.append(timeGroup);
}

function renderEventLog() {
  const log = document.querySelector('#event-log');
  log.replaceChildren();
  if (!app.state) return;

  const entries = [...app.state.eventLog].reverse();
  for (const event of entries) {
    const item = createElement('li', 'event-entry');
    const meta = createElement('div', 'event-meta');
    meta.append(
      createElement('span', 'event-time', `Day ${event.day} · ${event.clock}`),
      createElement('span', 'event-type', typeLabels[event.type] || event.type),
    );
    item.append(meta, createElement('p', 'event-text', event.text));
    log.append(item);
  }
}

function renderSocialDashboard() {
  const social = app.state ? app.state.social : { relationships: [], memories: [], rumors: [] };
  const relationships = document.querySelector('#relationships-list');
  const memories = document.querySelector('#memory-list');
  const rumors = document.querySelector('#rumor-list');
  relationships.replaceChildren();
  memories.replaceChildren();
  rumors.replaceChildren();

  if (!social.relationships || social.relationships.length === 0) {
    relationships.append(createElement('li', 'empty-copy', 'No relationships yet.'));
  } else {
    for (const rel of social.relationships) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', `${rel.name} · ${rel.npcView.label}`),
        createElement('span', '', `Trust ${rel.npcView.trust}/100 · Suspicion ${rel.npcView.suspicion}/100`),
        createElement('span', 'social-note', rel.opinion.summary),
      );
      relationships.append(item);
    }
  }

  if (!social.memories || social.memories.length === 0) {
    memories.append(createElement('li', 'empty-copy', 'Your memory is blank.'));
  } else {
    for (const mem of social.memories.slice(0, 8)) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', mem.subjectName),
        createElement('span', '', mem.text),
        createElement('span', 'social-note', `Day ${mem.day} · ${mem.clock} · ${Math.round(mem.confidence * 100)}%`),
      );
      memories.append(item);
    }
  }

  if (!social.rumors || social.rumors.length === 0) {
    rumors.append(createElement('li', 'empty-copy', 'No rumors yet.'));
  } else {
    for (const rumor of social.rumors.slice(0, 8)) {
      const item = createElement('li', 'social-item');
      item.append(
        createElement('strong', '', `${rumor.subjectName} · ${rumor.credibilityLabel}`),
        createElement('span', '', rumor.text),
        createElement('span', 'social-note', `From ${rumor.sourceName} · Spread ${rumor.spreadCount}x`),
      );
      rumors.append(item);
    }
  }
}

/* ===== HELPERS ===== */
function createActionGroup(title) {
  const group = createElement('section', 'action-group');
  group.append(createElement('h3', '', title));
  return group;
}

function actionButton(label, action, data, disabled, detail) {
  const button = createElement('button', 'action-button');
  button.type = 'button';
  button.dataset.action = action;
  if (data.targetId) button.dataset.targetId = data.targetId;
  if (data.locationId) button.dataset.locationId = data.locationId;
  if (data.rumorId) button.dataset.rumorId = data.rumorId;
  if (data.approach) button.dataset.approach = data.approach;
  const challengeComplete = app.state && app.state.outcome && app.state.outcome.status !== 'active';
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
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
