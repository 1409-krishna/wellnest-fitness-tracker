const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getAuthUrl,
  oauthCallback,
  createEvent,
  getEvents,
  deleteEvent,
  downloadIcs,
} = require('../controllers/calendarController');

const router = express.Router();

// OAuth callback is called by Google redirect
router.get('/callback', oauthCallback);

// Protected routes
router.use(auth);

router.get('/auth-url', getAuthUrl);
router.post('/events', createEvent);
router.get('/events', getEvents);
router.delete('/events/:id', deleteEvent);
router.get('/events/:id/ics', downloadIcs);

module.exports = router;
