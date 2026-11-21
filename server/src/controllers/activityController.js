const { validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const Favorite = require('../models/Favorite');

async function list(req, res, next) {
  try {
    const { category, search } = req.query;
    const filter = {
      $or: [{ createdBy: null }, { createdBy: req.user._id }],
    };
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const activities = await Activity.find(filter).sort({ isTemplate: -1, name: 1 });
    const favs = await Favorite.find({ userId: req.user._id }).select('activityId');
    const favSet = new Set(favs.map((f) => String(f.activityId)));
    res.json(
      activities.map((a) => ({
        ...a.toObject(),
        isFavorite: favSet.has(String(a._id)),
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function templates(req, res, next) {
  try {
    const items = await Activity.find({
      isTemplate: true,
      $or: [{ createdBy: null }, { createdBy: req.user._id }],
    }).sort({ category: 1, name: 1 });
    res.json(items);
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
    const activity = await Activity.create({
      name: req.body.name,
      category: req.body.category,
      intensity: req.body.intensity || 'gentle',
      durationMins: req.body.durationMins || 20,
      description: req.body.description || '',
      isTemplate: Boolean(req.body.isTemplate),
      createdBy: req.user._id,
    });
    res.status(201).json({ ...activity.toObject(), isFavorite: false });
  } catch (err) {
    next(err);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await Favorite.findOne({ userId: req.user._id, activityId: id });
    if (existing) {
      await existing.deleteOne();
      return res.json({ isFavorite: false });
    }
    await Favorite.create({ userId: req.user._id, activityId: id });
    res.json({ isFavorite: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const activity = await Activity.findOne({ _id: id, createdBy: req.user._id });
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found or built-in activities cannot be deleted' });
    }
    await activity.deleteOne();
    await Favorite.deleteMany({ activityId: id });
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, templates, create, toggleFavorite, remove };
