const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { list, upsert } = require('../controllers/habitController');
const { PILLARS } = require('../utils/constants');

const router = express.Router();
router.use(auth);

router.get('/', list);
router.put(
  '/',
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date is required (YYYY-MM-DD)'),
  body('pillar').isIn(PILLARS).withMessage('Choose movement, rest, hydration, or sleep'),
  body('completed').custom((value) => typeof value === 'boolean').withMessage('completed must be true or false'),
  upsert
);

module.exports = router;
