const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_START_DAY = 1;
const DEFAULT_START_MINUTE = 8 * 60;
const MAX_EVENT_LOG_LENGTH = 100;

const ACTION_DEFINITIONS = Object.freeze([
  {
    id: 'talk',
    label: 'Talk',
    description: 'Have a short conversation with someone here.',
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
  LOCATION_IDS,
  MAX_EVENT_LOG_LENGTH,
  MINUTES_PER_DAY,
};
