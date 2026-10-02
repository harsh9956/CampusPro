/**
 * Load Test Dataset Generator for CampusPro Scalability Benchmarking
 * Generates ~10,000 synthetic students, 100+ placement drives, applications, and notifications
 *
 * Usage:
 *   node seed/loadTestSeed.js         (seeds 10,000 synthetic records)
 *   node seed/loadTestSeed.js --clean (safely removes synthetic records prefixed with SYN-)
 */

const dotenv = require('dotenv');
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  console.error('====================================================');
  console.error('⛔ [SECURITY ERROR] Database seeding is disabled in production.');
  console.error('====================================================');
  process.exit(1);
}

const mongoose = require('mongoose');

const User = require('../models/User');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const Notification = require('../models/Notification');

const Question = require('../models/Question');
const MockTest = require('../models/MockTest');
const MockResult = require('../models/MockResult');
const InterviewExperience = require('../models/InterviewExperience');
const AuditLog = require('../models/AuditLog');

const PRECOMPUTED_HASH = '$2a$10$sCJoMpgeYj1lyZbW2CvnluIkzsX4Zl914cEd9XFH50V9M/CnvjONC'; // 'password123'
const TOTAL_SYNTHETIC_STUDENTS = 10000;
const TOTAL_SYNTHETIC_DRIVES = 100;
const BATCH_SIZE = 1000;

const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Ananya', 'Diya', 'Isha', 'Aadhya', 'Kavya', 'Saanvi', 'Ananya', 'Riya', 'Pari', 'Sneha', 'Neha', 'Pooja', 'Priya', 'Tanvi'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Pandey', 'Yadav', 'Tiwari', 'Shukla', 'Patel', 'Reddy', 'Chauhan', 'Dubey', 'Saxena', 'Joshi', 'Bhatia', 'Agarwal', 'Mehta', 'Nair'];

async function runLoadTestSeed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(mongoUri);
  console.log(`[LoadTest Seed] Connected to local MongoDB: ${mongoUri}`);

  const isCleanOnly = process.argv.includes('--clean');

  if (isCleanOnly) {
    console.log('[LoadTest Seed] Cleaning synthetic data prefixed with SYN- ...');
    const synUsers = await User.find({ email: /syn_student_.*@campuspro\.com/ }).select('_id');
    const synUserIds = synUsers.map(u => u._id);

    const [delStudents, delUsers, delDrives, delApps, delNotifs, delQuestions, delMockTests, delMockResults, delExps, delAudits] = await Promise.all([
      Student.deleteMany({ enrollmentNo: /^SYN-/ }),
      User.deleteMany({ _id: { $in: synUserIds } }),
      PlacementDrive.deleteMany({ jobRole: /^SYN-Drive-/ }),
      Application.deleteMany({ user: { $in: synUserIds } }),
      Notification.deleteMany({ user: { $in: synUserIds } }),
      Question.deleteMany({ questionText: /^SYN-Q-/ }),
      MockTest.deleteMany({ title: /^SYN-Test-/ }),
      MockResult.deleteMany({ testTitle: /^SYN-Test-/ }),
      InterviewExperience.deleteMany({ jobRole: /^SYN-Role-/ }),
      AuditLog.deleteMany({ details: /^SYN-Log-/ })
    ]);

    console.log(`Cleaned up:
      - Students: ${delStudents.deletedCount}
      - Users: ${delUsers.deletedCount}
      - Drives: ${delDrives.deletedCount}
      - Applications: ${delApps.deletedCount}
      - Notifications: ${delNotifs.deletedCount}
      - Questions: ${delQuestions.deletedCount}
      - Mock Tests: ${delMockTests.deletedCount}
      - Mock Results: ${delMockResults.deletedCount}
      - Experiences: ${delExps.deletedCount}
      - Audit Logs: ${delAudits.deletedCount}`);
    await mongoose.disconnect();
    return;
  }

  // 1. Get or create master departments & sections
  let departments = await Department.find({ isActive: true });
  if (departments.length === 0) {
    departments = await Department.insertMany([
      { code: 'CSE', name: 'Computer Science & Engineering', isActive: true, status: 'active' },
      { code: 'IT', name: 'Information Technology', isActive: true, status: 'active' },
      { code: 'ECE', name: 'Electronics & Communication', isActive: true, status: 'active' },
      { code: 'AI-ML', name: 'Artificial Intelligence & Machine Learning', isActive: true, status: 'active' }
    ]);
  }

  let sections = await Section.find({ isActive: true });
  if (sections.length === 0) {
    sections = await Section.insertMany([
      { name: 'P1', code: 'P1', isActive: true, status: 'active' },
      { name: 'P2', code: 'P2', isActive: true, status: 'active' },
      { name: 'S1', code: 'S1', isActive: true, status: 'active' },
      { name: 'S2', code: 'S2', isActive: true, status: 'active' },
      { name: 'S3', code: 'S3', isActive: true, status: 'active' },
      { name: 'T1', code: 'T1', isActive: true, status: 'active' }
    ]);
  }

  // 2. Get or create companies
  let companies = await Company.find();
  if (companies.length === 0) {
    companies = await Company.insertMany([
      { name: 'Google', website: 'https://google.com', industry: 'IT', location: 'Bengaluru' },
      { name: 'Microsoft', website: 'https://microsoft.com', industry: 'IT', location: 'Hyderabad' },
      { name: 'Amazon', website: 'https://amazon.com', industry: 'E-Commerce', location: 'Bengaluru' },
      { name: 'Tata Consultancy Services', website: 'https://tcs.com', industry: 'IT Services', location: 'Noida' },
      { name: 'Infosys', website: 'https://infosys.com', industry: 'IT Services', location: 'Bengaluru' },
      { name: 'Wipro', website: 'https://wipro.com', industry: 'IT Services', location: 'Bengaluru' },
      { name: 'Cognizant', website: 'https://cognizant.com', industry: 'IT Services', location: 'Pune' },
      { name: 'Accenture', website: 'https://accenture.com', industry: 'Consulting', location: 'Gurugram' }
    ]);
  }

  // Check how many synthetic students already exist
  const existingSynCount = await Student.countDocuments({ enrollmentNo: /^SYN-/ });
  const studentsToGenerate = Math.max(0, TOTAL_SYNTHETIC_STUDENTS - existingSynCount);

  console.log(`[LoadTest Seed] Existing synthetic students: ${existingSynCount}. Target: ${TOTAL_SYNTHETIC_STUDENTS}.`);

  if (studentsToGenerate > 0) {
    console.log(`[LoadTest Seed] Generating ${studentsToGenerate} synthetic students in batches of ${BATCH_SIZE}...`);
    const startTime = Date.now();

    let createdTotal = 0;
    const startIndex = existingSynCount + 1;

    for (let batchStart = 0; batchStart < studentsToGenerate; batchStart += BATCH_SIZE) {
      const currentBatchCount = Math.min(BATCH_SIZE, studentsToGenerate - batchStart);
      const userDocs = [];
      const studentDocs = [];

      for (let i = 0; i < currentBatchCount; i++) {
        const globalIdx = startIndex + batchStart + i;
        const uid = new mongoose.Types.ObjectId();
        const sid = new mongoose.Types.ObjectId();

        const fname = firstNames[globalIdx % firstNames.length];
        const lname = lastNames[(globalIdx * 7) % lastNames.length];
        const fullName = `${fname} ${lname} ${globalIdx}`;
        const email = `syn_student_${globalIdx}@campuspro.com`;

        const dept = departments[globalIdx % departments.length];
        const sec = sections[globalIdx % sections.length];
        const cgpa = Number((5.5 + ((globalIdx * 17) % 45) / 10).toFixed(2)); // Between 5.5 and 10.0
        const backlogs = (globalIdx % 10 === 0) ? (globalIdx % 3) : 0;

        userDocs.push({
          _id: uid,
          name: fullName,
          email,
          password: PRECOMPUTED_HASH,
          role: 'STUDENT',
          status: 'ACTIVE',
          academicYear: '2026-27',
          createdAt: new Date(Date.now() - (globalIdx % 90) * 86400000)
        });

        studentDocs.push({
          _id: sid,
          user: uid,
          enrollmentNo: `SYN-2026-${String(globalIdx).padStart(5, '0')}`,
          department: dept._id,
          section: sec._id,
          branch: dept.code || dept.name,
          year: 4,
          cgpa,
          tenthPercentage: 70 + (globalIdx % 25),
          twelfthPercentage: 65 + (globalIdx % 30),
          backlogs,
          phone: `98${String(10000000 + globalIdx).slice(-8)}`,
          academicYear: '2026-27',
          createdAt: new Date(Date.now() - (globalIdx % 90) * 86400000)
        });
      }

      await User.insertMany(userDocs, { ordered: false });
      await Student.insertMany(studentDocs, { ordered: false });
      createdTotal += currentBatchCount;

      process.stdout.write(`\r   Progress: ${createdTotal} / ${studentsToGenerate} students created...`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[LoadTest Seed] Successfully created ${createdTotal} students in ${elapsed}s.`);
  }

  // 3. Generate 100+ Placement Drives if needed
  const existingDriveCount = await PlacementDrive.countDocuments({ jobRole: /^SYN-Drive-/ });
  const drivesToGenerate = Math.max(0, TOTAL_SYNTHETIC_DRIVES - existingDriveCount);

  if (drivesToGenerate > 0) {
    console.log(`[LoadTest Seed] Generating ${drivesToGenerate} synthetic placement drives...`);
    const driveDocs = [];
    const roles = ['Software Engineer', 'Data Analyst', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Cloud Engineer', 'QA Automation Engineer', 'DevOps Engineer'];

    for (let i = 1; i <= drivesToGenerate; i++) {
      const globalIdx = existingDriveCount + i;
      const comp = companies[globalIdx % companies.length];
      const role = roles[globalIdx % roles.length];
      const lpa = 5 + (globalIdx % 15);
      const isAudienceSections = globalIdx % 4 === 0;

      driveDocs.push({
        company: comp._id,
        jobRole: `SYN-Drive-${globalIdx}: ${role}`,
        package: `${lpa} LPA`,
        location: ['Bengaluru', 'Noida', 'Gurugram', 'Hyderabad', 'Pune'][globalIdx % 5],
        driveDate: new Date(Date.now() + (globalIdx % 30) * 86400000),
        deadline: new Date(Date.now() + ((globalIdx % 30) + 7) * 86400000),
        academicYear: '2026-27',
        status: ['ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'DRAFT'][globalIdx % 5],
        minCgpa: 6.0 + ((globalIdx % 4) * 0.5),
        maxBacklogs: (globalIdx % 3 === 0) ? 1 : 0,
        eligibleBranches: ['CSE', 'IT', 'AI-ML'],
        targetAudience: isAudienceSections
          ? { type: 'SPECIFIC_SECTIONS', sectionIds: [sections[globalIdx % sections.length]._id] }
          : { type: 'ALL_ACTIVE_STUDENTS', sectionIds: [] },
        selectionProcess: [
          { order: 1, roundName: 'Online Aptitude Test', roundType: 'Online Test' },
          { order: 2, roundName: 'Technical Interview', roundType: 'Technical' },
          { order: 3, roundName: 'HR Interview', roundType: 'HR' }
        ]
      });
    }

    await PlacementDrive.insertMany(driveDocs, { ordered: false });
    console.log(`[LoadTest Seed] Successfully created ${drivesToGenerate} placement drives.`);
  }

  // 4. Generate Applications & Notifications in batches
  const totalApps = await Application.countDocuments();
  if (totalApps < 10000) {
    console.log('[LoadTest Seed] Generating initial batch of 5,000 synthetic applications...');
    const allStudents = await Student.find({ enrollmentNo: /^SYN-/ }).select('_id user department').limit(5000).lean();
    const activeDrives = await PlacementDrive.find({ status: 'ACTIVE' }).select('_id').limit(10).lean();

    if (activeDrives.length > 0 && allStudents.length > 0) {
      const appDocs = [];
      const notifDocs = [];

      allStudents.forEach((st, idx) => {
        const drive = activeDrives[idx % activeDrives.length];
        const status = ['REGISTERED', 'IN_PROGRESS', 'TECHNICAL_CLEARED', 'SELECTED', 'REJECTED'][idx % 5];
        appDocs.push({
          drive: drive._id,
          student: st._id,
          user: st.user,
          currentRound: 'Online Aptitude Test',
          currentRoundOrder: 1,
          status,
          appliedAt: new Date(Date.now() - (idx % 30) * 86400000)
        });

        notifDocs.push({
          user: st.user,
          title: 'Placement Drive Update',
          message: `Your application status for Drive #${(idx % 10) + 1} has been updated to ${status}.`,
          type: 'DRIVE',
          isRead: idx % 3 === 0,
          createdAt: new Date(Date.now() - (idx % 14) * 86400000)
        });
      });

      try {
        await Application.insertMany(appDocs, { ordered: false });
        await Notification.insertMany(notifDocs, { ordered: false });
        console.log(`[LoadTest Seed] Seeded ${appDocs.length} applications and notifications.`);
      } catch (err) {
        // Ignore duplicate application key errors if some already exist
      }
    }
  }

  // 5. Generate Questions if needed
  const existingQCount = await Question.countDocuments({ questionText: /^SYN-Q-/ });
  if (existingQCount < 300) {
    console.log('[LoadTest Seed] Generating 300 synthetic questions for Question Bank...');
    const qDocs = [];
    const topics = ['DSA', 'Java', 'Python', 'SQL', 'DBMS', 'OOP', 'React', 'Computer Networks', 'Operating Systems', 'Aptitude'];
    const diffs = ['Easy', 'Medium', 'Hard'];

    for (let i = 1; i <= 300; i++) {
      const top = topics[i % topics.length];
      const diff = diffs[i % diffs.length];
      const comp = companies[i % companies.length];
      qDocs.push({
        questionText: `SYN-Q-${i}: Explain the core architectural concepts of ${top} in modern distributed systems.`,
        question: `SYN-Q-${i}: Explain the core architectural concepts of ${top} in modern distributed systems.`,
        answer: `Comprehensive answer for ${top} covering theoretical principles, runtime complexity, and practical edge-cases.`,
        explanation: `Detailed explanation demonstrating $O(1)$ and $O(N)$ behavior with code implementations.`,
        topic: top,
        difficulty: diff,
        company: comp?._id,
        companyName: comp?.name || 'General',
        companyNames: [comp?.name || 'General'],
        roundType: (i % 2 === 0) ? 'Technical' : 'Aptitude',
        frequency: ['High', 'Medium', 'Low'][i % 3],
        status: 'PUBLISHED',
        options: ['Option A: Linear time', 'Option B: Constant time', 'Option C: Quadratic time', 'Option D: Logarithmic time'],
        correctOptionIndex: i % 4,
        questionType: 'Multiple Choice'
      });
    }
    await Question.insertMany(qDocs, { ordered: false });
    console.log('[LoadTest Seed] Seeded 300 questions.');
  }

  // 6. Generate MockTests & MockResults if needed
  const existingTestCount = await MockTest.countDocuments({ title: /^SYN-Test-/ });
  if (existingTestCount < 15) {
    console.log('[LoadTest Seed] Generating 15 synthetic mock tests...');
    const testDocs = [];
    for (let i = 1; i <= 15; i++) {
      const comp = companies[i % companies.length];
      testDocs.push({
        title: `SYN-Test-${i}: Comprehensive ${comp?.name || 'Tech'} Placement Mock Assessment`,
        category: 'General Placement Mock Test',
        testType: 'General Placement',
        company: comp?._id,
        companyName: comp?.name || 'General',
        durationMinutes: 45,
        totalQuestions: 20,
        totalMarks: 20,
        passingMarks: 12,
        difficulty: ['Easy', 'Medium', 'Hard', 'Mixed'][i % 4],
        academicYear: '2026-27',
        topicsCovered: ['DSA', 'Aptitude', 'Java', 'SQL'],
        status: 'PUBLISHED',
        createdBy: (await User.findOne({ role: 'ADMIN' }))?._id || new mongoose.Types.ObjectId()
      });
    }
    const createdTests = await MockTest.insertMany(testDocs, { ordered: false });
    console.log(`[LoadTest Seed] Seeded ${createdTests.length} mock tests.`);

    // Seed mock results for students
    const sampleStudents = await Student.find({ enrollmentNo: /^SYN-/ }).select('_id user').limit(1500).lean();
    if (sampleStudents.length > 0 && createdTests.length > 0) {
      const resDocs = [];
      sampleStudents.forEach((st, idx) => {
        const test = createdTests[idx % createdTests.length];
        const score = 8 + (idx % 12);
        resDocs.push({
          student: st._id,
          user: st.user,
          mockTest: test._id,
          testTitle: test.title,
          companyName: test.companyName,
          score,
          totalScore: 20,
          percentage: (score / 20) * 100,
          correctAnswers: score,
          incorrectAnswers: 20 - score,
          unanswered: 0,
          resultStatus: score >= 12 ? 'PASS' : 'FAIL',
          status: 'COMPLETED',
          timeTakenMinutes: 30 + (idx % 15),
          completedAt: new Date(Date.now() - (idx % 45) * 86400000)
        });
      });
      await MockResult.insertMany(resDocs, { ordered: false });
      console.log(`[LoadTest Seed] Seeded ${resDocs.length} mock test results.`);
    }
  }

  // 7. Interview Experiences: Dynamic student-authored data only (no synthetic experiences)
  await InterviewExperience.deleteMany({ jobRole: /^SYN-Role-/ });


  // 8. Generate Audit Logs if needed
  const existingAuditCount = await AuditLog.countDocuments({ details: /^SYN-Log-/ });
  if (existingAuditCount < 500) {
    console.log('[LoadTest Seed] Generating 500 synthetic audit logs...');
    const auditDocs = [];
    const adminUser = (await User.findOne({ role: 'ADMIN' })) || { _id: new mongoose.Types.ObjectId() };
    const entities = ['Student', 'Placement Drive', 'Application', 'Mock Test', 'Question', 'Company'];
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'EXPORT'];

    for (let i = 1; i <= 500; i++) {
      auditDocs.push({
        performedBy: adminUser._id,
        role: 'ADMIN',
        actionType: actions[i % actions.length],
        targetEntity: entities[i % entities.length],
        targetName: `Resource #${i}`,
        details: `SYN-Log-${i}: Administrator performed ${actions[i % actions.length]} on ${entities[i % entities.length]}`,
        status: 'SUCCESS',
        createdAt: new Date(Date.now() - (i % 90) * 86400000)
      });
    }
    await AuditLog.insertMany(auditDocs, { ordered: false });
    console.log('[LoadTest Seed] Seeded 500 audit logs.');
  }

  const finalStudentCount = await Student.countDocuments();
  const finalDriveCount = await PlacementDrive.countDocuments();
  const finalAppCount = await Application.countDocuments();
  const finalNotifCount = await Notification.countDocuments();
  const finalQuestionCount = await Question.countDocuments();
  const finalMockTestCount = await MockTest.countDocuments();
  const finalMockResultCount = await MockResult.countDocuments();
  const finalExpCount = await InterviewExperience.countDocuments();
  const finalAuditCount = await AuditLog.countDocuments();

  console.log(`\n========================================================================`);
  console.log(`[LoadTest Seed Complete] Database Status:`);
  console.log(`   - Students:            ${finalStudentCount}`);
  console.log(`   - Drives:              ${finalDriveCount}`);
  console.log(`   - Applications:        ${finalAppCount}`);
  console.log(`   - Notifications:       ${finalNotifCount}`);
  console.log(`   - Questions:           ${finalQuestionCount}`);
  console.log(`   - Mock Tests:          ${finalMockTestCount}`);
  console.log(`   - Mock Results:        ${finalMockResultCount}`);
  console.log(`   - Experiences:         ${finalExpCount}`);
  console.log(`   - Audit Logs:          ${finalAuditCount}`);
  console.log(`========================================================================\n`);

  await mongoose.disconnect();
}

runLoadTestSeed().catch(err => {
  console.error('[LoadTest Seed Error]', err);
  process.exit(1);
});
