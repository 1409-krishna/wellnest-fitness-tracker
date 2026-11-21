require('dotenv').config();
const { connectDb } = require('../config/db');
const Activity = require('../models/Activity');
const catalog = require('./activities.json');

async function seed() {
  await connectDb();
  for (const item of catalog) {
    await Activity.findOneAndUpdate(
      { name: item.name, createdBy: null },
      { ...item, createdBy: null },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${catalog.length} catalog activities`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
