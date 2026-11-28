'use strict';
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    pillar: {
      type: String,
      enum: ['movement', 'hydration', 'sleep', 'mindfulness', 'nutrition', 'general'],
      default: 'general',
    },
    target: { type: Number, required: true, min: 1 }, // numeric goal (e.g. 10000 steps)
    unit: { type: String, default: 'units' },         // "steps", "ml", "minutes" …
    durationDays: { type: Number, default: 7, min: 1, max: 365 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [participantSchema],
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-compute endDate before saving when not provided
challengeSchema.pre('save', function (next) {
  if (!this.endDate) {
    this.endDate = new Date(
      new Date(this.startDate).getTime() + this.durationDays * 24 * 60 * 60 * 1000
    );
  }
  next();
});

module.exports = mongoose.model('Challenge', challengeSchema);
