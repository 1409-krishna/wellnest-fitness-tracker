const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { list, create, update, remove } = require('../controllers/goalController');
const { PILLARS } = require('../utils/constants');

const router = express.Router();
router.use(auth);

router.get('/', list);
router.post(
  '/',
  body('title').trim().isLength({ min: 3 }).withMessage('Goal title is required'),
  body('pillar').isIn(PILLARS).withMessage('Choose a wellness pillar'),
  body('targetPerWeek').isInt({ min: 1, max: 7 }).withMessage('Target should be 1–7 days'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  create
);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
