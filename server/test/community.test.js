'use strict';
/**
 * community.test.js — Phase 7 integration tests
 * Tests against live MongoDB Atlas: Friendship, Challenge, CommunityPost CRUD + Leaderboard.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDb } = require('../src/config/db');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Friendship = require('../src/models/Friendship');
const Challenge = require('../src/models/Challenge');
const CommunityPost = require('../src/models/CommunityPost');

let passed = 0;
let failed = 0;
let userA, userB;

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
  console.log('\n👥 Phase 7 — Community Integration Tests\n');

  await connectDb();
  console.log('  Connected to MongoDB Atlas\n');

  const suffix = Date.now();

  // Create two test users
  userA = await User.create({
    name: 'CommunityTestA_' + suffix,
    email: `community_a_${suffix}@test.com`,
    passwordHash: 'dummy',
    authProvider: 'local',
  });
  userB = await User.create({
    name: 'CommunityTestB_' + suffix,
    email: `community_b_${suffix}@test.com`,
    passwordHash: 'dummy',
    authProvider: 'local',
  });

  // ─── Test 1: Create friendship ──────────────────────────────────────────────
  const friendship = await Friendship.create({
    requester: userA._id,
    recipient: userB._id,
  });
  assert(friendship.status === 'pending', 'Friendship created with pending status');

  // ─── Test 2: Accept friendship ──────────────────────────────────────────────
  friendship.status = 'accepted';
  await friendship.save();
  const reloaded = await Friendship.findById(friendship._id);
  assert(reloaded.status === 'accepted', 'Friendship accepted successfully');

  // ─── Test 3: Duplicate friendship prevented ─────────────────────────────────
  let dupError = false;
  try {
    await Friendship.create({ requester: userA._id, recipient: userB._id });
  } catch (err) {
    dupError = err.code === 11000;
  }
  assert(dupError, 'Duplicate friendship request prevented (unique index)');

  // ─── Test 4: Create challenge ───────────────────────────────────────────────
  const challenge = await Challenge.create({
    title: '7-Day Hydration Challenge_' + suffix,
    description: 'Drink 2L water every day for 7 days',
    pillar: 'hydration',
    target: 14000,
    unit: 'ml',
    durationDays: 7,
    createdBy: userA._id,
    participants: [{ userId: userA._id }],
  });
  assert(challenge.endDate instanceof Date, 'Challenge endDate auto-computed');
  assert(challenge.participants.length === 1, 'Challenge has 1 participant (creator)');

  // ─── Test 5: Join challenge ─────────────────────────────────────────────────
  challenge.participants.push({ userId: userB._id });
  await challenge.save();
  const reloadedCh = await Challenge.findById(challenge._id);
  assert(reloadedCh.participants.length === 2, 'Second user joined challenge');

  // ─── Test 6: Update challenge progress ──────────────────────────────────────
  const pEntry = reloadedCh.participants.find((p) => p.userId.equals(userB._id));
  pEntry.progress = 7000;
  pEntry.completed = pEntry.progress >= reloadedCh.target;
  await reloadedCh.save();
  const reloadedCh2 = await Challenge.findById(challenge._id);
  const pB = reloadedCh2.participants.find((p) => p.userId.equals(userB._id));
  assert(pB.progress === 7000, 'Challenge progress updated to 7000');
  assert(pB.completed === false, 'Challenge not yet completed (7000 < 14000)');

  // ─── Test 7: Create community post ─────────────────────────────────────────
  const post = await CommunityPost.create({
    userId: userA._id,
    content: 'Just completed my first 5K run! 🏃',
    achievementType: 'workout',
  });
  assert(post.content.includes('5K'), 'Community post created');
  assert(post.likes.length === 0, 'Post starts with 0 likes');

  // ─── Test 8: Like post ─────────────────────────────────────────────────────
  post.likes.push(userB._id);
  await post.save();
  const reloadedPost = await CommunityPost.findById(post._id);
  assert(reloadedPost.likes.length === 1, 'Post liked by userB');

  // ─── Test 9: Unlike post (toggle) ──────────────────────────────────────────
  const idx = reloadedPost.likes.findIndex((id) => id.equals(userB._id));
  reloadedPost.likes.splice(idx, 1);
  await reloadedPost.save();
  const reloadedPost2 = await CommunityPost.findById(post._id);
  assert(reloadedPost2.likes.length === 0, 'Post unliked (toggle works)');

  // ─── Test 10: Delete post ──────────────────────────────────────────────────
  await CommunityPost.findByIdAndDelete(post._id);
  const deleted = await CommunityPost.findById(post._id);
  assert(deleted === null, 'Community post deleted');

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  console.log('\n  🧹 Cleaning up test data...');
  await Friendship.deleteMany({
    $or: [{ requester: userA._id }, { requester: userB._id }],
  });
  await Challenge.deleteMany({ createdBy: userA._id });
  await CommunityPost.deleteMany({ userId: userA._id });
  await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });

  await mongoose.disconnect();

  console.log(`\n👥 Community tests: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

runTests()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Test error:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
