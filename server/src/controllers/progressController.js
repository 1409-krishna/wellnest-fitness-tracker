const Session = require('../models/Session');
const Journal = require('../models/Journal');
const HabitLog = require('../models/HabitLog');
const { PILLARS, addDays, weekdayName } = require('../utils/constants');
const { validationResult } = require('express-validator');

async function weekly(req, res, next) {
  try {
    const weekStart = req.query.weekStart;
    if (!weekStart) {
      return res.status(400).json({ message: 'weekStart is required (YYYY-MM-DD)' });
    }
    const weekEnd = addDays(weekStart, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const [sessions, logs] = await Promise.all([
      Session.find({ userId: req.user._id, date: { $gte: weekStart, $lte: weekEnd } }).populate(
        'activityId',
        'name category durationMins'
      ),
      HabitLog.find({ userId: req.user._id, date: { $gte: weekStart, $lte: weekEnd } }),
    ]);

    const series = days.map((date) => {
      const dayLogs = logs.filter((l) => l.date === date && l.completed);
      const daySessions = sessions.filter((s) => s.date === date);
      const row = {
        date,
        label: weekdayName(date),
        sessions: daySessions.length,
        minutes: daySessions.reduce((sum, s) => sum + (s.durationMins || 0), 0),
        habits: dayLogs.length,
      };
      PILLARS.forEach((p) => {
        row[p] = dayLogs.some((l) => l.pillar === p) ? 1 : 0;
      });
      return row;
    });

    const completedSessions = sessions.length;
    const habitRate = Math.round(((logs.filter((l) => l.completed).length / (7 * 4)) * 100) || 0);

    res.json({
      weekStart,
      weekEnd,
      series,
      completedSessions,
      habitRate,
      sessions,
    });
  } catch (err) {
    next(err);
  }
}

async function listSessions(req, res, next) {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .populate('activityId', 'name category durationMins')
      .sort({ date: -1, createdAt: -1 })
      .limit(40);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function createSession(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const session = await Session.create({
      userId: req.user._id,
      activityId: req.body.activityId,
      date: req.body.date,
      durationMins: req.body.durationMins || 20,
    });
    const populated = await session.populate('activityId', 'name category durationMins');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const { id } = req.params;
    await Session.findOneAndDelete({ _id: id, userId: req.user._id });
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function listJournals(req, res, next) {
  try {
    const notes = await Journal.find({ userId: req.user._id }).sort({ date: -1 }).limit(30);
    res.json(notes);
  } catch (err) {
    next(err);
  }
}

async function createJournal(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const note = await Journal.create({
      userId: req.user._id,
      date: req.body.date,
      mood: req.body.mood || 'steady',
      note: req.body.note,
    });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

async function deleteJournal(req, res, next) {
  try {
    const { id } = req.params;
    await Journal.findOneAndDelete({ _id: id, userId: req.user._id });
    res.json({ message: 'Journal reflection deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  weekly,
  listSessions,
  createSession,
  deleteSession,
  listJournals,
  createJournal,
  deleteJournal,
};
