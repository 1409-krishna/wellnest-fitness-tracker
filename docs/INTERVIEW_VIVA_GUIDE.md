# Wellnest: Master Technical Architecture, Testing & Interview Viva Guide

## 1. Project Overview & System Architecture
**Wellnest** is a full-stack MERN wellness and habit ecosystem built with calming Earth-toned aesthetics (Sage Green `#3c6b58`, Sand `#e7ddcc`, Cream `#f3eee3`, Paper `#fbf8f1`, Clay `#c45c26`). It is engineered with strict user isolation, resilient offline/degraded fallbacks for third-party services, and real-time MongoDB data persistence.

```
Wellnest Full-Stack Architecture
├── Client (React 19, Vite 8, Tailwind CSS v4, Recharts, Lucide Icons)
│   ├── / (Dashboard: Stats, Streak, Quick Hydration, Pillars)
│   ├── /activities (Activity Catalog, Custom Sessions, Scheduling, Images)
│   ├── /habits (Daily Pillar Logging, Streaks, Monthly History)
│   ├── /hydration (Interactive SVG Ring, Quick Add, History, Browser Reminders)
│   ├── /planner (Gemini 1.5 Flash AI Planner, One-Click Activity Apply, Blueprint Save)
│   ├── /progress (Recharts Trend Lines, Hydration Bar Chart, Metric Breakdown)
│   ├── /community (Leaderboard, Wellness Challenges, Social Feed, Friend Graph)
│   └── /insights (AI Wellness Coach, Rule Engine & Pattern Detection)
│
└── Server (Node.js 24, Express 5, Mongoose 8, MongoDB Atlas)
    ├── /api/auth (Local bcrypt + JWT, Google GSI verifyIdToken)
    ├── /api/activities (Catalog + Custom, Cloudinary Image Attachments)
    ├── /api/habits (Daily Habit Logs, Pillar Syncing)
    ├── /api/hydration (CRUD Logs, Streak Analytics, Target Management)
    ├── /api/plans (Gemini Dual Engine: Gemini 1.5 Flash + Heuristic Engine)
    ├── /api/calendar (OAuth2 Flow, Web Intent URL Fallback, RFC 5545 .ics generator)
    ├── /api/upload (Multer in-memory stream to Cloudinary with Base64 fallback)
    ├── /api/reports (Nodemailer HTML summaries, Ethereal console fallback)
    └── /api/community (Friends System, Challenges, Posts, Aggregated Leaderboard)
```

---

## 2. Complete Phase Breakdown & Implemented Features

### Phase 1: Codebase Inspection & Remediation
- Identified and fixed route collision and import bugs.
- Standardized error handling and JWT token validation with `auth` middleware.

### Phase 2: Smart Hydration Tracker & Analytics
- **Model:** `HydrationLog.js` with compound index `{ userId: 1, date: 1 }`.
- **Backend:** 7 REST APIs (`/api/hydration/today`, `log`, `target`, `entry/:id`, `history`, `preferences`).
- **Pillar Sync:** Automatic update to `HabitLog` hydration pillar when target is satisfied.
- **Frontend:** `Hydration.jsx` with animated SVG circular gauge, 150ml/250ml/500ml/750ml quick-add buttons, daily/weekly Recharts breakdown, and browser Notification API integration.

### Phase 3: AI Daily & Weekly Wellness Planner
- **Service:** `geminiService.js` utilizing `@google/generative-ai` with structured JSON schema.
- **Resilience Engine:** Dual engine with heuristic algorithmic fallback when `GEMINI_API_KEY` is not provided.
- **One-Click Apply:** `applyPlanActivity()` instantly provisions a `Session` record and validates the matching `HabitLog` pillar.
- **Frontend:** `AIPlanner.jsx` featuring dynamic generation steppers, pillar attention matrix, affirmative coaching, and saved blueprints.

### Phase 4: Cloudinary Media Integration
- **Engine:** `upload.js` Multer memory storage (5MB boundary, MIME filter) + `cloudinary.js` streaming pipeline.
- **Degraded Fallback:** Generates sanitized data-URIs directly stored in MongoDB if Cloudinary secrets are absent.
- **Frontend:** Interactive avatar upload with camera hover overlays in `Layout.jsx` and image attachments in `Activities.jsx`.

### Phase 5: Google Calendar Integration
- **Engine:** Google OAuth2 Client + RFC 5545 compliant `.ics` generator (`calendarService.js`).
- **Web Intent Fallback:** Generates direct Google Calendar Web URLs (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) to bypass authentication hurdles.
- **Frontend:** `ScheduleModal.jsx` embedded across Activities and AI Planner schedule cards.

### Phase 6: Nodemailer Notifications & Weekly Reports
- **Service:** `emailService.js` with responsive Wellnest-themed HTML templates.
- **Asynchronous Execution:** Fire-and-forget architecture (`.catch()` wrappers) preventing email delays from blocking HTTP API latency.
- **Triggers:** Registration welcome email, Goal achieved notification, and on-demand `/api/reports/weekly` report generation.

### Phase 7: Wellness Community & Gamification
- **Models:** `Friendship.js` (unique compound index), `Challenge.js` (auto-computed completion date), `CommunityPost.js`.
- **Leaderboard Aggregation Engine:** Dynamic pipeline calculating points from verified workouts, habit streaks, and hydration targets.
- **Frontend:** `Community.jsx` 4-tab interface (Leaderboard, Challenges, Social Feed with Likes/Deletes, Friend Search/Requests).

---

## 3. Verification & Test Suite Results

All test suites execute against live MongoDB Atlas:

| Test Suite | File | Tests Run | Result | Key Validations |
|---|---|:---:|:---:|---|
| **Hydration** | `hydration.test.js` | 8 | **8/8 PASSED** | Intake logging, target auto-sync with HabitLog, entry edit/delete, 7-day streak stats |
| **AI Planner** | `planner.test.js` | 6 | **6/6 PASSED** | Heuristic fallback, plan generation, blueprint save, session provisioning, pillar sync |
| **Media Upload** | `upload.test.js` | 5 | **5/5 PASSED** | Avatar buffer upload, old asset purging, activity cover image attachment, fallback URI |
| **Calendar** | `calendar.test.js` | 4 | **4/4 PASSED** | Event creation, Google web intent link, RFC 5545 `.ics` formatting, event cancellation |
| **Email Service** | `email.test.js` | 8 | **8/8 PASSED** | Template rendering, console dev fallback, non-blocking asynchronous dispatch |
| **Community** | `community.test.js` | 13 | **13/13 PASSED** | Friend requests, unique constraint checks, challenge join/progress, post likes/deletion |
| **Total** | | **44** | **44/44 (100%)** | **Zero Regressions** |

---

## 4. Technical Viva & Interview Preparation

### Q1: How does the application maintain security when third-party API credentials are missing?
> **Answer:** "Every third-party integration (Gemini AI, Cloudinary, Google Calendar, Nodemailer SMTP) follows an **Adapter / Resilient Fallback Pattern**. If `GEMINI_API_KEY` is not detected, the system smoothly falls back to an internal heuristic rule engine without crashing. If Cloudinary credentials are empty, images fall back to verified base64 data-URIs. For Calendar, we generate direct Google Calendar Web Intent URLs and RFC-5545 standard `.ics` files that download and import into Apple Calendar or Outlook."

### Q2: How is data consistency maintained between distinct features (e.g. Hydration and Habits)?
> **Answer:** "We implemented **cross-pillar synchronization**. When a user logs water intake in `HydrationLog` and satisfies their daily target (e.g. 2000ml), the hydration controller automatically queries or creates the day's `HabitLog` and toggles the `hydration` pillar to `completed: true`. Similarly, applying an activity from the AI Planner automatically provisions an activity `Session` and marks the `movement` pillar completed."

### Q3: How is the Leaderboard score calculated without race conditions or point manipulation?
> **Answer:** "Points are never stored as mutable incrementable counters on the User document. Instead, the backend aggregates verified activity logs via MongoDB aggregation pipelines (`$match`, `$group`, `$project`) across three sources: completed sessions (10 pts + 1 pt/min), completed habit pillars (5 pts each), and days where the daily hydration target was satisfied (8 pts). This makes leaderboard data verifiable and tamper-proof."

### Q4: Why are Nodemailer email transmissions designed as non-blocking?
> **Answer:** "SMTP handshakes often introduce network latency (500ms to 2.5s). In controllers like `register` and `goalController.update`, email promises are executed asynchronously (`sendWelcomeEmail(user).catch(...)`) without using `await` in the primary execution flow. This allows the API to respond to the client immediately (<50ms) while the email is handled in the background event loop."
