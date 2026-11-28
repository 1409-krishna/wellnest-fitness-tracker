'use strict';
/**
 * communityController.js — Phase 7
 * Friends · Challenges · Community Posts · Leaderboard
 */

const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Challenge = require('../models/Challenge');
const CommunityPost = require('../models/CommunityPost');
const Session = require('../models/Session');
const HabitLog = require('../models/HabitLog');
const HydrationLog = require('../models/HydrationLog');
const mongoose = require('mongoose');

// ─────────────────────────── FRIENDS ───────────────────────────────────────────

// GET /api/community/users/search?q=name
async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    const users = await User.find({
      _id: { $ne: req.user._id },
      name: { $regex: q, $options: 'i' },
    })
      .select('_id name avatar')
      .limit(20);

    // Enrich with friendship status
    const ids = users.map((u) => u._id);
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user._id, recipient: { $in: ids } },
        { requester: { $in: ids }, recipient: req.user._id },
      ],
    });

    const statusMap = {};
    friendships.forEach((f) => {
      const other = f.requester.equals(req.user._id)
        ? f.recipient.toString()
        : f.requester.toString();
      statusMap[other] = { status: f.status, iRequested: f.requester.equals(req.user._id) };
    });

    const result = users.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      friendship: statusMap[u._id.toString()] || null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/community/friends/request  { recipientId }
async function sendFriendRequest(req, res, next) {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: 'recipientId is required' });
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    // Check existing
    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });
    if (existing) {
      return res.status(409).json({ message: 'Friend request already exists', status: existing.status });
    }

    const friendship = await Friendship.create({
      requester: req.user._id,
      recipient: recipientId,
    });
    res.status(201).json(friendship);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/community/friends/:id/accept
async function acceptFriendRequest(req, res, next) {
  try {
    const f = await Friendship.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!f) return res.status(404).json({ message: 'Friend request not found' });
    f.status = 'accepted';
    await f.save();
    res.json(f);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/community/friends/:id/reject
async function rejectFriendRequest(req, res, next) {
  try {
    const f = await Friendship.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!f) return res.status(404).json({ message: 'Friend request not found' });
    f.status = 'rejected';
    await f.save();
    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/community/friends/:id
async function removeFriend(req, res, next) {
  try {
    const uid = req.user._id;
    const deleted = await Friendship.findOneAndDelete({
      _id: req.params.id,
      $or: [{ requester: uid }, { recipient: uid }],
    });
    if (!deleted) return res.status(404).json({ message: 'Friendship not found' });
    res.json({ message: 'Friend removed' });
  } catch (err) {
    next(err);
  }
}

// GET /api/community/friends
async function getFriends(req, res, next) {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    }).populate('requester recipient', 'name avatar');

    const result = friendships.map((f) => {
      const isRequester = f.requester._id.equals(req.user._id);
      const other = isRequester ? f.recipient : f.requester;
      return {
        friendshipId: f._id,
        status: f.status,
        iRequested: isRequester,
        user: { _id: other._id, name: other.name, avatar: other.avatar },
        createdAt: f.createdAt,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────── CHALLENGES ────────────────────────────────────────

// GET /api/community/challenges
async function getChallenges(req, res, next) {
  try {
    const challenges = await Challenge.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name avatar')
      .limit(50);

    const enriched = challenges.map((c) => {
      const myEntry = c.participants.find((p) => p.userId.equals(req.user._id));
      return {
        ...c.toObject(),
        participantCount: c.participants.length,
        isJoined: !!myEntry,
        myProgress: myEntry?.progress || 0,
        myCompleted: myEntry?.completed || false,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

// POST /api/community/challenges
async function createChallenge(req, res, next) {
  try {
    const { title, description, pillar, target, unit, durationDays } = req.body;
    if (!title || !target) {
      return res.status(400).json({ message: 'title and target are required' });
    }

    const challenge = await Challenge.create({
      title,
      description,
      pillar,
      target,
      unit: unit || 'units',
      durationDays: durationDays || 7,
      createdBy: req.user._id,
      participants: [{ userId: req.user._id, joinedAt: new Date(), progress: 0 }],
    });

    await challenge.populate('createdBy', 'name avatar');
    res.status(201).json(challenge);
  } catch (err) {
    next(err);
  }
}

// POST /api/community/challenges/:id/join
async function joinChallenge(req, res, next) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
    if (!challenge.isActive) return res.status(400).json({ message: 'Challenge is no longer active' });

    const alreadyJoined = challenge.participants.some((p) => p.userId.equals(req.user._id));
    if (alreadyJoined) return res.status(409).json({ message: 'Already joined this challenge' });

    challenge.participants.push({ userId: req.user._id, joinedAt: new Date(), progress: 0 });
    await challenge.save();
    res.json({ message: 'Joined challenge', participantCount: challenge.participants.length });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/community/challenges/:id/progress  { progress }
async function updateChallengeProgress(req, res, next) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const entry = challenge.participants.find((p) => p.userId.equals(req.user._id));
    if (!entry) return res.status(403).json({ message: 'You have not joined this challenge' });

    const newProgress = Number(req.body.progress);
    if (isNaN(newProgress) || newProgress < 0) {
      return res.status(400).json({ message: 'progress must be a non-negative number' });
    }

    entry.progress = newProgress;
    entry.completed = newProgress >= challenge.target;
    await challenge.save();

    res.json({ progress: entry.progress, completed: entry.completed });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────── COMMUNITY POSTS ───────────────────────────────────

// GET /api/community/posts
async function getPosts(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const posts = await CommunityPost.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name avatar');

    const enriched = posts.map((p) => ({
      ...p.toObject(),
      likeCount: p.likes.length,
      likedByMe: p.likes.some((id) => id.equals(req.user._id)),
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
}

// POST /api/community/posts
async function createPost(req, res, next) {
  try {
    const { content, achievementType, metrics } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ message: 'Post content must be under 500 characters' });
    }

    const post = await CommunityPost.create({
      userId: req.user._id,
      content: content.trim(),
      achievementType: achievementType || 'general',
      metrics,
    });

    await post.populate('userId', 'name avatar');
    res.status(201).json({ ...post.toObject(), likeCount: 0, likedByMe: false });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/community/posts/:id/like  — toggle like
async function likePost(req, res, next) {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const idx = post.likes.findIndex((id) => id.equals(req.user._id));
    if (idx === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();

    res.json({ likeCount: post.likes.length, likedByMe: idx === -1 });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/community/posts/:id
async function deletePost(req, res, next) {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────── LEADERBOARD ───────────────────────────────────────

// GET /api/community/leaderboard?period=weekly|monthly
async function getLeaderboard(req, res, next) {
  try {
    const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const now = new Date();
    const since = new Date(now);

    if (period === 'weekly') {
      since.setDate(now.getDate() - 7);
    } else {
      since.setDate(now.getDate() - 30);
    }
    since.setHours(0, 0, 0, 0);

    const sinceDate = since.toISOString().slice(0, 10);

    // Points system:
    //  each session   → 10 pts + 1 pt/min (capped at 60)
    //  each habit     → 5 pts
    //  hydration goal → 8 pts/day goal met

    // ── Sessions ──
    const sessionAgg = await Session.aggregate([
      { $match: { date: { $gte: since } } },
      {
        $group: {
          _id: '$userId',
          pts: {
            $sum: {
              $add: [10, { $min: [{ $ifNull: ['$durationMin', 0] }, 60] }],
            },
          },
        },
      },
    ]);

    // ── Habits ──
    const habitAgg = await HabitLog.aggregate([
      { $match: { date: { $gte: sinceDate } } },
      {
        $project: {
          userId: 1,
          completedCount: {
            $size: {
              $filter: {
                input: { $objectToArray: '$pillars' },
                as: 'p',
                cond: { $eq: ['$$p.v.completed', true] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          pts: { $sum: { $multiply: ['$completedCount', 5] } },
        },
      },
    ]);

    // ── Hydration ──
    const hydAgg = await HydrationLog.aggregate([
      { $match: { date: { $gte: sinceDate } } },
      {
        $project: {
          userId: 1,
          metGoal: {
            $cond: [
              {
                $gte: [
                  { $sum: '$entries.amountMl' },
                  { $ifNull: ['$targetMl', 2000] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          pts: { $sum: { $multiply: ['$metGoal', 8] } },
        },
      },
    ]);

    // Merge points
    const pointsMap = {};
    const addPts = (arr) =>
      arr.forEach(({ _id, pts }) => {
        const key = _id.toString();
        pointsMap[key] = (pointsMap[key] || 0) + pts;
      });
    addPts(sessionAgg);
    addPts(habitAgg);
    addPts(hydAgg);

    // Top 20
    const sorted = Object.entries(pointsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    if (sorted.length === 0) return res.json([]);

    const userIds = sorted.map(([id]) => id);
    const users = await User.find({ _id: { $in: userIds } }).select('name avatar');
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const leaderboard = sorted.map(([id, pts], i) => ({
      rank: i + 1,
      userId: id,
      name: userMap[id]?.name || 'Unknown',
      avatar: userMap[id]?.avatar || '',
      points: pts,
      isMe: id === req.user._id.toString(),
    }));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getChallenges,
  createChallenge,
  joinChallenge,
  updateChallengeProgress,
  getPosts,
  createPost,
  likePost,
  deletePost,
  getLeaderboard,
};
