const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { requestIdMiddleware } = require('./middleware/requestIdMiddleware');
const { sanitizeInput } = require('./middleware/sanitizeMiddleware');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');
const { protect } = require('./middleware/authMiddleware');
const { authorize } = require('./middleware/roleMiddleware');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const PlacementDrive = require('./models/PlacementDrive');
const Company = require('./models/Company');
const ExportJob = require('./models/ExportJob');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
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
const departmentRoutes = require('./routes/departmentRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');

const app = express();

// Enable reverse proxy trust in production/container environments (for correct IP detection behind proxies)
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Traceability: attach unique request ID for end-to-end request tracing
app.use(requestIdMiddleware);

// Security Headers via Helmet (with cross-origin resource policy enabled for static asset serving)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS Policy Configuration
const clientUrlOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const allowedOrigins = [
  ...(clientUrlOrigins.length > 0 ? clientUrlOrigins : ['http://localhost:3000']),
  ...(process.env.NODE_ENV === 'production' ? [] : devOrigins)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'x-historical-manage', 'X-Historical-Manage']
  })
);

// Request parsing with bounded limits to prevent denial-of-service via huge payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization against MongoDB operator injection ($ and .)
app.use(sanitizeInput);

// Protected: Job Description documents (Authentication + Drive/Company Authorization required)
app.get('/uploads/jds/:filename', protect, async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', 'jds', safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Job Description document not found.' });
    }

    const role = (req.user?.role || '').toUpperCase();
    if (role === 'ADMIN') {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(filePath);
    }

    // Find placement drive referencing this file
    const drive = await PlacementDrive.findOne({
      $or: [
        { 'jobDescription.fileUrl': new RegExp(safeFilename) },
        { 'jobDescription.fileName': safeFilename },
        { 'jobDescription.publicId': new RegExp(safeFilename) }
      ]
    }).populate('targetAudience.sectionIds notificationSettings.targetSections');

    if (drive) {
      if (role === 'STUDENT') {
        // Enforce published status (students cannot view draft drive JDs)
        if ((drive.status || '').toUpperCase() === 'DRAFT') {
          return res.status(403).json({
            success: false,
            code: 'FILE_ACCESS_DENIED',
            message: 'Access denied. This placement drive has not been published yet.'
          });
        }

        // Enforce section targeting
        const audType = drive.targetAudience?.type || drive.notificationSettings?.targetAudience;
        if (audType === 'SPECIFIC_SECTIONS') {
          const allowedSecIds = (
            drive.targetAudience?.sectionIds ||
            drive.notificationSettings?.targetSections ||
            []
          ).map(s => (s?._id || s).toString());

          const student = await Student.findOne({ user: req.user._id });
          const studentSecId = student?.section?._id
            ? student.section._id.toString()
            : (student?.section ? student.section.toString() : null);

          if (!studentSecId || !allowedSecIds.includes(studentSecId)) {
            return res.status(403).json({
              success: false,
              code: 'FILE_ACCESS_DENIED',
              message: 'Access denied. You are not authorized to view the JD for this restricted drive.'
            });
          }
        }
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(filePath);
    }

    // Check company JD
    const company = await Company.findOne({
      $or: [
        { 'companyJd.fileUrl': new RegExp(safeFilename) },
        { 'companyJd.fileName': safeFilename },
        { 'companyJd.publicId': new RegExp(safeFilename) }
      ]
    });

    if (company) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(filePath);
    }

    return res.status(404).json({
      success: false,
      code: 'FILE_NOT_FOUND',
      message: 'Job Description document not associated with any active drive.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Authenticated & Authorized: Student Resumes (Strict Object-Level Ownership & Faculty Scope)
app.get('/uploads/resumes/:filename', protect, async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', 'resumes', safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Resume file not found.' });
    }

    const role = (req.user?.role || '').toUpperCase();
    if (role === 'ADMIN') {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(filePath);
    }

    if (role === 'FACULTY') {
      const student = await Student.findOne({
        $or: [
          { resumeUrl: new RegExp(safeFilename) },
          { resumeFileName: safeFilename },
          { resumePublicId: new RegExp(safeFilename) }
        ]
      });

      if (!student) {
        return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Student resume record not found.' });
      }

      const facultyDoc = await Faculty.findOne({ user: req.user._id });
      if (!facultyDoc || !facultyDoc.department) {
        return res.status(403).json({ success: false, code: 'FILE_ACCESS_DENIED', message: 'Faculty department not assigned. Access denied.' });
      }

      const studentDeptId = student.department?._id || student.department;
      if (!studentDeptId || studentDeptId.toString() !== facultyDoc.department.toString()) {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Access denied. You can only view resumes of students in your department.'
        });
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(filePath);
    }

    if (role === 'STUDENT') {
      const student = await Student.findOne({ user: req.user._id });
      if (student && student.resumeUrl && student.resumeUrl.includes(safeFilename)) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(filePath);
      }
    }

    return res.status(403).json({
      success: false,
      code: 'FILE_ACCESS_DENIED',
      message: 'Access denied. You cannot view this resume.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Authenticated & Authorized: Excel Export Files (Admin Only with Job Ownership verification)
app.get('/uploads/exports/:filename', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(__dirname, 'uploads', 'exports', safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Export file not found.' });
    }

    const exportJob = await ExportJob.findOne({
      $or: [
        { fileName: safeFilename },
        { filePath: new RegExp(safeFilename) },
        { fileUrl: new RegExp(safeFilename) }
      ]
    });

    if (exportJob && exportJob.user && !exportJob.user.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FILE_ACCESS_DENIED',
        message: 'Access denied. You can only download export files generated by your account.'
      });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Forbidden: Unrestricted uploads directory access
app.use('/uploads', (req, res) => {
  res.status(403).json({ success: false, message: 'Direct access to uploads directory is forbidden.' });
});

// General API Rate Limiter
app.use('/api', generalLimiter);

// API Base Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
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
app.use('/api/departments', departmentRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/academic-years', academicYearRoutes);

// Safe Admin Diagnostic Email Test endpoint
const { testEmailDelivery } = require('./controllers/driveController');
app.post('/api/admin/email/test', protect, authorize('ADMIN'), testEmailDelivery);

// Liveness probe (Lightweight check: process is responsive)
app.get(['/api/health/live', '/health/live'], (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
});

// Readiness probe (Checks core dependencies required to serve production traffic)
app.get(['/api/health/ready', '/health/ready'], (req, res) => {
  const mongoose = require('mongoose');
  let isRedis = false;
  try {
    const { isRedisEnabled } = require('./config/redis');
    isRedis = typeof isRedisEnabled === 'function' ? isRedisEnabled() : Boolean(isRedisEnabled);
  } catch (e) {
    isRedis = false;
  }

  const { isCloudinaryConfigured } = require('./config/cloudinary');
  const isEmailConfigured = Boolean(process.env.SMTP_HOST || process.env.EMAIL_USER);

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : (dbState === 2 ? 'connecting' : 'disconnected');
  const isDatabaseReady = dbState === 1;

  // In production, database is mandatory. In development, storage can fallback to local disk.
  const isProduction = process.env.NODE_ENV === 'production';
  const isStorageReady = isProduction ? isCloudinaryConfigured : true;

  const isReady = isDatabaseReady && isStorageReady;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbStatus,
      redis: isRedis ? 'connected' : 'offline_or_fallback',
      storage: isCloudinaryConfigured ? 'cloudinary' : (isProduction ? 'unconfigured' : 'local_development'),
      email: isEmailConfigured ? 'configured' : 'fallback'
    },
    requestId: req.id
  });
});

// Root health check endpoint (safe high-level diagnostics without exposing secrets)
app.get(['/api/health', '/health'], (req, res) => {
  const mongoose = require('mongoose');
  let isRedis = false;
  try {
    const { isRedisEnabled } = require('./config/redis');
    isRedis = typeof isRedisEnabled === 'function' ? isRedisEnabled() : Boolean(isRedisEnabled);
  } catch (e) {
    isRedis = false;
  }

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : (dbState === 2 ? 'connecting' : 'disconnected');
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    app: 'CampusPro Enterprise Placement & Interview Management Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: isRedis ? 'enabled' : 'offline_or_fallback'
    },
    requestId: req.id
  });
});

// 404 Route Not Found Handler (catches unmatched API routes)
app.use(notFound);

// Centralized Error handling middleware
app.use(errorHandler);

module.exports = app;
