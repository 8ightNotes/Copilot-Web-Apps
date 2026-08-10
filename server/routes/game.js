const express = require('express');

function createGameRouter(engine) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(engine.getState());
  });

  router.post('/actions', (req, res, next) => {
    try {
      const result = engine.performAction(req.body);
      // Attach mini-game data if applicable
      const miniGame = getMiniGameForAction(req.body.action);
      if (miniGame) {
        result.miniGame = miniGame;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset', (req, res, next) => {
    try {
      engine.reset({ seed: Date.now() });
      res.json(engine.getState());
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function getMiniGameForAction(actionId) {
  const miniGames = {
    talk: {
      type: 'word_choice',
      title: 'Choose Your Words',
      description: 'Pick the best response to keep the conversation going.',
      options: [
        { id: 'empathize', label: '😊 Empathize', effect: 'trust+' },
        { id: 'joke', label: '😄 Make a joke', effect: 'affinity+' },
        { id: 'probe', label: '🔍 Dig deeper', effect: 'info+ but suspicion+' },
        { id: 'deflect', label: '🤐 Change subject', effect: 'safe but no gain' },
      ],
      timeLimit: 8,
    },
    help: {
      type: 'quick_tap',
      title: 'Lend a Hand',
      description: 'Tap the highlighted buttons in order to help efficiently!',
      sequence: generateTapSequence(),
      timeLimit: 6,
    },
    role_action: {
      type: 'stealth_meter',
      title: 'Stay Undetected',
      description: 'Stop the meter in the green zone to act without raising suspicion.',
      zones: { green: [35, 65], yellow: [20, 80], red: [0, 100] },
      speed: 2.5,
      timeLimit: 5,
    },
  };
  return miniGames[actionId] || null;
}

function generateTapSequence() {
  const icons = ['⬆', '⬇', '⬅', '➡', '⭐'];
  const length = 4 + Math.floor(Math.random() * 3);
  const sequence = [];
  for (let i = 0; i < length; i++) {
    sequence.push(icons[Math.floor(Math.random() * icons.length)]);
  }
  return sequence;
}

module.exports = {
  createGameRouter,
};
