/**
 * MongoDB Index Synchronization Utility
 * Ensures all indexes defined in Mongoose schemas are cleanly synchronized with MongoDB
 */
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

// Import all models to register their schemas
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const InterviewResult = require('../models/InterviewResult');
const MockTest = require('../models/MockTest');
const MockResult = require('../models/MockResult');
const Question = require('../models/Question');
const InterviewExperience = require('../models/InterviewExperience');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const EmailNotificationLog = require('../models/EmailNotificationLog');
const ExportJob = require('../models/ExportJob');
const PreparationRoadmap = require('../models/PreparationRoadmap');

const models = [
  { name: 'User', model: User },
  { name: 'Student', model: Student },
  { name: 'Faculty', model: Faculty },
  { name: 'Department', model: Department },
  { name: 'Section', model: Section },
  { name: 'Company', model: Company },
  { name: 'PlacementDrive', model: PlacementDrive },
  { name: 'Application', model: Application },
  { name: 'InterviewResult', model: InterviewResult },
  { name: 'MockTest', model: MockTest },
  { name: 'MockResult', model: MockResult },
  { name: 'Question', model: Question },
  { name: 'InterviewExperience', model: InterviewExperience },
  { name: 'Notification', model: Notification },
  { name: 'Announcement', model: Announcement },
  { name: 'AuditLog', model: AuditLog },
  { name: 'Resume', model: Resume },
  { name: 'ResumeAnalysis', model: ResumeAnalysis },
  { name: 'EmailNotificationLog', model: EmailNotificationLog },
  { name: 'ExportJob', model: ExportJob },
  { name: 'PreparationRoadmap', model: PreparationRoadmap }
];

const connectDB = require('../config/db');
const { closeDB } = require('../config/db');

async function syncAllIndexes(isStandalone = false) {
  if (isStandalone) {
    await connectDB();
    console.log(`[Index Sync] Connected to MongoDB`);
  }

  for (const { name, model } of models) {
    try {
      await model.syncIndexes();
      console.log(`[Index Sync] ${name.padEnd(20)} -> synchronized`);
    } catch (err) {
      console.warn(`[Index Sync Warning] ${name}:`, err.message);
    }
  }

  console.log('[Index Sync] All model indexes successfully synchronized.');
  if (isStandalone) {
    await closeDB();
    process.exit(0);
  }
}

if (require.main === module) {
  syncAllIndexes(true).catch((err) => {
    console.error('[Index Sync Fatal Error]', err);
    process.exit(1);
  });
}

module.exports = {
  syncAllIndexes
};
