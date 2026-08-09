const express = require('express');

function createGameRouter(engine) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(engine.getState());
  });

  router.post('/actions', (req, res, next) => {
    try {
      res.json(engine.performAction(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset', (req, res) => {
    engine.reset();
    res.json(engine.getState());
  });

  return router;
}

module.exports = {
  createGameRouter,
};
