const Activity = require('../models/Activity');
const HabitLog = require('../models/HabitLog');
const Session = require('../models/Session');
const Goal = require('../models/Goal');
const Journal = require('../models/Journal');
const Favorite = require('../models/Favorite');
const { PILLARS, toDateKey, addDays } = require('../utils/constants');

async function sampleWeek(req, res, next) {
  try {
    const userId = req.user._id;
    const today = toDateKey(new Date());
    const activities = await Activity.find({ createdBy: null });
    if (!activities.length) {
      return res.status(400).json({ message: 'Seed the activity library first (npm run seed)' });
    }

    const byCat = (cat) => activities.filter((a) => a.category === cat);
    const pick = (arr, i) => arr[i % arr.length];

    const logs = [];
    const sessions = [];
    for (let i = 0; i < 10; i += 1) {
      const date = addDays(today, -i);
      PILLARS.forEach((pillar, idx) => {
        const skip = i === 2 && pillar === 'sleep';
        if (skip) return;
        const completed = !(i === 5 && pillar === 'rest');
        logs.push({
          userId,
          date,
          pillar,
          completed,
          notes: completed ? 'Logged from sample week' : '',
        });
      });
      const move = pick(byCat('movement').length ? byCat('movement') : activities, i);
      sessions.push({
        userId,
        activityId: move._id,
        date,
        durationMins: move.durationMins || 20,
      });
    }

    await HabitLog.deleteMany({ userId, notes: 'Logged from sample week' });
    await Session.deleteMany({ userId });
    await HabitLog.bulkWrite(
      logs.map((l) => ({
        updateOne: {
          filter: { userId, date: l.date, pillar: l.pillar },
          update: { $set: l },
          upsert: true,
        },
      }))
    );
    await Session.insertMany(sessions);

    const yoga = activities.find((a) => /yoga/i.test(a.name));
    const walk = activities.find((a) => /walk/i.test(a.name));
    if (yoga) {
      await Favorite.findOneAndUpdate(
        { userId, activityId: yoga._id },
        { userId, activityId: yoga._id },
        { upsert: true }
      );
    }
    if (walk) {
      await Favorite.findOneAndUpdate(
        { userId, activityId: walk._id },
        { userId, activityId: walk._id },
        { upsert: true }
      );
    }

    const existingGoal = await Goal.findOne({ userId, title: 'Gentle movement 4 days this week' });
    if (!existingGoal) {
      await Goal.create({
        userId,
        title: 'Gentle movement 4 days this week',
        pillar: 'movement',
        targetPerWeek: 4,
        startDate: addDays(today, -6),
        active: true,
      });
    }

    const existingNote = await Journal.findOne({ userId, note: { $regex: 'sample week' } });
    if (!existingNote) {
      await Journal.create({
        userId,
        date: today,
        mood: 'steady',
        note: 'Sample week loaded — energy felt even, and rest still needs a little space.',
      });
    }

    res.json({ message: 'Sample week ready. Open Dashboard, Progress, and Insights.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { sampleWeek };
