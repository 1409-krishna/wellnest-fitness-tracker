const { buildInsights, coachChat } = require('../services/insightsService');

async function getInsights(req, res, next) {
  try {
    const insights = await buildInsights(req.user._id);
    res.json(insights);
  } catch (err) {
    next(err);
  }
}

async function askCoach(req, res, next) {
  try {
    const { query } = req.body;
    const response = await coachChat(req.user._id, query);
    res.json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = { getInsights, askCoach };
