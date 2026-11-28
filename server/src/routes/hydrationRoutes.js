const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getToday,
  logIntake,
  updateTarget,
  updateEntry,
  deleteEntry,
  getHistory,
  updatePreferences,
} = require('../controllers/hydrationController');

const router = express.Router();

router.use(auth);

router.get('/today', getToday);
router.post('/log', logIntake);
router.put('/target', updateTarget);
router.put('/entry/:entryId', updateEntry);
router.delete('/entry/:entryId', deleteEntry);
router.get('/history', getHistory);
router.put('/preferences', updatePreferences);

module.exports = router;
