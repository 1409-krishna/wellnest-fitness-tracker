const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, activityId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
