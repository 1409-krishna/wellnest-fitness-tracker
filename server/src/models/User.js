const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    preferences: {
      preferredCategories: { type: [String], default: [] },
      reminderHour: { type: Number, default: 8, min: 0, max: 23 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
