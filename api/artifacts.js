const app = require('../server');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(app.artifacts || []);
};
