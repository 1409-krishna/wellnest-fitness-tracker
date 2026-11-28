'use strict';
/**
 * email.test.js — Phase 6 integration tests
 * Tests email service template generation (no real SMTP needed).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  sendWelcomeEmail,
  sendGoalAchievedEmail,
  sendWeeklyWellnessSummary,
  sendHydrationReminderEmail,
} = require('../src/services/emailService');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n📧 Phase 6 — Email Service Tests\n');

  const fakeUser = { _id: 'test123', name: 'Krishna', email: 'test@example.com' };
  const fakeGoal = { _id: 'goal1', title: 'Run 3x/week', targetPerWeek: 3 };
  const fakeStats = {
    activeSessions: 5,
    totalMinutes: 180,
    habitsCompleted: 14,
    totalHabits: 21,
    avgHydrationMl: 1800,
    goalsOnTrack: 2,
    totalGoals: 3,
    topActivity: 'Running',
    affirmation: 'Keep going, you are amazing!',
  };

  // Test 1: sendWelcomeEmail (dev console fallback)
  try {
    const result = await sendWelcomeEmail(fakeUser);
    assert(result !== undefined, 'sendWelcomeEmail returns a result');
  } catch (err) {
    assert(false, `sendWelcomeEmail threw: ${err.message}`);
  }

  // Test 2: sendGoalAchievedEmail
  try {
    const result = await sendGoalAchievedEmail(fakeUser, fakeGoal);
    assert(result !== undefined, 'sendGoalAchievedEmail returns a result');
  } catch (err) {
    assert(false, `sendGoalAchievedEmail threw: ${err.message}`);
  }

  // Test 3: sendWeeklyWellnessSummary
  try {
    const result = await sendWeeklyWellnessSummary(fakeUser, fakeStats);
    assert(result !== undefined, 'sendWeeklyWellnessSummary returns a result');
  } catch (err) {
    assert(false, `sendWeeklyWellnessSummary threw: ${err.message}`);
  }

  // Test 4: sendHydrationReminderEmail
  try {
    const result = await sendHydrationReminderEmail(fakeUser, 500);
    assert(result !== undefined, 'sendHydrationReminderEmail returns a result');
  } catch (err) {
    assert(false, `sendHydrationReminderEmail threw: ${err.message}`);
  }

  // Test 5: Module exports
  assert(typeof sendWelcomeEmail === 'function', 'sendWelcomeEmail is a function');
  assert(typeof sendGoalAchievedEmail === 'function', 'sendGoalAchievedEmail is a function');
  assert(typeof sendWeeklyWellnessSummary === 'function', 'sendWeeklyWellnessSummary is a function');
  assert(typeof sendHydrationReminderEmail === 'function', 'sendHydrationReminderEmail is a function');

  console.log(`\n📧 Email tests: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

runTests().then((ok) => process.exit(ok ? 0 : 1));
