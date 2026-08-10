class GameValidationError extends Error {
  constructor(message, code = 'INVALID_ACTION') {
    super(message);
    this.name = 'GameValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

module.exports = {
  GameValidationError,
};
