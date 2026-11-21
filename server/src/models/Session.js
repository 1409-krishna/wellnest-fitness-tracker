const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
    date: { type: String, required: true },
    durationMins: { type: Number, min: 5, max: 180, default: 20 },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Session', sessionSchema);
