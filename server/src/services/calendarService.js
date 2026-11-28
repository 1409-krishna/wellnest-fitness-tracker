const { google } = require('googleapis');

const CLIENT_ID = (process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^"|"$/g, '');
const CLIENT_SECRET = (process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^"|"$/g, '');
const REDIRECT_URI = (process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback').trim();

function getOAuth2Client() {
  if (!CLIENT_ID) {
    return null;
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function formatGoogleDate(date) {
  return new Date(date).toISOString().replace(/-|:|\.\d+/g, '');
}

/**
 * Generates Google Calendar web intent URL that opens pre-filled event in user's browser
 */
function generateGoogleCalendarWebUrl({ title, description, location, startTime, endTime }) {
  const startStr = formatGoogleDate(startTime);
  const endStr = formatGoogleDate(endTime);
  const details = `${description}\n\nScheduled via Wellnest Wellness Tracker`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
    location || 'Wellnest Routine'
  )}&dates=${startStr}/${endStr}`;
}

/**
 * Generates standard RFC 5545 iCalendar (.ics) string for Apple Calendar, Outlook, Google Calendar import
 */
function generateIcs({ title, description, location, startTime, endTime, reminderMinutes = 15 }) {
  const startStr = formatGoogleDate(startTime);
  const endStr = formatGoogleDate(endTime);
  const nowStr = formatGoogleDate(new Date());
  const uid = `wellnest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}@wellnest.com`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wellnest//Wellness Activity Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location || 'Home / Outdoors'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generates OAuth authorization URL for Google Calendar
 */
function generateAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Calendar credentials are not configured on server.');
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: String(userId),
  });
}

/**
 * Exchanges auth code for refresh and access tokens
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google Calendar credentials are not configured on server.');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Syncs event to Google Calendar API if connected, or returns web intent link
 */
async function createCalendarEvent(user, eventData) {
  const webLink = generateGoogleCalendarWebUrl(eventData);

  // If user has connected Google Calendar via OAuth2
  if (user?.googleCalendarTokens?.refreshToken && CLIENT_SECRET) {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: user.googleCalendarTokens.refreshToken,
        access_token: user.googleCalendarTokens.accessToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: eventData.title,
          description: `${eventData.description}\n\nScheduled via Wellnest Wellness Tracker`,
          location: eventData.location,
          start: { dateTime: new Date(eventData.startTime).toISOString() },
          end: { dateTime: new Date(eventData.endTime).toISOString() },
          reminders: {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: eventData.reminderMinutes || 15 }],
          },
        },
      });

      return {
        googleEventId: response.data.id,
        googleHtmlLink: response.data.htmlLink || webLink,
        synced: true,
      };
    } catch (err) {
      console.warn('[Calendar Service] API sync failed, falling back to web intent link:', err.message);
    }
  }

  // Fallback to web link & standard calendar generator
  return {
    googleEventId: '',
    googleHtmlLink: webLink,
    synced: false,
  };
}

/**
 * Deletes event from Google Calendar if connected
 */
async function deleteCalendarEvent(user, googleEventId) {
  if (!googleEventId || !user?.googleCalendarTokens?.refreshToken || !CLIENT_SECRET) {
    return false;
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: user.googleCalendarTokens.refreshToken,
      access_token: user.googleCalendarTokens.accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
    return true;
  } catch (err) {
    console.error('[Calendar Service] Failed to delete Google Calendar event:', err.message);
    return false;
  }
}

module.exports = {
  generateAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  deleteCalendarEvent,
  generateGoogleCalendarWebUrl,
  generateIcs,
};
