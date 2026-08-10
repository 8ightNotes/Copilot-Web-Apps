const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_START_DAY = 1;
const DEFAULT_START_MINUTE = 8 * 60;
const MAX_EVENT_LOG_LENGTH = 100;
const MAX_MEMORY_COUNT = 40;
const MAX_RUMOR_COUNT = 30;
const MAX_RUMOR_HISTORY = 12;
const MAX_RELATIONSHIP_HISTORY = 12;
const MAX_REPUTATION_HISTORY = 12;
const SOCIAL_VALUE_MIN = 0;
const SOCIAL_VALUE_MAX = 100;

const ACTION_DEFINITIONS = Object.freeze([
  {
    id: 'talk',
    label: 'Talk',
    description: 'Have a short conversation and learn what is on someone’s mind.',
    duration: 15,
    requiresTarget: true,
  },
  {
    id: 'help',
    label: 'Offer help',
    description: 'Help someone make progress on a personal goal.',
    duration: 20,
    requiresTarget: true,
  },
  {
    id: 'ask_rumor',
    label: 'Ask what they have heard',
    description: 'Ask someone nearby about the latest talk in the neighborhood.',
    duration: 10,
    requiresTarget: true,
  },
  {
    id: 'share_rumor',
    label: 'Share a rumor',
    description: 'Pass along something you have heard and live with the consequences.',
    duration: 15,
    requiresTarget: true,
  },
  {
    id: 'follow',
    label: 'Follow',
    description: 'Go where someone else is headed.',
    duration: 30,
    requiresTarget: true,
  },
  {
    id: 'go',
    label: 'Go somewhere',
    description: 'Move to another location.',
    duration: 30,
    requiresLocation: true,
  },
  {
    id: 'schedule',
    label: 'Check schedule',
    description: 'Review the expected rhythm of the day.',
    duration: 5,
  },
  {
    id: 'wait',
    label: 'Wait',
    description: 'Let the world move around you.',
    duration: 30,
  },
  {
    id: 'role_action',
    label: 'Use role ability',
    description: 'Take a private action shaped by your role.',
    duration: 15,
  },
]);

const LOCATION_IDS = Object.freeze({
  HOME: 'home',
  OFFICE: 'office',
  CAFETERIA: 'cafeteria',
  PARK: 'park',
  GYM: 'gym',
  TOWN_SQUARE: 'town-square',
});

module.exports = {
  ACTION_DEFINITIONS,
  DEFAULT_START_DAY,
  DEFAULT_START_MINUTE,
  MAX_MEMORY_COUNT,
  LOCATION_IDS,
  MAX_EVENT_LOG_LENGTH,
  MAX_RELATIONSHIP_HISTORY,
  MAX_REPUTATION_HISTORY,
  MAX_RUMOR_COUNT,
  MAX_RUMOR_HISTORY,
  MINUTES_PER_DAY,
  SOCIAL_VALUE_MAX,
  SOCIAL_VALUE_MIN,
};
