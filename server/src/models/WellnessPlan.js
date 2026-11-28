const mongoose = require('mongoose');

const scheduleItemSchema = new mongoose.Schema({
  timeOfDay: {
    type: String,
    enum: ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'],
    required: true,
  },
  time: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
  pillar: {
    type: String,
    enum: ['movement', 'rest', 'hydration', 'sleep'],
    required: true,
  },
  durationMins: {
    type: Number,
    default: 15,
  },
  description: {
    type: String,
    required: true,
  },
  actionableTip: {
    type: String,
    default: '',
  },
  intensity: {
    type: String,
    enum: ['gentle', 'moderate', 'invigorating', 'restorative'],
    default: 'gentle',
  },
  applied: {
    type: Boolean,
    default: false,
  },
});

const habitFocusSchema = new mongoose.Schema({
  pillar: {
    type: String,
    enum: ['movement', 'rest', 'hydration', 'sleep'],
    required: true,
  },
  statusMessage: {
    type: String,
    required: true,
  },
  suggestedAction: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
});

const wellnessPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    targetScope: {
      startDate: { type: String },
      endDate: { type: String },
    },
    schedule: [scheduleItemSchema],
    habitFocus: [habitFocusSchema],
    hydrationAdvice: {
      type: String,
      default: '',
    },
    recoveryAdvice: {
      type: String,
      default: '',
    },
    affirmation: {
      type: String,
      default: '',
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
    generatedBy: {
      type: String,
      enum: ['gemini', 'heuristic'],
      default: 'gemini',
    },
  },
  { timestamps: true }
);

wellnessPlanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WellnessPlan', wellnessPlanSchema);
