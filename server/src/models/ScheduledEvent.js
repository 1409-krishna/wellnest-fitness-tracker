const mongoose = require('mongoose');

const scheduledEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    pillar: {
      type: String,
      enum: ['movement', 'rest', 'hydration', 'sleep'],
      default: 'movement',
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      default: null,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMins: {
      type: Number,
      default: 30,
    },
    location: {
      type: String,
      default: 'Home / Wellnest Routine',
    },
    googleEventId: {
      type: String,
      default: '',
    },
    googleHtmlLink: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
    },
    reminderMinutes: {
      type: Number,
      default: 15,
    },
  },
  { timestamps: true }
);

scheduledEventSchema.index({ userId: 1, startTime: 1 });

module.exports = mongoose.model('ScheduledEvent', scheduledEventSchema);
