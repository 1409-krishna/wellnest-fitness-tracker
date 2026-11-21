const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  weekly,
  listSessions,
  createSession,
  listJournals,
  createJournal,
} = require('../controllers/progressController');
const { MOODS } = require('../utils/constants');

const router = express.Router();
router.use(auth);

router.get('/weekly', weekly);
router.get('/sessions', listSessions);
router.post(
  '/sessions',
  body('activityId').notEmpty().withMessage('Activity is required'),
  body('date').notEmpty().withMessage('Date is required'),
  createSession
);
router.get('/journals', listJournals);
router.post(
  '/journals',
  body('date').notEmpty().withMessage('Date is required'),
  body('note').trim().isLength({ min: 3 }).withMessage('Write a short reflection'),
  body('mood').optional().isIn(MOODS),
  createJournal
);

module.exports = router;
