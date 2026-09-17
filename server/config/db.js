const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Local MongoDB connection failed: ${error.message}`);
    console.error(`[Database Error] Please make sure MongoDB Community Server is running on mongodb://127.0.0.1:27017`);
    process.exit(1);
  }
};

module.exports = connectDB;
