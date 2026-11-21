const express = require('express');
const { auth } = require('../middleware/auth');
const { getInsights, askCoach } = require('../controllers/insightsController');
const { sampleWeek } = require('../controllers/demoController');

const router = express.Router();
router.use(auth);

router.get('/', getInsights);
router.post('/coach', askCoach);
router.post('/sample-week', sampleWeek);

module.exports = router;
