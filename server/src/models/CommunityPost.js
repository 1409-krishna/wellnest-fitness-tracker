'use strict';
const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    achievementType: {
      type: String,
      enum: ['workout', 'goal', 'hydration', 'habit', 'challenge', 'general'],
      default: 'general',
    },
    metrics: {
      value: { type: Number },
      unit: { type: String },
      label: { type: String },
    },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommunityPost', communityPostSchema);
