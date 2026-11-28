const HydrationLog = require('../models/HydrationLog');
const HabitLog = require('../models/HabitLog');
const User = require('../models/User');

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Sync HabitLog for 'hydration' pillar when target is met or dropped below
async function syncHabitLog(userId, date, totalMl, targetMl) {
  try {
    const isCompleted = totalMl >= targetMl;
    await HabitLog.findOneAndUpdate(
      { userId, date, pillar: 'hydration' },
      {
        userId,
        date,
        pillar: 'hydration',
        completed: isCompleted,
        notes: `Logged ${totalMl} ml of ${targetMl} ml target`,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('Failed to sync hydration to HabitLog:', err.message);
  }
}

// GET /api/hydration/today?date=YYYY-MM-DD
exports.getToday = async (req, res, next) => {
  try {
    const date = req.query.date || getTodayString();
    let log = await HydrationLog.findOne({ userId: req.user._id, date });

    if (!log) {
      // Check user preferences for default target
      const user = await User.findById(req.user._id).select('preferences');
      const defaultTarget = user?.preferences?.dailyWaterTargetMl || 2500;

      log = await HydrationLog.create({
        userId: req.user._id,
        date,
        targetMl: defaultTarget,
        totalMl: 0,
        entries: [],
      });
    }

    res.json({
      success: true,
      log,
      summary: {
        totalMl: log.totalMl,
        targetMl: log.targetMl,
        remainingMl: Math.max(0, log.targetMl - log.totalMl),
        percentage: Math.min(100, Math.round((log.totalMl / log.targetMl) * 100)),
        isTargetMet: log.totalMl >= log.targetMl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/hydration/log
exports.logIntake = async (req, res, next) => {
  try {
    const { amountMl, time, note, date } = req.body;
    const targetDate = date || getTodayString();

    const parsedAmount = Number(amountMl);
    if (!parsedAmount || parsedAmount < 10 || parsedAmount > 5000) {
      return res.status(400).json({
        message: 'Please provide a valid water amount between 10 ml and 5000 ml.',
      });
    }

    let log = await HydrationLog.findOne({ userId: req.user._id, date: targetDate });

    if (!log) {
      const user = await User.findById(req.user._id).select('preferences');
      const defaultTarget = user?.preferences?.dailyWaterTargetMl || 2500;
      log = new HydrationLog({
        userId: req.user._id,
        date: targetDate,
        targetMl: defaultTarget,
        totalMl: 0,
        entries: [],
      });
    }

    const newEntry = {
      amountMl: parsedAmount,
      time: time || getCurrentTimeString(),
      note: (note || '').trim(),
      createdAt: new Date(),
    };

    log.entries.push(newEntry);
    log.totalMl = log.entries.reduce((sum, item) => sum + item.amountMl, 0);
    await log.save();

    // Auto-sync with HabitLog
    await syncHabitLog(req.user._id, targetDate, log.totalMl, log.targetMl);

    res.status(201).json({
      success: true,
      message: `Added ${parsedAmount} ml successfully.`,
      log,
      summary: {
        totalMl: log.totalMl,
        targetMl: log.targetMl,
        remainingMl: Math.max(0, log.targetMl - log.totalMl),
        percentage: Math.min(100, Math.round((log.totalMl / log.targetMl) * 100)),
        isTargetMet: log.totalMl >= log.targetMl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/hydration/target
exports.updateTarget = async (req, res, next) => {
  try {
    const { targetMl, date, setAsDefault } = req.body;
    const targetDate = date || getTodayString();
    const parsedTarget = Number(targetMl);

    if (!parsedTarget || parsedTarget < 500 || parsedTarget > 10000) {
      return res.status(400).json({
        message: 'Daily water target must be between 500 ml and 10,000 ml.',
      });
    }

    let log = await HydrationLog.findOne({ userId: req.user._id, date: targetDate });
    if (!log) {
      log = new HydrationLog({
        userId: req.user._id,
        date: targetDate,
        targetMl: parsedTarget,
        totalMl: 0,
        entries: [],
      });
    } else {
      log.targetMl = parsedTarget;
    }
    await log.save();

    if (setAsDefault) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { 'preferences.dailyWaterTargetMl': parsedTarget },
      });
    }

    // Auto-sync with HabitLog
    await syncHabitLog(req.user._id, targetDate, log.totalMl, log.targetMl);

    res.json({
      success: true,
      message: `Daily target updated to ${parsedTarget} ml.`,
      log,
      summary: {
        totalMl: log.totalMl,
        targetMl: log.targetMl,
        remainingMl: Math.max(0, log.targetMl - log.totalMl),
        percentage: Math.min(100, Math.round((log.totalMl / log.targetMl) * 100)),
        isTargetMet: log.totalMl >= log.targetMl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/hydration/entry/:entryId
exports.updateEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { amountMl, time, note, date } = req.body;
    const targetDate = date || getTodayString();

    const log = await HydrationLog.findOne({ userId: req.user._id, date: targetDate });
    if (!log) {
      return res.status(404).json({ message: 'Hydration record not found.' });
    }

    const entry = log.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Water intake entry not found.' });
    }

    if (amountMl !== undefined) {
      const parsedAmount = Number(amountMl);
      if (!parsedAmount || parsedAmount < 10 || parsedAmount > 5000) {
        return res.status(400).json({ message: 'Amount must be between 10 ml and 5000 ml.' });
      }
      entry.amountMl = parsedAmount;
    }

    if (time !== undefined) entry.time = time;
    if (note !== undefined) entry.note = note.trim();

    log.totalMl = log.entries.reduce((sum, item) => sum + item.amountMl, 0);
    await log.save();

    await syncHabitLog(req.user._id, targetDate, log.totalMl, log.targetMl);

    res.json({
      success: true,
      message: 'Entry updated successfully.',
      log,
      summary: {
        totalMl: log.totalMl,
        targetMl: log.targetMl,
        remainingMl: Math.max(0, log.targetMl - log.totalMl),
        percentage: Math.min(100, Math.round((log.totalMl / log.targetMl) * 100)),
        isTargetMet: log.totalMl >= log.targetMl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/hydration/entry/:entryId
exports.deleteEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const targetDate = req.query.date || req.body.date || getTodayString();

    const log = await HydrationLog.findOne({ userId: req.user._id, date: targetDate });
    if (!log) {
      return res.status(404).json({ message: 'Hydration record not found.' });
    }

    const entry = log.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Water intake entry not found.' });
    }

    log.entries.pull({ _id: entryId });
    log.totalMl = log.entries.reduce((sum, item) => sum + item.amountMl, 0);
    await log.save();

    await syncHabitLog(req.user._id, targetDate, log.totalMl, log.targetMl);

    res.json({
      success: true,
      message: 'Entry removed successfully.',
      log,
      summary: {
        totalMl: log.totalMl,
        targetMl: log.targetMl,
        remainingMl: Math.max(0, log.targetMl - log.totalMl),
        percentage: Math.min(100, Math.round((log.totalMl / log.targetMl) * 100)),
        isTargetMet: log.totalMl >= log.targetMl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/hydration/history?days=7|14|30
exports.getHistory = async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(3, parseInt(req.query.days, 10) || 7));

    // Generate date array for requested span ending today
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const logs = await HydrationLog.find({
      userId: req.user._id,
      date: { $in: dates },
    }).lean();

    const logMap = new Map(logs.map((l) => [l.date, l]));

    // Fetch user default target
    const user = await User.findById(req.user._id).select('preferences');
    const defaultTarget = user?.preferences?.dailyWaterTargetMl || 2500;

    const history = dates.map((date) => {
      const existing = logMap.get(date);
      const targetMl = existing?.targetMl || defaultTarget;
      const totalMl = existing?.totalMl || 0;
      const percentage = Math.min(100, Math.round((totalMl / targetMl) * 100));
      return {
        date,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        shortDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalMl,
        targetMl,
        percentage,
        isTargetMet: totalMl >= targetMl,
        entriesCount: existing?.entries?.length || 0,
      };
    });

    const loggedDays = history.filter((h) => h.totalMl > 0);
    const avgIntake = loggedDays.length
      ? Math.round(loggedDays.reduce((s, h) => s + h.totalMl, 0) / loggedDays.length)
      : 0;
    const targetMetDays = history.filter((h) => h.isTargetMet).length;

    // Calculate current streak of met targets
    let currentStreak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].isTargetMet) {
        currentStreak++;
      } else if (history[i].date === getTodayString()) {
        // Today is still in progress, continue to check yesterday's streak
        continue;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      days,
      history,
      analytics: {
        averageDailyMl: avgIntake,
        targetMetDays,
        completionRate: Math.round((targetMetDays / days) * 100),
        currentStreakDays: currentStreak,
        totalMlLogged: history.reduce((s, h) => s + h.totalMl, 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/hydration/preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const { remindersEnabled, reminderIntervalMinutes } = req.body;

    const date = getTodayString();
    let log = await HydrationLog.findOne({ userId: req.user._id, date });
    if (!log) {
      log = new HydrationLog({
        userId: req.user._id,
        date,
        totalMl: 0,
        entries: [],
      });
    }

    if (remindersEnabled !== undefined) log.remindersEnabled = Boolean(remindersEnabled);
    if (reminderIntervalMinutes !== undefined) {
      log.reminderIntervalMinutes = Math.max(15, Math.min(360, Number(reminderIntervalMinutes)));
    }

    await log.save();

    res.json({
      success: true,
      message: 'Hydration reminder preferences saved.',
      preferences: {
        remindersEnabled: log.remindersEnabled,
        reminderIntervalMinutes: log.reminderIntervalMinutes,
      },
    });
  } catch (err) {
    next(err);
  }
};
