const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driveRoutes = require('./routes/driveRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const questionRoutes = require('./routes/questionRoutes');
const mockTestRoutes = require('./routes/mockTestRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const resumeAnalyzerRoutes = require('./routes/resumeAnalyzerRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const experienceRoutes = require('./routes/experienceRoutes');
const testTypeRoutes = require('./routes/testTypeRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Base Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/mock-tests', mockTestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/resume-analyzer', resumeAnalyzerRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/test-types', testTypeRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Root health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'CampusPro API Server',
    time: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
