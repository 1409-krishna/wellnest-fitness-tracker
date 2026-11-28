'use strict';

/**
 * emailService.js — Wellnest Nodemailer integration
 * Falls back to Ethereal (console log) when SMTP credentials are absent.
 * All send* functions are async and NEVER block HTTP responses — call them
 * with .catch() or fire-and-forget inside controllers.
 */

const nodemailer = require('nodemailer');

// ─── Transporter ───────────────────────────────────────────────────────────────
let _transporter = null;
let _fromAddress = '';

function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    _fromAddress = EMAIL_FROM || SMTP_USER;
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log('[EmailService] Using configured SMTP transporter →', SMTP_HOST);
  } else {
    // Ethereal fallback — messages appear only in console
    _fromAddress = 'wellnest@example.com';
    _transporter = {
      sendMail: async (opts) => {
        console.log('\n📧 [EmailService – Dev Console Fallback]');
        console.log('  To     :', opts.to);
        console.log('  Subject:', opts.subject);
        console.log('  Body   :', opts.text || '(HTML only)');
        console.log('─────────────────────────────────────────\n');
        return { messageId: 'dev-console-' + Date.now() };
      },
    };
    console.log('[EmailService] SMTP not configured — emails logged to console (dev mode).');
  }

  return _transporter;
}

// ─── Shared HTML wrapper ───────────────────────────────────────────────────────
function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Outfit', Arial, sans-serif; background:#f3eee3; margin:0; padding:0; }
    .wrap { max-width:600px; margin:0 auto; background:#fbf8f1; border-radius:16px; overflow:hidden; }
    .header { background:#3c6b58; padding:32px; text-align:center; }
    .header h1 { color:#fbf8f1; font-size:28px; margin:0; letter-spacing:-0.5px; }
    .header p  { color:#fbf8f1; opacity:0.7; margin:6px 0 0; font-size:13px; }
    .body { padding:32px; color:#2d3a35; }
    .body h2 { color:#3c6b58; margin-top:0; }
    .stat-row { display:flex; gap:16px; margin:20px 0; }
    .stat { flex:1; background:#e7ddcc; border-radius:12px; padding:16px; text-align:center; }
    .stat .num { font-size:28px; font-weight:700; color:#3c6b58; }
    .stat .lbl { font-size:12px; color:#2d3a35; opacity:0.7; margin-top:4px; }
    .btn { display:inline-block; background:#3c6b58; color:#fbf8f1; text-decoration:none;
           border-radius:10px; padding:12px 28px; font-weight:600; margin-top:20px; }
    .tip { background:#e7ddcc; border-radius:10px; padding:14px 18px; margin:16px 0;
           font-size:14px; line-height:1.6; border-left:4px solid #3c6b58; }
    .footer { padding:20px 32px; text-align:center; font-size:12px; color:#2d3a35; opacity:0.5; }
  </style>
</head>
<body>
  <div style="padding:24px">
    <div class="wrap">
      <div class="header">
        <h1>Wellnest<span style="color:#a8c5b5;">.</span></h1>
        <p>Your Wellness Journey</p>
      </div>
      <div class="body">
        <h2>${title}</h2>
        ${bodyHtml}
      </div>
      <div class="footer">
        Move · Rest · Hydrate · Sleep<br/>
        You received this because you have a Wellnest account.<br/>
        © ${new Date().getFullYear()} Wellnest
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send helpers ──────────────────────────────────────────────────────────────
async function send({ to, subject, text, html }) {
  try {
    const t = getTransporter();
    const info = await t.sendMail({ from: _fromAddress, to, subject, text, html });
    return info;
  } catch (err) {
    console.error('[EmailService] Send error:', err.message);
  }
}

// ── Welcome email after registration ──────────────────────────────────────────
async function sendWelcomeEmail(user) {
  const html = wrapHtml('Welcome to Wellnest 🌿', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Welcome to <strong>Wellnest</strong> — your personal wellness companion! 🎉</p>
    <p>Here's what you can do right away:</p>
    <ul style="line-height:2">
      <li>🏃 Log your first fitness activity</li>
      <li>💧 Set a daily hydration target</li>
      <li>✅ Build daily wellness habits</li>
      <li>🎯 Create your first goal</li>
      <li>🤖 Generate an AI Wellness Plan</li>
    </ul>
    <div class="tip">
      <strong>Tip:</strong> Consistency is more powerful than intensity.
      Small steps taken every day create lasting change.
    </div>
    <p>Your wellness journey starts now. We're rooting for you!</p>
    <p>— The Wellnest Team 🌱</p>
  `);

  return send({
    to: user.email,
    subject: '🌿 Welcome to Wellnest – Your wellness journey begins!',
    text: `Hi ${user.name}, welcome to Wellnest! Start logging activities, set habits, and track your hydration today.`,
    html,
  });
}

// ── Goal achieved email ────────────────────────────────────────────────────────
async function sendGoalAchievedEmail(user, goal) {
  const html = wrapHtml(`Goal Achieved: ${goal.title} 🏆`, `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>🎊 Congratulations! You've achieved your wellness goal:</p>
    <div class="tip" style="font-size:16px; font-weight:600;">
      🏆 ${goal.title}
    </div>
    <p>Target: <strong>${goal.targetPerWeek} sessions/week</strong> — and you nailed it!</p>
    <p>This kind of dedication is what transforms wellness into a lifestyle.
       Keep this momentum going and set your next challenge!</p>
    <p>— The Wellnest Team 🌱</p>
  `);

  return send({
    to: user.email,
    subject: `🏆 Goal achieved: "${goal.title}" – Well done!`,
    text: `Hi ${user.name}, you've achieved your goal "${goal.title}"! Great work!`,
    html,
  });
}

// ── Weekly wellness summary ────────────────────────────────────────────────────
async function sendWeeklyWellnessSummary(user, stats) {
  const {
    activeSessions = 0,
    totalMinutes = 0,
    habitsCompleted = 0,
    totalHabits = 0,
    avgHydrationMl = 0,
    goalsOnTrack = 0,
    totalGoals = 0,
    topActivity = '',
    affirmation = 'Keep showing up — every day counts.',
  } = stats;

  const habitRate = totalHabits > 0 ? Math.round((habitsCompleted / totalHabits) * 100) : 0;
  const hydrationL = (avgHydrationMl / 1000).toFixed(1);

  const html = wrapHtml('Your Weekly Wellness Report 📊', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>Here's a snapshot of your wellness week:</p>

    <div class="stat-row">
      <div class="stat">
        <div class="num">${activeSessions}</div>
        <div class="lbl">Workouts</div>
      </div>
      <div class="stat">
        <div class="num">${totalMinutes}</div>
        <div class="lbl">Active Minutes</div>
      </div>
      <div class="stat">
        <div class="num">${habitRate}%</div>
        <div class="lbl">Habit Rate</div>
      </div>
      <div class="stat">
        <div class="num">${hydrationL}L</div>
        <div class="lbl">Avg Hydration</div>
      </div>
    </div>

    ${topActivity ? `<p>🏅 <strong>Top activity this week:</strong> ${topActivity}</p>` : ''}
    ${totalGoals > 0 ? `<p>🎯 <strong>Goals on track:</strong> ${goalsOnTrack} of ${totalGoals}</p>` : ''}

    <div class="tip">
      <strong>Weekly Affirmation:</strong><br/>
      "${affirmation}"
    </div>

    <p>Open Wellnest to plan next week's sessions and keep the streak alive!</p>
    <p>— The Wellnest Team 🌱</p>
  `);

  return send({
    to: user.email,
    subject: `📊 Your Wellnest Weekly Report – ${activeSessions} workouts, ${habitRate}% habit rate`,
    text: `Hi ${user.name}, this week: ${activeSessions} workouts, ${totalMinutes} active minutes, ${habitRate}% habit completion, avg hydration ${hydrationL}L/day.`,
    html,
  });
}

// ── Hydration reminder email ───────────────────────────────────────────────────
async function sendHydrationReminderEmail(user, remainingMl) {
  const html = wrapHtml('Hydration Reminder 💧', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>💧 You still have <strong>${remainingMl} ml</strong> left to reach your daily hydration goal.</p>
    <p>Staying hydrated helps with energy, focus, and recovery.
       Open Wellnest and log your next glass!</p>
    <div class="tip">
      A quick tip: keep a water bottle at your desk as a visual reminder.
    </div>
    <p>— The Wellnest Team 🌱</p>
  `);

  return send({
    to: user.email,
    subject: `💧 Hydration check-in – ${remainingMl} ml to go today!`,
    text: `Hi ${user.name}, you have ${remainingMl} ml left to reach your daily hydration goal.`,
    html,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendGoalAchievedEmail,
  sendWeeklyWellnessSummary,
  sendHydrationReminderEmail,
};
