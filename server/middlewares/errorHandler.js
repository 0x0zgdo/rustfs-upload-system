module.exports = function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
