'use strict';
const express = require('express');
const { auth } = require('../middleware/auth');
const c = require('../controllers/communityController');

const router = express.Router();
router.use(auth);

// Users
router.get('/users/search', c.searchUsers);

// Friends
router.get('/friends', c.getFriends);
router.post('/friends/request', c.sendFriendRequest);
router.patch('/friends/:id/accept', c.acceptFriendRequest);
router.patch('/friends/:id/reject', c.rejectFriendRequest);
router.delete('/friends/:id', c.removeFriend);

// Challenges
router.get('/challenges', c.getChallenges);
router.post('/challenges', c.createChallenge);
router.post('/challenges/:id/join', c.joinChallenge);
router.patch('/challenges/:id/progress', c.updateChallengeProgress);

// Posts
router.get('/posts', c.getPosts);
router.post('/posts', c.createPost);
router.patch('/posts/:id/like', c.likePost);
router.delete('/posts/:id', c.deletePost);

// Leaderboard
router.get('/leaderboard', c.getLeaderboard);

module.exports = router;
