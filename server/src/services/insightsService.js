const Session = require('../models/Session');
const HabitLog = require('../models/HabitLog');
const Favorite = require('../models/Favorite');
const Activity = require('../models/Activity');
const { PILLARS, toDateKey, addDays, weekdayName } = require('../utils/constants');

function rangeKeys(daysBack) {
  const today = toDateKey(new Date());
  const start = addDays(today, -(daysBack - 1));
  const keys = [];
  for (let i = 0; i < daysBack; i += 1) keys.push(addDays(start, i));
  return { today, start, keys };
}

function emptyInsights() {
  return {
    preferredTypes: {
      title: 'Preferred activity types',
      detail: 'Log a few walks, yoga sessions, or rest moments so we can spot what you enjoy.',
      categories: [],
    },
    weeklyPatterns: {
      title: 'Weekly activity patterns',
      detail: 'Patterns appear after you record movement across a few weekdays.',
      byDay: [],
    },
    habitTrends: {
      title: 'Habit completion trends',
      detail: 'Mark daily habits complete to see which pillars are growing.',
      pillars: PILLARS.map((p) => ({ pillar: p, recent: 0, previous: 0, direction: 'steady' })),
    },
    consistency: {
      title: 'Routine consistency insights',
      detail: 'Consistency is about showing up gently — not perfection.',
      streak: 0,
      score: 0,
    },
    balancedSuggestions: [
      {
        text: 'Start with one gentle activity you already like — walking or a short stretch.',
        reason: 'A small first log gives the tracker something real to learn from.',
      },
    ],
  };
}

async function buildInsights(userId) {
  const recent = rangeKeys(14);
  const previousStart = addDays(recent.start, -14);
  const previousEnd = addDays(recent.start, -1);

  const [sessions, logs, prevLogs, favorites] = await Promise.all([
    Session.find({ userId, date: { $gte: recent.start, $lte: recent.today } }).populate(
      'activityId',
      'name category'
    ),
    HabitLog.find({ userId, date: { $gte: recent.start, $lte: recent.today } }),
    HabitLog.find({ userId, date: { $gte: previousStart, $lte: previousEnd } }),
    Favorite.find({ userId }).populate('activityId', 'name category'),
  ]);

  if (!sessions.length && !logs.length && !favorites.length) {
    return emptyInsights();
  }

  const categoryCount = {};
  sessions.forEach((s) => {
    const cat = s.activityId?.category;
    if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  favorites.forEach((f) => {
    const cat = f.activityId?.category;
    if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const ranked = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 3).map(([category, count]) => ({ category, count }));
  const preferredTypes = {
    title: 'Preferred activity types',
    detail: top.length
      ? `You lean toward ${top.map((t) => t.category).join(', ')}. Keep choosing what feels sustainable.`
      : 'Favorites and completed sessions will reveal the activity types you return to.',
    categories: top,
  };

  const byDayMap = {};
  sessions.forEach((s) => {
    const label = weekdayName(s.date);
    byDayMap[label] = (byDayMap[label] || 0) + 1;
  });
  const order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = order.map((label) => ({ label, count: byDayMap[label] || 0 }));
  const busiest = [...byDay].sort((a, b) => b.count - a.count)[0];
  const quiet = [...byDay].filter((d) => d.count === 0).map((d) => d.label);
  const weeklyPatterns = {
    title: 'Weekly activity patterns',
    detail: busiest?.count
      ? `Most logged sessions land on ${busiest.label}${quiet.length ? `. Quieter days: ${quiet.join(', ')}` : ''}.`
      : 'Complete a few sessions to see weekday vs weekend rhythm.',
    byDay,
  };

  const countPillar = (list, pillar) =>
    list.filter((l) => l.pillar === pillar && l.completed).length;
  const pillars = PILLARS.map((pillar) => {
    const rec = countPillar(logs, pillar);
    const prev = countPillar(prevLogs, pillar);
    let direction = 'steady';
    if (rec > prev) direction = 'up';
    if (rec < prev) direction = 'down';
    return { pillar, recent: rec, previous: prev, direction };
  });
  const rising = pillars.filter((p) => p.direction === 'up').map((p) => p.pillar);
  const falling = pillars.filter((p) => p.direction === 'down').map((p) => p.pillar);
  let trendDetail = 'Your four pillars are fairly even right now.';
  if (rising.length) trendDetail = `${rising.join(', ')} logging improved compared with the previous two weeks.`;
  if (falling.length) {
    trendDetail += ` ${falling.join(', ')} dipped — a lighter reminder, not a reset.`;
  }
  const habitTrends = {
    title: 'Habit completion trends',
    detail: trendDetail.trim(),
    pillars,
  };

  const completedByDay = {};
  logs
    .filter((l) => l.completed)
    .forEach((l) => {
      completedByDay[l.date] = (completedByDay[l.date] || 0) + 1;
    });
  let streak = 0;
  for (let i = 0; i < 14; i += 1) {
    const key = addDays(recent.today, -i);
    if ((completedByDay[key] || 0) >= 2) streak += 1;
    else break;
  }
  const balancedDays = Object.values(completedByDay).filter((n) => n >= 3).length;
  const score = Math.round((balancedDays / 14) * 100);
  const consistency = {
    title: 'Routine consistency insights',
    detail:
      streak > 0
        ? `You have a ${streak}-day streak with at least two pillars logged. ${balancedDays} of the last 14 days felt balanced (3+ pillars).`
        : 'Consistency grows when two or more pillars show up on the same day — even if they are small.',
    streak,
    score,
  };

  const suggestions = [];
  const recTotals = Object.fromEntries(pillars.map((p) => [p.pillar, p.recent]));
  const maxPillar = Math.max(...Object.values(recTotals), 0);
  if ((recTotals.rest || 0) < 4) {
    suggestions.push({
      text: 'Add a short rest or stretch template after movement days.',
      reason: 'Rest is logging less often than movement, so the week may feel one-sided.',
    });
  }
  if ((recTotals.hydration || 0) < 5) {
    suggestions.push({
      text: 'Keep a simple water check-in on the habit calendar.',
      reason: 'Hydration logs are light, and they pair well with any other activity.',
    });
  }
  if ((recTotals.sleep || 0) < 4) {
    suggestions.push({
      text: 'Log a wind-down or sleep check a few nights this week.',
      reason: 'Sleep notes help the tracker understand recovery, not just activity.',
    });
  }
  if ((recTotals.movement || 0) < 3) {
    suggestions.push({
      text: 'Try a gentle walk or yoga session on a day that already feels open.',
      reason: 'A little movement mixed with rest keeps the week balanced.',
    });
  }
  if (maxPillar >= 10 && suggestions.length === 0) {
    suggestions.push({
      text: 'You are logging often — mix a different gentle category so the week stays varied.',
      reason: 'Balance beats repeating only one type of activity.',
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      text: 'Keep rotating movement, rest, hydration, and sleep in a way that feels kind.',
      reason: 'Your recent logs already look reasonably mixed.',
    });
  }

  const catalog = await Activity.find({
    isTemplate: true,
    createdBy: null,
    category: { $in: ['rest', 'hydration', 'sleep', 'mind'] },
  }).limit(4);

  if (catalog[0] && suggestions[0]) {
    suggestions[0].activityHint = catalog[0].name;
  }

  return {
    preferredTypes,
    weeklyPatterns,
    habitTrends,
    consistency,
    balancedSuggestions: suggestions.slice(0, 3),
  };
}

module.exports = { buildInsights };
