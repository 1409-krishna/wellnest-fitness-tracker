const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { connectDb } = require('./src/config/db');
const User = require('./src/models/User');
const HydrationLog = require('./src/models/HydrationLog');
const HabitLog = require('./src/models/HabitLog');
const { signToken } = require('./src/utils/token');
const hydrationController = require('./src/controllers/hydrationController');

async function runTests() {
  console.log('--- STARTING PHASE 2 HYDRATION INTEGRATION TESTS ---');
  await connectDb();

  // Find or create test user
  let user = await User.findOne({ email: 'phase2_test@wellnest.com' });
  if (!user) {
    user = await User.create({
      name: 'Hydration Tester',
      email: 'phase2_test@wellnest.com',
      passwordHash: 'dummyhash',
      authProvider: 'local',
      preferences: { dailyWaterTargetMl: 2500 },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  // Clean up existing test log for today
  await HydrationLog.deleteOne({ userId: user._id, date: today });
  await HabitLog.deleteOne({ userId: user._id, date: today, pillar: 'hydration' });

  // 1. Test getToday
  let resData = null;
  let resStatus = 200;
  const mockRes = () => ({
    status: (s) => { resStatus = s; return mockRes(); },
    json: (d) => { resData = d; return d; },
  });

  await hydrationController.getToday(
    { user, query: { date: today } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 1: getToday returned status:', resStatus, 'totalMl:', resData.log.totalMl);
  if (resData.log.totalMl !== 0) throw new Error('Expected initial totalMl to be 0');

  // 2. Test logIntake (+500ml)
  await hydrationController.logIntake(
    { user, body: { amountMl: 500, note: 'Morning glass', date: today } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 2: logIntake (+500ml) totalMl:', resData.log.totalMl, 'remainingMl:', resData.summary.remainingMl);
  if (resData.log.totalMl !== 500) throw new Error('Expected totalMl to be 500');

  // 3. Test logIntake (+2000ml) -> Should meet target of 2500ml and sync HabitLog!
  await hydrationController.logIntake(
    { user, body: { amountMl: 2000, note: 'Big flask', date: today } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 3: logIntake (+2000ml) totalMl:', resData.log.totalMl, 'isTargetMet:', resData.summary.isTargetMet);
  if (!resData.summary.isTargetMet) throw new Error('Expected target to be met');

  const habit = await HabitLog.findOne({ userId: user._id, date: today, pillar: 'hydration' });
  console.log('✓ Test 4: HabitLog synced automatically for hydration pillar! completed:', habit?.completed);
  if (!habit || !habit.completed) throw new Error('HabitLog was not synced properly');

  // 5. Test updateEntry
  const entryId = resData.log.entries[0]._id;
  await hydrationController.updateEntry(
    { user, params: { entryId }, body: { amountMl: 600, note: 'Updated note', date: today } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 5: updateEntry totalMl after edit:', resData.log.totalMl);
  if (resData.log.totalMl !== 2600) throw new Error('Expected totalMl to be 2600');

  // 6. Test deleteEntry
  await hydrationController.deleteEntry(
    { user, params: { entryId }, query: { date: today } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 6: deleteEntry totalMl after deletion:', resData.log.totalMl);
  if (resData.log.totalMl !== 2000) throw new Error('Expected totalMl to be 2000');

  // 7. Test getHistory
  await hydrationController.getHistory(
    { user, query: { days: 7 } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 7: getHistory returned days:', resData.history.length, 'analytics:', resData.analytics);
  if (resData.history.length !== 7) throw new Error('Expected 7 history days');

  // 8. Test updatePreferences
  await hydrationController.updatePreferences(
    { user, body: { remindersEnabled: true, reminderIntervalMinutes: 45 } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 8: updatePreferences saved:', resData.preferences);
  if (!resData.preferences.remindersEnabled || resData.preferences.reminderIntervalMinutes !== 45) {
    throw new Error('Preferences not updated correctly');
  }

  // Cleanup
  await HydrationLog.deleteOne({ userId: user._id, date: today });
  await HabitLog.deleteOne({ userId: user._id, date: today, pillar: 'hydration' });
  await User.deleteOne({ _id: user._id });

  console.log('--- ALL PHASE 2 HYDRATION TESTS PASSED 100% ---');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
