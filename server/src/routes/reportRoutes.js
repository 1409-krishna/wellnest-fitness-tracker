'use strict';
const express = require('express');
const { auth } = require('../middleware/auth');
const { weeklyReport, summary } = require('../controllers/reportController');

const router = express.Router();

router.use(auth);

// GET /api/reports/weekly  — build stats + send email
router.get('/weekly', weeklyReport);

// GET /api/reports/summary — JSON stats only
router.get('/summary', summary);

module.exports = router;
