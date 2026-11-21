const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  console.log('MongoDB connected successfully');
  console.log('Host:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.name);
}

module.exports = { connectDb };