'use strict';
/**
 * reportController.js — Phase 6
 * GET /api/reports/weekly  → builds stats + sends weekly email
 * GET /api/reports/summary → returns JSON stats (no email)
 */

const User = require('../models/User');
const Session = require('../models/Session');
const HabitLog = require('../models/HabitLog');
const HydrationLog = require('../models/HydrationLog');
const Goal = require('../models/Goal');
const { sendWeeklyWellnessSummary } = require('../services/emailService');

// ── Shared stat builder ────────────────────────────────────────────────────────
async function buildWeeklyStats(userId) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  // Sessions
  const sessions = await Session.find({
    userId,
    date: { $gte: weekStart },
  });
  const activeSessions = sessions.length;
  const totalMinutes = sessions.reduce((s, x) => s + (x.durationMin || 0), 0);

  // Top activity (most frequent category)
  const catCount = {};
  sessions.forEach((s) => {
    if (s.category) catCount[s.category] = (catCount[s.category] || 0) + 1;
  });
  const topActivity = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Habits (last 7 days)
  const habitLogs = await HabitLog.find({
    userId,
    date: {
      $gte: weekStart.toISOString().slice(0, 10),
      $lte: now.toISOString().slice(0, 10),
    },
  });
  let habitsCompleted = 0;
  let totalHabits = 0;
  habitLogs.forEach((log) => {
    if (!log.pillars) return;
    Object.values(log.pillars).forEach((p) => {
      totalHabits++;
      if (p.completed) habitsCompleted++;
    });
  });

  // Hydration average
  const hydLogs = await HydrationLog.find({
    userId,
    date: {
      $gte: weekStart.toISOString().slice(0, 10),
      $lte: now.toISOString().slice(0, 10),
    },
  });
  const totalHydration = hydLogs.reduce(
    (s, l) => s + (l.entries || []).reduce((a, e) => a + (e.amountMl || 0), 0),
    0
  );
  const avgHydrationMl = hydLogs.length > 0 ? Math.round(totalHydration / hydLogs.length) : 0;

  // Goals
  const goals = await Goal.find({ userId });
  const goalsOnTrack = goals.filter((g) => (g.actualThisWeek || 0) >= g.targetPerWeek).length;

  const affirmations = [
    'Every workout is a vote for the person you want to become.',
    'Progress, not perfection.',
    'Small steps taken daily create lasting change.',
    'Your body is capable of more than you think.',
    'Rest is part of the process — honour it.',
  ];
  const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  return {
    activeSessions,
    totalMinutes,
    habitsCompleted,
    totalHabits,
    avgHydrationMl,
    goalsOnTrack,
    totalGoals: goals.length,
    topActivity,
    affirmation,
    weekStart: weekStart.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
  };
}

// GET /api/reports/weekly — sends email
async function weeklyReport(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    const stats = await buildWeeklyStats(req.user._id);

    // Fire-and-forget — never block HTTP response
    sendWeeklyWellnessSummary(user, stats).catch((e) =>
      console.error('[Report] Email send error:', e.message)
    );

    res.json({
      message: 'Weekly wellness report sent to ' + user.email,
      stats,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/summary — JSON only
async function summary(req, res, next) {
  try {
    const stats = await buildWeeklyStats(req.user._id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { weeklyReport, summary };
