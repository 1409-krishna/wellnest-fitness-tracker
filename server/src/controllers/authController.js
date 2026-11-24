const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken, publicUser } = require('../utils/token');

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      authProvider: 'local',
    });
    const token = signToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'This account was created with Google. Please use Continue with Google.',
      });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function googleLogin(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
      ? process.env.GOOGLE_CLIENT_ID.trim().replace(/^["']|["']$/g, '')
      : null;
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID is missing in server environment.');
      return res.status(500).json({
        message: 'Backend server missing GOOGLE_CLIENT_ID. Please restart the backend server (npm run dev in /server).',
      });
    }

    const googleClient = new OAuth2Client(clientId);

    // Verify Google ID Token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({
        message: `Google verification failed: ${verifyErr.message}`,
        error: verifyErr.message,
      });
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Unable to retrieve email from Google profile' });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ message: 'Google email address is not verified' });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Wellness Friend';
    const avatar = payload.picture || '';

    // Check if user exists by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // Existing user: Link googleId and avatar if not present
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // New user: Create account
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        avatar,
      });
    }

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Error in googleLogin:', err);
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function updateMe(req, res, next) {
  try {
    const { name, reminderHour, preferredCategories } = req.body;
    const updates = {};
    if (name && typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (reminderHour !== undefined) {
      const hour = Number(reminderHour);
      if (hour >= 0 && hour <= 23) {
        updates['preferences.reminderHour'] = hour;
      }
    }
    if (Array.isArray(preferredCategories)) {
      updates['preferences.preferredCategories'] = preferredCategories;
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, googleLogin, me, updateMe };
