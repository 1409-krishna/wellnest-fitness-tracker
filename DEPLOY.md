# Wellnest — live deployment (GitHub + Atlas + Render + Vercel)

Aapke PC par GitHub CLI (`gh`) install nahi hai, isliye **live URLs yahan se automatically nahi ban sakte**. Neeche wale steps aapke accounts se 20–30 minute mein complete ho jate hain. `.env` kabhi GitHub par mat daalna.

## 1. GitHub

1. [github.com/new](https://github.com/new) kholo.
2. Repository name: `wellnest-fitness-tracker` (Public — college demo ke liye).
3. **Create repository** — README / .gitignore add mat karo (local already ready hai).
4. GitHub jo commands dikhata hai, unme **remote add + push** wale use karo. Example:

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Fitness Activity"
git remote add origin https://github.com/YOUR_USERNAME/wellnest-fitness-tracker.git
git push -u origin main
```

`YOUR_USERNAME` apna GitHub username se replace karo.

## 2. MongoDB Atlas (database)

1. [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) par free cluster banao (M0).
2. Database user: username + password save karo (password mein `@` ho to URL-encode karna padega).
3. Network Access → **Allow Access from Anywhere** (`0.0.0.0/0`) — college demo ke liye.
4. Connect → Drivers → connection string copy karo:

`mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/wellnest?retryWrites=true&w=majority`

## 3. Render (backend)

1. [render.com](https://render.com) → New → **Web Service** → GitHub repo connect.
2. Settings:

| Field | Value |
|--------|--------|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

3. Environment:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | lamba random string |
| `CLIENT_URL` | pehle `http://localhost:5173` — Vercel ke baad Vercel URL add karna |

4. Deploy. Health check: `https://YOUR-API.onrender.com/api/health`  
   Expected: `{ "ok": true, "service": "wellnest-api" }`

Pehla load 30–60 second le sakta hai (free tier spin-up).

## 4. Vercel (frontend)

1. [vercel.com](https://vercel.com) → Add New → Project → same GitHub repo.
2. **Root Directory:** `client`
3. Framework: Vite (auto)
4. Environment variable:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

5. Deploy. Site URL milegi, jaise `https://wellnest.vercel.app`
6. Render par `CLIENT_URL` update karo:

`http://localhost:5173,https://wellnest.vercel.app`

(trailing slash mat lagana)

7. Render **Redeploy** karo taaki CORS nayi URL allow kare.

## 5. Demo check

1. Live Vercel URL kholo.
2. Register: Krishna / apna email / 8+ character password.
3. Dashboard → **Load sample week**.
4. Activities, Habits, Progress, Insights — 5 pages chalni chahiye.

Agar login ke baad blank / CORS error aaye: `CLIENT_URL` exact Vercel origin se match nahi kar raha.

Agar API 30s baad fail ho: Render free service sleep mein thi — page refresh.

## Local git (already done in this project)

- Branch: `main`
- Secrets ignored: `.env`, `node_modules`, `dist`
