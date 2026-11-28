const express = require('express');
const { auth } = require('../middleware/auth');
const {
  generatePlan,
  getPlans,
  getPlanById,
  toggleSavePlan,
  deletePlan,
  applyPlanActivity,
} = require('../controllers/planController');

const router = express.Router();

router.use(auth);

router.post('/generate', generatePlan);
router.get('/', getPlans);
router.get('/:id', getPlanById);
router.put('/:id/save', toggleSavePlan);
router.delete('/:id', deletePlan);
router.post('/:id/apply-item', applyPlanActivity);

module.exports = router;
