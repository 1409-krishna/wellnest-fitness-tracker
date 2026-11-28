const mongoose = require('mongoose');
const { CATEGORIES, INTENSITIES } = require('../utils/constants');

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, required: true, enum: CATEGORIES },
    intensity: { type: String, enum: INTENSITIES, default: 'gentle' },
    durationMins: { type: Number, min: 5, max: 180, default: 20 },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    isTemplate: { type: Boolean, default: false },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

activitySchema.index({ category: 1, name: 1 });

module.exports = mongoose.model('Activity', activitySchema);
