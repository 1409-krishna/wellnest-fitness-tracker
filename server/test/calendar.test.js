const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { connectDb } = require('../src/config/db');
const User = require('../src/models/User');
const ScheduledEvent = require('../src/models/ScheduledEvent');
const calendarController = require('../src/controllers/calendarController');

async function runTests() {
  console.log('--- STARTING PHASE 5 GOOGLE CALENDAR INTEGRATION TESTS ---');
  await connectDb();

  // Test user
  let user = await User.findOne({ email: 'phase5_calendar_test@wellnest.com' });
  if (!user) {
    user = await User.create({
      name: 'Calendar Tester',
      email: 'phase5_calendar_test@wellnest.com',
      passwordHash: 'dummyhash',
      authProvider: 'local',
    });
  }

  // Cleanup past events
  await ScheduledEvent.deleteMany({ userId: user._id });

  let resData = null;
  let resStatus = 200;
  let resHeaders = {};
  const mockRes = () => ({
    status: (s) => { resStatus = s; return mockRes(); },
    setHeader: (k, v) => { resHeaders[k] = v; },
    json: (d) => { resData = d; return d; },
    send: (d) => { resData = d; return d; },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // 1. Create Scheduled Event
  await calendarController.createEvent(
    {
      user,
      body: {
        title: 'Morning Vinyasa Flow',
        description: '30-minute restorative yoga to energize breath and spine.',
        pillar: 'movement',
        startTime: tomorrow.toISOString(),
        durationMins: 30,
        reminderMinutes: 15,
        location: 'Home Living Room',
      },
    },
    mockRes(),
    (err) => { throw err; }
  );

  console.log('✓ Test 1: createEvent returned status:', resStatus, 'event title:', resData.event?.title, 'has Google web link:', Boolean(resData.googleHtmlLink));
  if (!resData.event || !resData.googleHtmlLink) throw new Error('Expected event and Google link');
  const eventId = resData.event._id;

  // 2. Get Events
  await calendarController.getEvents(
    { user },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 2: getEvents returned count:', resData.count);
  if (resData.count !== 1) throw new Error('Expected 1 scheduled event');

  // 3. Download ICS File
  await calendarController.downloadIcs(
    { user, params: { id: eventId } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 3: downloadIcs served Content-Type:', resHeaders['Content-Type'], 'Valid RFC 5545:', resData.includes('BEGIN:VCALENDAR') && resData.includes('SUMMARY:Morning Vinyasa Flow'));
  if (!resData.includes('BEGIN:VCALENDAR') || !resData.includes('Morning Vinyasa Flow')) {
    throw new Error('ICS content was invalid');
  }

  // 4. Delete Event
  await calendarController.deleteEvent(
    { user, params: { id: eventId } },
    mockRes(),
    (err) => { throw err; }
  );
  console.log('✓ Test 4: deleteEvent cancelled event successfully');

  // Verify cancelled
  const cancelledEvent = await ScheduledEvent.findById(eventId);
  if (cancelledEvent.status !== 'cancelled') throw new Error('Expected event status to be cancelled');

  // Cleanup
  await ScheduledEvent.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });

  console.log('--- ALL PHASE 5 GOOGLE CALENDAR TESTS PASSED 100% ---');
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
