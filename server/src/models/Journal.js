const mongoose = require('mongoose');
const { MOODS } = require('../utils/constants');

const journalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    mood: { type: String, enum: MOODS, default: 'steady' },
    note: { type: String, required: true, trim: true, maxlength: 600 },
  },
  { timestamps: true }
);

journalSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Journal', journalSchema);
