const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many login attempts. Try again shortly.' },
});

router.post(
  '/register',
  authLimiter,
  body('name').trim().isLength({ min: 2 }).withMessage('Name should be at least 2 characters'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password should be at least 8 characters'),
  register
);

router.post(
  '/login',
  authLimiter,
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  login
);

router.get('/me', auth, me);

module.exports = router;
