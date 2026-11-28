const ScheduledEvent = require('../models/ScheduledEvent');
const User = require('../models/User');
const calendarService = require('../services/calendarService');

// GET /api/calendar/auth-url
exports.getAuthUrl = async (req, res, next) => {
  try {
    const url = calendarService.generateAuthUrl(req.user._id);
    res.json({ success: true, url });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Google Calendar OAuth is not configured.',
    });
  }
};

// GET /api/calendar/callback
exports.oauthCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Missing authorization code.' });
    }

    const tokens = await calendarService.exchangeCodeForTokens(code);

    const userId = state || req.user?._id;
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        googleCalendarTokens: {
          accessToken: tokens.access_token || '',
          refreshToken: tokens.refresh_token || '',
          expiryDate: tokens.expiry_date || 0,
          isConnected: true,
        },
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/activities?calendar=connected`);
  } catch (err) {
    next(err);
  }
};

// POST /api/calendar/events
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      pillar,
      activityId,
      startTime,
      durationMins = 30,
      location,
      reminderMinutes = 15,
    } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({ message: 'Title and start time are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + Number(durationMins) * 60 * 1000);

    const eventPayload = {
      title: title.trim(),
      description: (description || '').trim(),
      pillar: pillar || 'movement',
      location: location || 'Home / Outdoors',
      startTime: start,
      endTime: end,
      durationMins: Number(durationMins),
      reminderMinutes: Number(reminderMinutes),
    };

    // Sync via Google Calendar API or direct web intent link
    const syncResult = await calendarService.createCalendarEvent(req.user, eventPayload);

    const eventDoc = await ScheduledEvent.create({
      userId: req.user._id,
      activityId: activityId || null,
      googleEventId: syncResult.googleEventId,
      googleHtmlLink: syncResult.googleHtmlLink,
      ...eventPayload,
    });

    res.status(201).json({
      success: true,
      message: 'Event scheduled successfully.',
      event: eventDoc,
      googleHtmlLink: syncResult.googleHtmlLink,
      icsDownloadUrl: `/api/calendar/events/${eventDoc._id}/ics`,
      syncedToGoogle: syncResult.synced,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/calendar/events
exports.getEvents = async (req, res, next) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const events = await ScheduledEvent.find({
      userId: req.user._id,
      startTime: { $gte: now },
      status: { $ne: 'cancelled' },
    })
      .sort({ startTime: 1 })
      .limit(20)
      .populate('activityId', 'name category intensity')
      .lean();

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/calendar/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await ScheduledEvent.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!event) {
      return res.status(404).json({ message: 'Scheduled event not found.' });
    }

    if (event.googleEventId) {
      await calendarService.deleteCalendarEvent(req.user, event.googleEventId);
    }

    event.status = 'cancelled';
    await event.save();

    res.json({
      success: true,
      message: 'Scheduled event cancelled.',
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/calendar/events/:id/ics
exports.downloadIcs = async (req, res, next) => {
  try {
    const event = await ScheduledEvent.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const icsContent = calendarService.generateIcs({
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      reminderMinutes: event.reminderMinutes,
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="wellnest-${event._id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    next(err);
  }
};
