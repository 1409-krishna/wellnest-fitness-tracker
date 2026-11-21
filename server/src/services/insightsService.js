const Session = require('../models/Session');
const HabitLog = require('../models/HabitLog');
const Favorite = require('../models/Favorite');
const Activity = require('../models/Activity');
const User = require('../models/User');
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
      'name category durationMins'
    ),
    HabitLog.find({ userId, date: { $gte: recent.start, $lte: recent.today } }),
    HabitLog.find({ userId, date: { $gte: previousStart, $lte: previousEnd } }),
    Favorite.find({ userId }).populate('activityId', 'name category durationMins'),
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

  const pillars = PILLARS.map((pillar) => {
    const recentDone = logs.filter((l) => l.pillar === pillar && l.completed).length;
    const prevDone = prevLogs.filter((l) => l.pillar === pillar && l.completed).length;
    let direction = 'steady';
    if (recentDone > prevDone + 1) direction = 'up';
    else if (recentDone < prevDone - 1) direction = 'down';
    return { pillar, recent: recentDone, previous: prevDone, direction };
  });
  const habitTrends = {
    title: 'Habit completion trends',
    detail: 'Comparing the last 14 days to the prior fortnight.',
    pillars,
  };

  // Streak & Consistency Score
  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const checkDate = addDays(recent.today, -i);
    const anyDone = logs.some((l) => l.date === checkDate && l.completed);
    if (anyDone) streak += 1;
    else break;
  }
  const totalPossibleHabits = 14 * 4;
  const completedHabits = logs.filter((l) => l.completed).length;
  const score = Math.min(100, Math.round((completedHabits / totalPossibleHabits) * 100));

  const consistency = {
    title: 'Routine consistency insights',
    detail:
      streak > 2
        ? `${streak} consecutive active days! Celebrate small, steady routines.`
        : 'Aim for gentle progress. Showing up a few days a week builds lasting rhythm.',
    streak,
    score,
  };

  // Balanced Suggestions
  const suggestions = [];
  const recTotals = Object.fromEntries(pillars.map((p) => [p.pillar, p.recent]));
  const maxPillar = Math.max(...Object.values(recTotals), 0);

  const catalog = await Activity.find({
    createdBy: null,
  });

  const findCat = (cat) => catalog.find((a) => a.category === cat) || catalog[0];

  if ((recTotals.rest || 0) < 4) {
    const a = findCat('rest');
    suggestions.push({
      text: 'Add a short rest or stretch template after movement days.',
      reason: 'Rest is logging less often than movement, so the week may feel one-sided.',
      activityHint: a?.name || 'Restorative Rest',
      activityId: a?._id,
      category: 'rest',
      durationMins: a?.durationMins || 15,
    });
  }
  if ((recTotals.hydration || 0) < 5) {
    const a = findCat('hydration');
    suggestions.push({
      text: 'Keep a simple water check-in on the habit calendar.',
      reason: 'Hydration logs are light, and they pair well with any other activity.',
      activityHint: a?.name || 'Water Check-in',
      activityId: a?._id,
      category: 'hydration',
      durationMins: a?.durationMins || 5,
    });
  }
  if ((recTotals.sleep || 0) < 4) {
    const a = findCat('sleep');
    suggestions.push({
      text: 'Log a wind-down or sleep check a few nights this week.',
      reason: 'Sleep notes help the tracker understand recovery, not just activity.',
      activityHint: a?.name || 'Evening Wind-down',
      activityId: a?._id,
      category: 'sleep',
      durationMins: a?.durationMins || 20,
    });
  }
  if ((recTotals.movement || 0) < 3) {
    const a = findCat('movement');
    suggestions.push({
      text: 'Try a gentle walk or yoga session on a day that already feels open.',
      reason: 'A little movement mixed with rest keeps the week balanced.',
      activityHint: a?.name || 'Morning Walk',
      activityId: a?._id,
      category: 'movement',
      durationMins: a?.durationMins || 25,
    });
  }
  if (maxPillar >= 10 && suggestions.length === 0) {
    const a = findCat('outdoor') || catalog[0];
    suggestions.push({
      text: 'You are logging often — mix a different gentle category so the week stays varied.',
      reason: 'Balance beats repeating only one type of activity.',
      activityHint: a?.name,
      activityId: a?._id,
      category: a?.category || 'outdoor',
      durationMins: a?.durationMins || 20,
    });
  }
  if (!suggestions.length) {
    const a = catalog[0];
    suggestions.push({
      text: 'Keep rotating movement, rest, hydration, and sleep in a way that feels kind.',
      reason: 'Your recent logs already look reasonably mixed.',
      activityHint: a?.name,
      activityId: a?._id,
      category: a?.category || 'movement',
      durationMins: a?.durationMins || 20,
    });
  }

  return {
    preferredTypes,
    weeklyPatterns,
    habitTrends,
    consistency,
    balancedSuggestions: suggestions.slice(0, 3),
  };
}

// Interactive AI Wellness Coach Assistant Logic
async function coachChat(userId, userQuery) {
  const query = (userQuery || '').toLowerCase().trim();
  const user = await User.findById(userId).select('name');
  const firstName = user?.name ? user.name.split(' ')[0] : 'friend';

  const today = toDateKey(new Date());
  const weekStart = addDays(today, -6);

  const [todayLogs, allCatalog] = await Promise.all([
    HabitLog.find({ userId, date: today, completed: true }),
    Activity.find({ createdBy: null }),
  ]);

  const completedToday = todayLogs.map((l) => l.pillar);
  const pendingToday = PILLARS.filter((p) => !completedToday.includes(p));

  // Determine intent & response
  if (query.includes('sleep') || query.includes('so nahi') || query.includes('insomnia') || query.includes('night') || query.includes('tired')) {
    const sleepAct = allCatalog.find((a) => a.category === 'sleep') || allCatalog[0];
    return {
      reply: `Hi ${firstName}, good sleep starts 1–2 hours before bedtime. Dim harsh overhead lights, put screens on night-shift mode, and try a 10-minute restorative wind-down stretch instead of doomscrolling. Your body needs wind-down signals.`,
      pillar: 'sleep',
      tip: 'Try disconnecting 30 minutes before sleep and hydrate earlier in the evening.',
      suggestedActivity: sleepAct ? { id: sleepAct._id, name: sleepAct.name, durationMins: sleepAct.durationMins } : null,
    };
  }

  if (query.includes('water') || query.includes('hydration') || query.includes('pani') || query.includes('drink')) {
    const hydAct = allCatalog.find((a) => a.category === 'hydration') || allCatalog[0];
    return {
      reply: `Drinking enough water should feel natural, not like a chore, ${firstName}. Keep a glass or reusable bottle at your workspace desk and take gentle sips throughout the day. Room temperature water or herbal teas count too!`,
      pillar: 'hydration',
      tip: 'Pair a glass of water with existing habits (e.g. 1 glass right after waking up).',
      suggestedActivity: hydAct ? { id: hydAct._id, name: hydAct.name, durationMins: hydAct.durationMins } : null,
    };
  }

  if (query.includes('movement') || query.includes('walk') || query.includes('exercise') || query.includes('yoga') || query.includes('workout') || query.includes('khel')) {
    const moveAct = allCatalog.find((a) => a.category === 'movement') || allCatalog[0];
    return {
      reply: `Movement in Wellnest is about feeling energized, never about punishing your body, ${firstName}. Even a gentle 15-minute walk outside or a light morning stretch increases circulation and lifts your mood significantly!`,
      pillar: 'movement',
      tip: 'Choose activities that bring you calm and joy, not exhaustion.',
      suggestedActivity: moveAct ? { id: moveAct._id, name: moveAct.name, durationMins: moveAct.durationMins } : null,
    };
  }

  if (query.includes('rest') || query.includes('stress') || query.includes('anxiety') || query.includes('break') || query.includes('relax') || query.includes('thak')) {
    const restAct = allCatalog.find((a) => a.category === 'rest') || allCatalog[0];
    return {
      reply: `Rest is an active pillar of wellness, not wasted time, ${firstName}. When you feel mental overload, try 5 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold) or simply lie back with eyes closed.`,
      pillar: 'rest',
      tip: 'Permit yourself to pause without feeling guilty.',
      suggestedActivity: restAct ? { id: restAct._id, name: restAct.name, durationMins: restAct.durationMins } : null,
    };
  }

  if (query.includes('pillar') || query.includes('today') || query.includes('status') || query.includes('kya karu') || query.includes('routine')) {
    if (pendingToday.length === 0) {
      return {
        reply: `Wonderful job, ${firstName}! You have already completed all 4 pillars (Movement, Rest, Hydration, Sleep) for today! Take a moment to appreciate your consistency and rest easy.`,
        tip: 'Consistency over intensity.',
      };
    }
    const nextPillar = pendingToday[0];
    const recAct = allCatalog.find((a) => a.category === nextPillar) || allCatalog[0];
    return {
      reply: `Looking at your day, ${firstName}, you have logged ${completedToday.length}/4 pillars today. You still have '${nextPillar}' open. How about checking in on that gently?`,
      pillar: nextPillar,
      tip: `Focusing on ${nextPillar} will complete your daily balance.`,
      suggestedActivity: recAct ? { id: recAct._id, name: recAct.name, durationMins: recAct.durationMins } : null,
    };
  }

  // Default mindful coach response
  return {
    reply: `Remember ${firstName}, the goal of Wellnest is showing up kindly for yourself across Movement, Rest, Hydration, and Sleep. Small steps done consistently will always beat extreme bursts. What area would you like to focus on today?`,
    tip: 'Ask me about sleep routines, hydration tips, gentle movement, or your daily balance!',
  };
}

module.exports = { buildInsights, coachChat };
