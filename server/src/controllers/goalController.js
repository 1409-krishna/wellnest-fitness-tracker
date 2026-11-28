const { validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const HabitLog = require('../models/HabitLog');
const User = require('../models/User');
const { isRestrictedGoal, addDays } = require('../utils/constants');
const { sendGoalAchievedEmail } = require('../services/emailService');

async function list(req, res, next) {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const weekStart = req.query.weekStart;
    if (!weekStart) {
      return res.json(goals.map((g) => ({ ...g.toObject(), actualThisWeek: 0 })));
    }
    const weekEnd = addDays(weekStart, 6);
    const logs = await HabitLog.find({
      userId: req.user._id,
      completed: true,
      date: { $gte: weekStart, $lte: weekEnd },
    });
    const withProgress = goals.map((g) => {
      const actualThisWeek = logs.filter((l) => l.pillar === g.pillar).length;
      return { ...g.toObject(), actualThisWeek };
    });
    res.json(withProgress);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    if (isRestrictedGoal(req.body.title)) {
      return res.status(400).json({
        message:
          'Goals stay flexible and wellness-focused. Avoid weight, calorie, or appearance targets.',
      });
    }
    const goal = await Goal.create({
      userId: req.user._id,
      title: req.body.title,
      pillar: req.body.pillar,
      targetPerWeek: req.body.targetPerWeek,
      startDate: req.body.startDate,
      endDate: req.body.endDate || null,
      active: true,
    });
    res.status(201).json({ ...goal.toObject(), actualThisWeek: 0 });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { title, pillar, targetPerWeek, endDate, active } = req.body;
    if (title && isRestrictedGoal(title)) {
      return res.status(400).json({
        message:
          'Goals stay flexible and wellness-focused. Avoid weight, calorie, or appearance targets.',
      });
    }
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (pillar !== undefined) updates.pillar = pillar;
    if (targetPerWeek !== undefined) updates.targetPerWeek = targetPerWeek;
    if (endDate !== undefined) updates.endDate = endDate;
    if (active !== undefined) updates.active = Boolean(active);

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Fire goal-achieved email if newly completed
    if (updates.active === false || (goal.actualThisWeek !== undefined && goal.actualThisWeek >= goal.targetPerWeek)) {
      const user = await User.findById(req.user._id).select('name email');
      if (user) {
        sendGoalAchievedEmail(user, goal).catch((e) =>
          console.error('[Goal] Achievement email error:', e.message)
        );
      }
    }
    res.json(goal);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Goal removed' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
