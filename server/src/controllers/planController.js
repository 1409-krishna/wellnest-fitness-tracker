const WellnessPlan = require('../models/WellnessPlan');
const Session = require('../models/Session');
const HabitLog = require('../models/HabitLog');
const Activity = require('../models/Activity');
const { generateWellnessPlan } = require('../services/geminiService');

// POST /api/plans/generate
exports.generatePlan = async (req, res, next) => {
  try {
    const { planType, userNote, focusPillar } = req.body;
    const type = planType === 'weekly' ? 'weekly' : 'daily';

    const planData = await generateWellnessPlan(req.user, type, { userNote, focusPillar });

    const newPlan = await WellnessPlan.create({
      userId: req.user._id,
      planType: type,
      ...planData,
    });

    res.status(201).json({
      success: true,
      message: `${type === 'weekly' ? 'Weekly Blueprint' : 'Daily Wellness Plan'} generated successfully.`,
      plan: newPlan,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/plans
exports.getPlans = async (req, res, next) => {
  try {
    const { savedOnly, limit } = req.query;
    const filter = { userId: req.user._id };

    if (savedOnly === 'true') {
      filter.isSaved = true;
    }

    const maxItems = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const plans = await WellnessPlan.find(filter)
      .sort({ createdAt: -1 })
      .limit(maxItems)
      .lean();

    res.json({
      success: true,
      count: plans.length,
      plans,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/plans/:id
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await WellnessPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Wellness plan not found.' });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/plans/:id/save
exports.toggleSavePlan = async (req, res, next) => {
  try {
    const plan = await WellnessPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Wellness plan not found.' });
    }

    plan.isSaved = !plan.isSaved;
    await plan.save();

    res.json({
      success: true,
      isSaved: plan.isSaved,
      message: plan.isSaved ? 'Plan bookmarked to your saved blueprints.' : 'Plan removed from saved blueprints.',
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/plans/:id
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await WellnessPlan.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Wellness plan not found.' });
    }

    res.json({
      success: true,
      message: 'Plan removed from history.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/plans/:id/apply-item
// Allows one-click execution of an activity directly from the AI plan!
exports.applyPlanActivity = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    const plan = await WellnessPlan.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Wellness plan not found.' });
    }

    const item = plan.schedule.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Activity schedule item not found.' });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Find or create matching activity in catalog
    let activity = await Activity.findOne({ name: new RegExp(`^${item.title}$`, 'i') });
    if (!activity) {
      activity = await Activity.create({
        name: item.title,
        category: item.pillar,
        intensity: item.intensity || 'gentle',
        defaultDurationMins: item.durationMins || 20,
        description: item.description,
        createdBy: req.user._id,
      });
    }

    // Create completed Session
    const session = await Session.create({
      userId: req.user._id,
      activityId: activity._id,
      durationMins: item.durationMins || 20,
      date: today,
      notes: `Suggested by AI Wellness Planner: ${item.actionableTip || ''}`,
    });

    // Mark corresponding habit pillar complete for today
    await HabitLog.findOneAndUpdate(
      { userId: req.user._id, date: today, pillar: item.pillar },
      {
        userId: req.user._id,
        date: today,
        pillar: item.pillar,
        completed: true,
        activityId: activity._id,
        notes: `Completed AI recommended activity: ${item.title}`,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    item.applied = true;
    await plan.save();

    res.status(201).json({
      success: true,
      message: `"${item.title}" successfully logged into your daily routine!`,
      session,
      plan,
    });
  } catch (err) {
    next(err);
  }
};
