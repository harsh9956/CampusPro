const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

// Connect to MongoDB Database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CampusPro Backend Server is running on port ${PORT}`);
  console.log(`📍 Health Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message);
});
