const mongoose = require('mongoose');

const hydrationEntrySchema = new mongoose.Schema({
  amountMl: {
    type: Number,
    required: true,
    min: [10, 'Minimum water intake is 10 ml'],
    max: [5000, 'Maximum single entry is 5000 ml'],
  },
  time: {
    type: String,
    required: true,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  note: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const hydrationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    targetMl: {
      type: Number,
      default: 2500,
      min: [500, 'Daily target must be at least 500 ml'],
      max: [10000, 'Daily target cannot exceed 10000 ml'],
    },
    totalMl: {
      type: Number,
      default: 0,
      min: 0,
    },
    entries: [hydrationEntrySchema],
    remindersEnabled: {
      type: Boolean,
      default: false,
    },
    reminderIntervalMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 360,
    },
  },
  { timestamps: true }
);

hydrationLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HydrationLog', hydrationLogSchema);
