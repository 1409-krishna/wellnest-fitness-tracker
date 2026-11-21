const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { list, templates, create, toggleFavorite, remove } = require('../controllers/activityController');
const { CATEGORIES } = require('../utils/constants');

const router = express.Router();
router.use(auth);

router.get('/', list);
router.get('/templates', templates);
router.post(
  '/',
  body('name').trim().isLength({ min: 2 }).withMessage('Activity name is required'),
  body('category').isIn(CATEGORIES).withMessage('Choose a valid category'),
  create
);
router.post('/:id/favorite', toggleFavorite);
router.delete('/:id', remove);

module.exports = router;
