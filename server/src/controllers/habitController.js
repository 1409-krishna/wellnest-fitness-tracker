const { validationResult } = require('express-validator');
const HabitLog = require('../models/HabitLog');
const { PILLARS, addDays } = require('../utils/constants');

async function list(req, res, next) {
  try {
    const from = req.query.from;
    const to = req.query.to;
    const filter = { userId: req.user._id };
    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    }
    const logs = await HabitLog.find(filter).sort({ date: 1, pillar: 1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { date, pillar, completed, activityId, notes } = req.body;
    const log = await HabitLog.findOneAndUpdate(
      { userId: req.user._id, date, pillar },
      {
        userId: req.user._id,
        date,
        pillar,
        completed: Boolean(completed),
        activityId: activityId || null,
        notes: notes || '',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(log);
  } catch (err) {
    next(err);
  }
}

function weekKeys(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

async function weekSummary(userId, weekStart) {
  const days = weekKeys(weekStart);
  const logs = await HabitLog.find({
    userId,
    date: { $gte: days[0], $lte: days[6] },
  });
  return { days, logs };
}

module.exports = { list, upsert, weekSummary, PILLARS };
