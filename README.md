# Wellnest — Fitness Activity & Wellness Habit Tracker

**Project 41** · Assigned student: **Krishna Sharma**  
Full-stack MERN app (MongoDB, Express, React, Node) with JWT auth and rule-based wellness insights.

Original assignment was frontend-only. This repo implements that UX **and** a complete backend, database, and deployment-ready setup as required by the professor.

## What it does

Five main pages:

1. **Wellness Dashboard** — activity summary, routine reminders, personalized tiles  
2. **Fitness Activities** — library, category filters, favorites, routine templates, add walking/yoga/custom  
3. **Daily Habit Tracker** — weekly calendar for movement, rest, hydration, sleep  
4. **Goals & Progress** — flexible weekly goals, Recharts consistency chart, sessions, journal notes  
5. **AI Wellness Insights** — five rule-based insights from **your** logs (no paid AI API)

Insights shown:

- Preferred activity types  
- Weekly activity patterns  
- Habit completion trends  
- Routine consistency insights  
- Balanced activity suggestions  

Goals never use weight, calories, BMI, or appearance language.

## Local setup

Need **Node.js 18+** and **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas)).

```bash
# 1) Backend
cd server
copy .env.example .env
# edit MONGO_URI and JWT_SECRET
npm install
npm run seed
npm run dev
```

API: `http://localhost:5000`

```bash
# 2) Frontend (new terminal)
cd client
copy .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

Register an account, then optionally click **Load sample week** on the dashboard for a viva-ready demo.

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `server` | `npm run dev` | Nodemon API |
| `server` | `npm start` | Production API |
| `server` | `npm run seed` | Seed activity catalog |
| `client` | `npm run dev` | Vite |
| `client` | `npm run build` | Production build |

## Environment

**server/.env**

- `PORT=5000`
- `MONGO_URI` — local or Atlas connection string  
- `JWT_SECRET` — long random string  
- `CLIENT_URL` — frontend origin (CORS)

**client/.env**

- `VITE_API_URL=http://localhost:5000/api`

## API map (auth required except register/login)

- `POST /api/auth/register` `POST /api/auth/login` `GET /api/auth/me`
- `GET/POST /api/activities` `GET /api/activities/templates` `POST /api/activities/:id/favorite`
- `GET/PUT /api/habits`
- `GET/POST/PATCH/DELETE /api/goals`
- `GET /api/progress/weekly` `GET/POST /api/progress/sessions` `GET/POST /api/progress/journals`
- `GET /api/insights` `POST /api/insights/sample-week`

Postman collection: `postman/Wellnest.postman_collection.json`

## Deployment

Click-by-click guide: **[DEPLOY.md](./DEPLOY.md)**

- **GitHub** — push `main` (never commit `.env`)
- **MongoDB Atlas** — free M0 cluster, `0.0.0.0/0` for demo
- **Render** — Web Service, root `server`, `npm start`
- **Vercel** — project root `client`, `VITE_API_URL` = Render URL + `/api`

Configs in repo: `render.yaml`, `client/vercel.json`

## Tech

React 19, Vite, Tailwind CSS v4, React Router, Axios, Recharts, Express, Mongoose, JWT, bcrypt, Helmet, CORS.

## Assignment mapping

| Task | Page |
|------|------|
| Home & Discovery | Wellness Dashboard |
| Directory & Filtering | Fitness Activities |
| Details & Management | Daily Habit Tracker |
| Workflow & Tracking | Goals & Progress |
| AI Behavior / Data Insights | AI Wellness Insights |
