const { buildInsights } = require('../services/insightsService');

async function getInsights(req, res, next) {
  try {
    const insights = await buildInsights(req.user._id);
    res.json(insights);
  } catch (err) {
    next(err);
  }
}

module.exports = { getInsights };
