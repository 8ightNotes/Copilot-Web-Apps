const express = require('express');
const path = require('path');
const { GameValidationError } = require('./game/errors');
const { GameEngine } = require('./game/engine');
const { createGameRouter } = require('./routes/game');

const app = express();
const gameEngine = new GameEngine();
const publicDirectory = path.join(__dirname, '..', 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(publicDirectory));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'a-text-impostor', phase: 1 });
});

app.use('/api/game', createGameRouter(gameEngine));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'That API endpoint does not exist.' });
    return;
  }
  next();
});

app.use((req, res) => {
  res.status(404).send('Page not found.');
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({ error: 'Request body must be valid JSON.' });
    return;
  }

  if (error instanceof GameValidationError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      state: gameEngine.getState(),
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'The simulation encountered an unexpected error.' });
});

module.exports = {
  app,
  gameEngine,
};
