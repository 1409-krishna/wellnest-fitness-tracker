require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDb } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const activityRoutes = require('./routes/activityRoutes');
const habitRoutes = require('./routes/habitRoutes');
const goalRoutes = require('./routes/goalRoutes');
const progressRoutes = require('./routes/progressRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const hydrationRoutes = require('./routes/hydrationRoutes');
const planRoutes = require('./routes/planRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const Activity = require('./models/Activity');
const catalog = require('./seed/activities.json');
const { notFound, errorHandler } = require('./middleware/errorHandler');

async function ensureCatalog() {
  const count = await Activity.countDocuments({ createdBy: null });
  if (count > 0) return;
  await Activity.insertMany(catalog.map((item) => ({ ...item, createdBy: null })));
  console.log(`Seeded ${catalog.length} catalog activities`);
}

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'wellnest-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/hydration', hydrationRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;

connectDb()
  .then(ensureCatalog)
  .then(() => {
    app.listen(port, () => console.log(`API running on port ${port}`));
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
