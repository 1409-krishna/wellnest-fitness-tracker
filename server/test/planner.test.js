const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { connectDb } = require('../src/config/db');
const User = require('../src/models/User');
const WellnessPlan = require('../src/models/WellnessPlan');
const Session = require('../src/models/Session');
const HabitLog = require('../src/models/HabitLog');
const planController = require('../src/controllers/planController');

async function runTests() {
  console.log('--- STARTING PHASE 3 AI PLANNER INTEGRATION TESTS ---');
  await connectDb();

  // Test user
  let user = await User.findOne({ email: 'phase3_test@wellnest.com' });
  if (!user) {
    user = await User.create({
      name: 'AI Planner Tester',
      email: 'phase3_test@wellnest.com',
      passwordHash: 'dummyhash',
      authProvider: 'local',
      preferences: { dailyWaterTargetMl: 2500 },
    });
  }

  // Cleanup past test plans
  await WellnessPlan.deleteMany({ userId: user._id });

  let resData = null;
  let resStatus = 200;
  const mockRes = () => ({
    status: (s) => { resStatus = s; return mockRes(); },
    json: (d) => { resData = d; return d; },
  });

  // 1. Generate Daily Plan
  await planController.generatePlan(
    { user, body: { planType: 'daily', userNote: 'Stiff shoulders from work' } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 1: generatePlan returned status:', resStatus, 'title:', resData.plan.title, 'generatedBy:', resData.plan.generatedBy);
  if (!resData.plan || !resData.plan.schedule || resData.plan.schedule.length === 0) {
    throw new Error('Generated plan missing schedule');
  }

  const planId = resData.plan._id;
  const scheduleItemId = resData.plan.schedule[0]._id;

  // 2. Test getPlans
  await planController.getPlans(
    { user, query: { limit: 10 } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 2: getPlans returned count:', resData.count);
  if (resData.count < 1) throw new Error('Expected at least 1 plan');

  // 3. Test toggleSavePlan
  await planController.toggleSavePlan(
    { user, params: { id: planId } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 3: toggleSavePlan saved:', resData.isSaved);
  if (!resData.isSaved) throw new Error('Expected plan to be saved');

  // 4. Test applyPlanActivity (One-click log to routine)
  await planController.applyPlanActivity(
    { user, params: { id: planId }, body: { itemId: scheduleItemId } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 4: applyPlanActivity success! session created:', resData.session._id);
  if (!resData.session) throw new Error('Expected session to be created');

  const today = new Date().toISOString().slice(0, 10);
  const habit = await HabitLog.findOne({ userId: user._id, date: today, pillar: resData.plan.schedule[0].pillar });
  console.log('✓ Test 5: HabitLog pillar marked completed from AI plan! Completed:', habit?.completed);
  if (!habit || !habit.completed) throw new Error('Habit was not marked complete');

  // 5. Test deletePlan
  await planController.deletePlan(
    { user, params: { id: planId } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 6: deletePlan deleted plan successfully');

  // Cleanup
  await WellnessPlan.deleteMany({ userId: user._id });
  await Session.deleteMany({ userId: user._id });
  await HabitLog.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });

  console.log('--- ALL PHASE 3 AI PLANNER TESTS PASSED 100% ---');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
