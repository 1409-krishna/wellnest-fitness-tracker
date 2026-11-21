const mongoose = require('mongoose');
const { PILLARS } = require('../utils/constants');

const habitLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    pillar: { type: String, required: true, enum: PILLARS },
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    completed: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

habitLogSchema.index({ userId: 1, date: 1, pillar: 1 }, { unique: true });

module.exports = mongoose.model('HabitLog', habitLogSchema);
