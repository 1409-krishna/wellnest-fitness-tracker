const { GoogleGenerativeAI } = require('@google/generative-ai');
const HabitLog = require('../models/HabitLog');
const HydrationLog = require('../models/HydrationLog');
const Session = require('../models/Session');
const Goal = require('../models/Goal');

function getPastDates(days = 7) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// 1. Gather comprehensive user data for context
async function gatherUserContext(user, days = 7) {
  const pastDates = getPastDates(days);
  const today = pastDates[pastDates.length - 1];

  const [habits, hydrationLogs, sessions, goals] = await Promise.all([
    HabitLog.find({ userId: user._id, date: { $in: pastDates } }).lean(),
    HydrationLog.find({ userId: user._id, date: { $in: pastDates } }).lean(),
    Session.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).populate('activityId').lean(),
    Goal.find({ userId: user._id, active: true }).lean(),
  ]);

  // Pillar completion stats
  const pillarStats = {
    movement: { completed: 0, total: days },
    rest: { completed: 0, total: days },
    hydration: { completed: 0, total: days },
    sleep: { completed: 0, total: days },
  };

  habits.forEach((h) => {
    if (h.completed && pillarStats[h.pillar]) {
      pillarStats[h.pillar].completed++;
    }
  });

  // Hydration summary
  const totalWaterLogged = hydrationLogs.reduce((sum, h) => sum + (h.totalMl || 0), 0);
  const avgWaterMl = hydrationLogs.length ? Math.round(totalWaterLogged / hydrationLogs.length) : 0;
  const todayHydration = hydrationLogs.find((h) => h.date === today);

  // Recent movement
  const recentActivities = sessions.map((s) => ({
    name: s.activityId?.name || 'Movement Session',
    category: s.activityId?.category || 'movement',
    durationMins: s.durationMins || 20,
    date: s.date,
  }));

  return {
    userName: user.name || 'Wellness Seeker',
    preferences: user.preferences || {},
    pillarStats,
    avgWaterMl,
    todayWaterMl: todayHydration?.totalMl || 0,
    dailyWaterTargetMl: todayHydration?.targetMl || user.preferences?.dailyWaterTargetMl || 2500,
    recentActivities,
    activeGoals: goals.map((g) => ({ title: g.title, pillar: g.pillar, targetPerWeek: g.targetPerWeek })),
    pastDates,
    today,
  };
}

// 2. Intelligent Heuristic Rule Engine (Fallback or offline)
function generateHeuristicPlan(context, planType, options = {}) {
  const { userName, pillarStats, avgWaterMl, dailyWaterTargetMl, recentActivities, today } = context;
  const isWeekly = planType === 'weekly';

  // Identify pillar needing most attention
  const pillarRates = Object.entries(pillarStats).map(([pillar, data]) => ({
    pillar,
    rate: Math.round((data.completed / data.total) * 100),
    completed: data.completed,
    total: data.total,
  }));
  pillarRates.sort((a, b) => a.rate - b.rate);

  const lowestPillar = pillarRates[0]?.pillar || 'movement';
  const secondLowest = pillarRates[1]?.pillar || 'hydration';

  const schedule = [
    {
      timeOfDay: 'Morning',
      time: '07:30 AM',
      title: 'Gentle Awakening & Joint Mobility',
      pillar: 'movement',
      durationMins: 15,
      description: 'Slow neck rolls, shoulder openers, and cat-cow stretches to mobilize your spine without rushing.',
      actionableTip: 'Keep your breath smooth and unforced; sip a warm glass of water right afterwards.',
      intensity: 'gentle',
    },
    {
      timeOfDay: 'Midday',
      time: '12:45 PM',
      title: 'Hydration Anchor & Posture Reset',
      pillar: 'hydration',
      durationMins: 5,
      description: `Replenish with a full 250-500 ml glass of fresh water to support steady cognitive energy.`,
      actionableTip: `Your target is ${dailyWaterTargetMl} ml today. You've averaged ${avgWaterMl} ml recently.`,
      intensity: 'gentle',
    },
    {
      timeOfDay: 'Afternoon',
      time: '04:30 PM',
      title: lowestPillar === 'rest' ? 'Mindful 5-Minute Breathing Break' : 'Brisk Walking or Outdoor Stroll',
      pillar: lowestPillar === 'rest' ? 'rest' : 'movement',
      durationMins: lowestPillar === 'rest' ? 10 : 25,
      description: lowestPillar === 'rest'
        ? 'Step away from screens, sit comfortably, and inhale for 4 counts, exhale for 6 counts.'
        : 'A rhythmic outdoor walk at conversational pace to refresh blood flow and clear mental fatigue.',
      actionableTip: 'Notice the physical sensation in your feet rather than checking notifications.',
      intensity: lowestPillar === 'rest' ? 'restorative' : 'moderate',
    },
    {
      timeOfDay: 'Evening',
      time: '09:30 PM',
      title: 'Digital Wind-Down & Evening Reading',
      pillar: 'sleep',
      durationMins: 30,
      description: 'Dim ambient lights, set your phone aside, and engage in calming reading or progressive muscle relaxation.',
      actionableTip: 'Going to bed at consistent times strengthens your circadian rhythm naturally.',
      intensity: 'restorative',
    },
  ];

  const habitFocus = pillarRates.map((item) => {
    let statusMessage = '';
    let suggestedAction = '';
    let priority = 'medium';

    if (item.rate < 40) {
      priority = 'high';
      statusMessage = `Completed only ${item.completed}/${item.total} days recently (${item.rate}% consistency). Needs mindful focus.`;
      suggestedAction = `Schedule a non-negotiable 10-minute micro-commitment for ${item.pillar} today.`;
    } else if (item.rate < 75) {
      priority = 'medium';
      statusMessage = `Steady baseline at ${item.rate}% (${item.completed}/${item.total} days). Minor tweaks will stabilize this pillar.`;
      suggestedAction = `Maintain momentum by pairing ${item.pillar} with an existing daily anchor.`;
    } else {
      priority = 'low';
      statusMessage = `Outstanding consistency (${item.rate}% completed). This is an established habit!`;
      suggestedAction = `Enjoy the positive rhythm and protect this time slot.`;
    }

    return {
      pillar: item.pillar,
      statusMessage,
      suggestedAction,
      priority,
    };
  });

  return {
    title: isWeekly ? `Weekly Holistic Rhythm Blueprint for ${userName}` : `Mindful Daily Wellness Plan (${today})`,
    summary: `Tailored for ${userName}. Focuses on gently boosting ${lowestPillar} and ${secondLowest} while preserving your existing daily balance.`,
    dateKey: today,
    targetScope: {
      startDate: today,
      endDate: isWeekly ? context.pastDates[0] : today,
    },
    schedule,
    habitFocus,
    hydrationAdvice: `Target: ${dailyWaterTargetMl} ml. Drink 1-2 glasses before noon and keep water visible on your desk to hit your daily goal effortlessly.`,
    recoveryAdvice: `Quality rest is active restoration. Ensure 15 minutes of uninterrupted quiet before sleep to allow your parasympathetic nervous system to recharge.`,
    affirmation: 'Consistency is found in small, forgiving moments. Show up kindly for yourself today.',
    generatedBy: 'heuristic',
  };
}

// 3. Main Generation Function using Gemini with robust fallback
async function generateWellnessPlan(user, planType = 'daily', options = {}) {
  const context = await gatherUserContext(user);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[AI Planner] GEMINI_API_KEY not configured. Running intelligent heuristic generator.');
    return generateHeuristicPlan(context, planType, options);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    const prompt = `
You are Wellnest AI, a warm, evidence-based, compassionate wellness coach specializing in holistic habit consistency (Movement, Rest, Hydration, Sleep).
You avoid extreme fitness tropes, appearance or weight-loss framing, and medical diagnoses.

Here is the authenticated user's real health & habit data:
- User Name: "${context.userName}"
- Past 7-Day Habit Completion:
  * Movement: ${context.pillarStats.movement.completed}/7 days
  * Rest: ${context.pillarStats.rest.completed}/7 days
  * Hydration: ${context.pillarStats.hydration.completed}/7 days
  * Sleep: ${context.pillarStats.sleep.completed}/7 days
- Hydration Stats:
  * Daily Target: ${context.dailyWaterTargetMl} ml
  * Recent Average: ${context.avgWaterMl} ml/day
- Recent Activities Logged: ${JSON.stringify(context.recentActivities.slice(0, 5))}
- Active User Goals: ${JSON.stringify(context.activeGoals)}
- Plan Scope Requested: "${planType}" (daily or weekly)
- Additional User Request/Notes: "${options.userNote || 'Balanced general wellness'}"

Return ONLY a valid JSON object matching this schema:
{
  "title": "A short inspiring title for the plan",
  "summary": "2-3 sentences explaining why this plan fits their current habit patterns",
  "schedule": [
    {
      "timeOfDay": "Morning" | "Midday" | "Afternoon" | "Evening",
      "time": "e.g. 08:00 AM",
      "title": "Clear activity name",
      "pillar": "movement" | "rest" | "hydration" | "sleep",
      "durationMins": number,
      "description": "Specific, calming guidance",
      "actionableTip": "One practical takeaway",
      "intensity": "gentle" | "moderate" | "invigorating" | "restorative"
    }
  ],
  "habitFocus": [
    {
      "pillar": "movement" | "rest" | "hydration" | "sleep",
      "statusMessage": "Short observation on their logged trend",
      "suggestedAction": "Realistic way to improve or sustain it",
      "priority": "high" | "medium" | "low"
    }
  ],
  "hydrationAdvice": "Concrete water intake pacing advice",
  "recoveryAdvice": "Rest or sleep guidance",
  "affirmation": "One uplifting, pressure-free mindfulness quote"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      title: parsed.title || `Wellnest ${planType === 'weekly' ? 'Weekly Blueprint' : 'Daily Routine'}`,
      summary: parsed.summary || 'Personalized wellness plan built by Wellnest AI.',
      dateKey: context.today,
      targetScope: {
        startDate: context.today,
        endDate: context.today,
      },
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      habitFocus: Array.isArray(parsed.habitFocus) ? parsed.habitFocus : [],
      hydrationAdvice: parsed.hydrationAdvice || '',
      recoveryAdvice: parsed.recoveryAdvice || '',
      affirmation: parsed.affirmation || 'Small habits create lasting peace.',
      generatedBy: 'gemini',
    };
  } catch (err) {
    console.error('[AI Planner] Gemini API call failed, falling back to heuristic engine:', err.message);
    return generateHeuristicPlan(context, planType, options);
  }
}

module.exports = {
  generateWellnessPlan,
  gatherUserContext,
};
