const { LOCATION_IDS, MINUTES_PER_DAY } = require('./constants');

/* ===== NAME POOLS ===== */
const FIRST_NAMES = [
  'Sarah', 'Mike', 'James', 'Tom', 'Elena', 'Kai', 'Priya', 'Marcus',
  'Zara', 'Leo', 'Aisha', 'Devon', 'Nadia', 'Oscar', 'Lily', 'Reuben',
  'Clara', 'Yusuf', 'Iris', 'Dante', 'Freya', 'Hugo', 'Mila', 'Soren',
  'Anya', 'Felix', 'Rosa', 'Theo', 'Vera', 'Noah', 'Juno', 'Ezra',
];

const LAST_NAMES = [
  'Chen', 'Alvarez', 'Okafor', 'Becker', 'Morozova', 'Tanaka', 'Patel', 'Williams',
  'Osei', 'Park', 'Duval', 'Reyes', 'Hoffman', 'Singh', 'Lindqvist', 'Nakamura',
  'Rivera', 'Fischer', 'Ahmed', 'Novak', 'Laurent', 'Kim', 'Ortiz', 'Volkov',
  'Marchetti', 'Santos', 'Johansson', 'Ibrahimov', 'Murphy', 'Stein', 'Costa', 'Reed',
];

const OCCUPATIONS = [
  'Product designer', 'Facilities coordinator', 'Project manager', 'Data analyst',
  'Software engineer', 'Barista', 'Freelance writer', 'Music teacher',
  'Accountant', 'Nurse', 'Architect', 'Social worker',
  'Marketing specialist', 'Chef', 'Librarian', 'Photographer',
  'Mechanic', 'Therapist', 'Florist', 'Personal trainer',
];

const PERSONALITIES = [
  'observant and warm', 'sociable and practical', 'organized and guarded',
  'curious and easily distracted', 'quiet and thoughtful', 'bold and impulsive',
  'patient and methodical', 'cheerful and talkative', 'reserved and analytical',
  'adventurous and restless', 'empathetic and soft-spoken', 'competitive and sharp',
];

const TRAIT_POOL = [
  'observant', 'warm', 'deliberate', 'sociable', 'practical', 'protective',
  'organized', 'guarded', 'accountable', 'curious', 'restless', 'analytical',
  'creative', 'skeptical', 'compassionate', 'stubborn', 'adaptable', 'meticulous',
  'spontaneous', 'loyal', 'witty', 'reserved', 'ambitious', 'patient',
];

const VALUE_POOL = [
  'clarity', 'craft', 'reciprocity', 'reliability', 'community', 'competence',
  'order', 'fairness', 'preparedness', 'truth', 'novelty', 'patterns',
  'freedom', 'beauty', 'honesty', 'tradition', 'adventure', 'harmony',
];

const SOCIAL_STYLES = [
  'asks careful questions before trusting someone',
  'makes friends quickly but notices who keeps their word',
  'keeps conversations focused until someone proves reliable',
  'follows interesting questions wherever they lead',
  'observes quietly and shares opinions only when asked',
  'charms everyone but reveals little about themselves',
  'builds trust slowly through consistent small acts',
  'speaks directly and expects the same in return',
];

const GOAL_TEMPLATES = [
  { label: 'Finish the proposal', description: 'finish a proposal before the end of the day', threshold: 3 },
  { label: 'Keep things running', description: 'keep operations running smoothly without a crisis', threshold: 3 },
  { label: 'Align the team', description: 'get the team aligned before the afternoon meeting', threshold: 3 },
  { label: 'Find the pattern', description: 'find a meaningful pattern in recent data', threshold: 3 },
  { label: 'Land the client', description: 'secure a new client before the deadline', threshold: 3 },
  { label: 'Fix the bug', description: 'track down and resolve the recurring issue', threshold: 3 },
  { label: 'Organize the event', description: 'handle all the logistics for the upcoming event', threshold: 3 },
  { label: 'Complete the article', description: 'finish writing and editing the article', threshold: 3 },
  { label: 'Close the deal', description: 'negotiate and close the deal today', threshold: 3 },
  { label: 'Master the routine', description: 'nail the new routine without mistakes', threshold: 3 },
  { label: 'Gather intel', description: 'piece together what everyone knows about the situation', threshold: 3 },
  { label: 'Build the prototype', description: 'get a working prototype ready for review', threshold: 3 },
];

const DIALOGUE_POOL = [
  'I keep noticing how different this place feels depending on who is here.',
  'The day is still young. There is plenty of time for something unexpected.',
  'I was just making a list of what I know and what I am assuming.',
  'If you want to know what is going on, start by noticing who keeps arriving late.',
  'People remember the headline and forget the important qualifiers.',
  'I like facts, but facts are not always the same thing as the truth.',
  'There is a pattern here. I just have not decided what it means yet.',
  'Everyone has their own schedule. The trick is knowing when they break it.',
  'I do not trust anyone who is always in a hurry.',
  'Some days you learn more from watching than from asking.',
  'The building has a rhythm. You can tell when something is out of place.',
  'I wonder who is keeping track of who is watching.',
  'Ask me later. I am still processing what just happened.',
  'Timing matters more than people think.',
  'The quietest person in the room often knows the most.',
  'I have a feeling today will not go according to plan.',
];

const LOCATION_LIST = Object.values(LOCATION_IDS);

/* ===== SEEDED RNG ===== */
function createRng(seed) {
  let state = seed | 0;
  return function next() {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

function pickN(rng, array, n) {
  const shuffled = [...array].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function randomIntRange(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/* ===== SCHEDULE GENERATION ===== */
function generateSchedule(rng, homeLocationId) {
  const schedule = [];
  const wakeHour = randomIntRange(rng, 6, 8);
  const wakeMinute = wakeHour * 60 + randomIntRange(rng, 0, 45);
  const sleepHour = randomIntRange(rng, 20, 22);
  const sleepMinute = sleepHour * 60;

  schedule.push({ start: 0, end: wakeMinute, locationId: homeLocationId, activity: 'sleeping', social: false, companions: [] });

  let currentMinute = wakeMinute;
  const workLocations = [LOCATION_IDS.OFFICE, LOCATION_IDS.CAFETERIA, LOCATION_IDS.TOWN_SQUARE];
  const leisureLocations = [LOCATION_IDS.PARK, LOCATION_IDS.GYM, LOCATION_IDS.CAFETERIA, LOCATION_IDS.TOWN_SQUARE];
  const activities = [
    'working at their desk', 'answering messages', 'attending a meeting',
    'reviewing documents', 'brainstorming ideas', 'organizing files',
  ];
  const leisureActivities = [
    'taking a walk', 'exercising', 'having coffee', 'reading',
    'people-watching', 'running errands', 'meeting a friend',
  ];

  // Morning routine
  const morningLoc = pick(rng, [LOCATION_IDS.CAFETERIA, LOCATION_IDS.GYM, homeLocationId]);
  const morningEnd = currentMinute + randomIntRange(rng, 30, 75);
  schedule.push({
    start: currentMinute, end: morningEnd, locationId: morningLoc,
    activity: morningLoc === LOCATION_IDS.GYM ? 'working out' : morningLoc === LOCATION_IDS.CAFETERIA ? 'grabbing breakfast' : 'getting ready',
    social: false, companions: [],
  });
  currentMinute = morningEnd;

  // Work blocks
  const workLoc = pick(rng, workLocations);
  const lunchStart = 12 * 60 + randomIntRange(rng, -15, 15);
  if (currentMinute < lunchStart) {
    const goalSlot = rng() > 0.5;
    schedule.push({
      start: currentMinute, end: lunchStart, locationId: workLoc,
      activity: pick(rng, activities),
      social: rng() > 0.7, companions: [], goalId: goalSlot ? 'npc-goal' : undefined,
    });
  }
  currentMinute = lunchStart;

  // Lunch
  const lunchEnd = currentMinute + 60;
  schedule.push({
    start: currentMinute, end: lunchEnd, locationId: LOCATION_IDS.CAFETERIA,
    activity: 'having lunch', social: true, companions: [],
  });
  currentMinute = lunchEnd;

  // Afternoon
  const afternoonEnd = randomIntRange(rng, 16, 17) * 60 + randomIntRange(rng, 0, 30);
  schedule.push({
    start: currentMinute, end: afternoonEnd, locationId: workLoc,
    activity: pick(rng, activities),
    social: rng() > 0.6, companions: [], goalId: 'npc-goal',
  });
  currentMinute = afternoonEnd;

  // Evening leisure
  const eveningLoc = pick(rng, leisureLocations);
  const eveningEnd = Math.min(currentMinute + randomIntRange(rng, 60, 120), sleepMinute);
  schedule.push({
    start: currentMinute, end: eveningEnd, locationId: eveningLoc,
    activity: pick(rng, leisureActivities),
    social: rng() > 0.5, companions: [],
  });
  currentMinute = eveningEnd;

  // Wind down at home
  if (currentMinute < sleepMinute) {
    schedule.push({
      start: currentMinute, end: sleepMinute, locationId: homeLocationId,
      activity: 'unwinding at home', social: false, companions: [],
    });
  }

  // Sleep
  schedule.push({
    start: sleepMinute, end: MINUTES_PER_DAY, locationId: homeLocationId,
    activity: 'sleeping', social: false, companions: [],
  });

  return schedule;
}

/* ===== NPC GENERATION ===== */
function generateNpcs(count = 4, seed = Date.now()) {
  const rng = createRng(seed);
  const usedNames = new Set();
  const npcs = [];

  for (let i = 0; i < count; i++) {
    let firstName, lastName, fullName;
    do {
      firstName = pick(rng, FIRST_NAMES);
      lastName = pick(rng, LAST_NAMES);
      fullName = `${firstName} ${lastName}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const id = `npc-${firstName.toLowerCase()}-${i}`;
    const age = randomIntRange(rng, 22, 55);
    const occupation = pick(rng, OCCUPATIONS);
    const personality = pick(rng, PERSONALITIES);
    const traits = pickN(rng, TRAIT_POOL, 3);
    const values = pickN(rng, VALUE_POOL, 3);
    const socialStyle = pick(rng, SOCIAL_STYLES);
    const homeLocationId = LOCATION_IDS.HOME;
    const goalTemplate = pick(rng, GOAL_TEMPLATES);
    const dialogue = pickN(rng, DIALOGUE_POOL, 3);
    const schedule = generateSchedule(rng, homeLocationId);

    const goal = {
      id: `${id}-goal`,
      label: goalTemplate.label,
      description: goalTemplate.description,
      progress: 0,
      threshold: goalTemplate.threshold,
      status: 'active',
    };

    const baseSocial = () => ({
      affinity: randomIntRange(rng, 30, 70),
      trust: randomIntRange(rng, 30, 70),
      respect: randomIntRange(rng, 35, 70),
      suspicion: randomIntRange(rng, 5, 25),
    });

    npcs.push({
      id,
      name: fullName,
      age,
      occupation,
      personality,
      traits,
      values,
      socialStyle,
      homeLocationId,
      goal,
      socialProfile: {
        playerRelationship: baseSocial(),
        playerOpinion: baseSocial(),
        relationships: {},
      },
      schedule,
      dialogue,
    });
  }

  // Build inter-NPC relationships
  for (const npc of npcs) {
    for (const other of npcs) {
      if (npc.id === other.id) continue;
      npc.socialProfile.relationships[other.id] = {
        affinity: randomIntRange(rng, 30, 75),
        trust: randomIntRange(rng, 30, 70),
        respect: randomIntRange(rng, 30, 70),
        suspicion: randomIntRange(rng, 3, 25),
      };
    }
    // Add companions to social schedule entries
    const otherIds = npcs.filter((o) => o.id !== npc.id).map((o) => o.id);
    for (const entry of npc.schedule) {
      if (entry.social && entry.companions.length === 0) {
        const numCompanions = randomIntRange(rng, 1, Math.min(3, otherIds.length));
        entry.companions = pickN(rng, otherIds, numCompanions);
      }
    }
  }

  return npcs;
}

module.exports = { generateNpcs };
