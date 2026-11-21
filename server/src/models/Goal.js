const mongoose = require('mongoose');
const { PILLARS } = require('../utils/constants');

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    pillar: { type: String, required: true, enum: PILLARS },
    targetPerWeek: { type: Number, required: true, min: 1, max: 7 },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
