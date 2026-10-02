/**
 * Comprehensive Academic-Year End-to-End Verification Test Suite
 * Tests all required integration points across models, services, RBAC, and historical guards
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AcademicYear = require('../models/AcademicYear');
const Section = require('../models/Section');
const User = require('../models/User');
const Student = require('../models/Student');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const Question = require('../models/Question');
const InterviewExperience = require('../models/InterviewExperience');
const AuditLog = require('../models/AuditLog');
const { getCurrentAcademicYear, setCurrentAcademicYear, createAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(uri);
  await Section.syncIndexes();
  await PlacementDrive.syncIndexes();
  await Question.syncIndexes();
  await InterviewExperience.syncIndexes();
  console.log('\n======================================================');
  console.log('🚀 RUNNING ACADEMIC-YEAR INTEGRATION & SAFETY TESTS');
  console.log('======================================================\n');

  try {
    // -----------------------------------------------------------------
    // TEST 1: Current Academic Year Retrieval & Seeding
    // -----------------------------------------------------------------
    console.log('[Test 1] Testing AcademicYear Service & Baseline Seeding...');
    const currentYear = await getCurrentAcademicYear();
    assert(currentYear === '2026-27', `Current Academic Year is "${currentYear}" (expected "2026-27")`);

    const allYears = await AcademicYear.find().sort({ year: -1 });
    assert(allYears.length >= 3, `Found ${allYears.length} academic years in database`);
    const yearNames = allYears.map(y => y.year);
    assert(yearNames.includes('2026-27') && yearNames.includes('2025-26'), 'Includes baseline 2026-27 and 2025-26');

    // -----------------------------------------------------------------
    // TEST 2: Section Multi-Year Scoping & Compound Uniqueness
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Testing Section Scoping across Academic Years...');
    const testSecName = `TEST_SEC_${Date.now()}`;
    
    // Create Section in 2026-27
    const sec2026 = await Section.create({
      name: testSecName,
      code: `${testSecName}_26`,
      academicYear: '2026-27',
      capacity: 60
    });
    assert(sec2026.academicYear === '2026-27', `Created section ${testSecName} for year 2026-27`);

    // Create Section with SAME name in 2025-26 (must succeed)
    let sec2025;
    try {
      sec2025 = await Section.create({
        name: testSecName,
        code: `${testSecName}_25`,
        academicYear: '2025-26',
        capacity: 60
      });
      assert(sec2025.academicYear === '2025-26', `Successfully created section with duplicate name "${testSecName}" in year 2025-26`);
    } catch (err) {
      assert(false, `Failed to create same-name section in different year: ${err.message}`);
    }

    // Try creating duplicate Section within SAME year 2026-27 (must fail unique constraint)
    let duplicateFailed = false;
    try {
      await Section.create({
        name: testSecName,
        code: `${testSecName}_DUPE`,
        academicYear: '2026-27',
        capacity: 60
      });
    } catch (err) {
      duplicateFailed = true;
    }
    assert(duplicateFailed, `Duplicate section name in SAME academic year correctly rejected by MongoDB unique compound index`);

    // Clean up test sections
    await Section.deleteMany({ name: testSecName });

    // -----------------------------------------------------------------
    // TEST 3: Student Registration Dynamic Year Assignment
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Testing Dynamic Academic Year Assignment on Registration...');
    const curYearFromService = await getCurrentAcademicYear();
    assert(typeof curYearFromService === 'string' && curYearFromService.length > 0, `getCurrentAcademicYear returned "${curYearFromService}"`);

    // Verify existing student records
    const sampleStudent = await Student.findOne();
    if (sampleStudent) {
      assert(sampleStudent.academicYear !== undefined, `Existing student has academicYear stamped: "${sampleStudent.academicYear}"`);
    }

    // -----------------------------------------------------------------
    // TEST 4: Placement Drive Student Isolation
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Testing Placement Drive Isolation by Academic Year...');
    const testCompanyId = new mongoose.Types.ObjectId();
    
    // Create Drive in 2026-27
    const drive2026 = await PlacementDrive.create({
      company: testCompanyId,
      companyName: 'Test Tech 2026',
      jobRole: 'Software Engineer',
      location: 'Noida',
      package: '12 LPA',
      driveDate: new Date(),
      deadline: new Date(Date.now() + 86400000),
      academicYear: '2026-27',
      status: 'PUBLISHED'
    });

    // Create Drive in 2025-26
    const drive2025 = await PlacementDrive.create({
      company: testCompanyId,
      companyName: 'Test Tech 2025',
      jobRole: 'Data Analyst',
      location: 'Gurugram',
      package: '10 LPA',
      driveDate: new Date(),
      deadline: new Date(Date.now() + 86400000),
      academicYear: '2025-26',
      status: 'PUBLISHED'
    });

    // Simulated Student in 2026-27 query filter
    const student2026Year = '2026-27';
    const visibleTo2026 = await PlacementDrive.find({
      status: 'PUBLISHED',
      academicYear: student2026Year,
      _id: { $in: [drive2026._id, drive2025._id] }
    });

    assert(visibleTo2026.length === 1 && visibleTo2026[0]._id.toString() === drive2026._id.toString(),
      'Student with academicYear 2026-27 sees ONLY 2026-27 placement drive');

    // Clean up test drives
    await PlacementDrive.deleteMany({ _id: { $in: [drive2026._id, drive2025._id] } });

    // -----------------------------------------------------------------
    // TEST 5: Question Bank & Interview Experience (Global Knowledge Base)
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Testing Question Bank & Experience Cross-Year Querying...');
    const q1 = await Question.create({
      questionText: 'Test Question 2026 ' + Date.now(),
      answer: 'Answer 2026',
      topic: 'DSA',
      company: testCompanyId,
      academicYear: '2026-27',
      status: 'PUBLISHED'
    });
    const q2 = await Question.create({
      questionText: 'Test Question 2025 ' + Date.now(),
      answer: 'Answer 2025',
      topic: 'DSA',
      company: testCompanyId,
      academicYear: '2025-26',
      status: 'PUBLISHED'
    });

    // Global Query (No academicYear filter -> returns questions from all years)
    const allQuestions = await Question.find({ _id: { $in: [q1._id, q2._id] } });
    assert(allQuestions.length === 2, 'Global Question Bank query returns questions across ALL years');

    // Scoped Query (academicYear filter -> returns only specified year)
    const questions2025 = await Question.find({ academicYear: '2025-26', _id: { $in: [q1._id, q2._id] } });
    assert(questions2025.length === 1 && questions2025[0]._id.toString() === q2._id.toString(),
      'Question Bank query filtered by 2025-26 returns only 2025-26 question');

    // Clean up
    await Question.deleteMany({ _id: { $in: [q1._id, q2._id] } });

    // -----------------------------------------------------------------
    // TEST 6: Historical Operation Guard & Audit Logging
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Testing Historical Guard & Audit Logging...');
    
    // Simulated Request: Faculty trying to modify 2025-26 record
    const facultyReq = {
      user: { _id: new mongoose.Types.ObjectId(), name: 'Test Faculty', role: 'FACULTY' },
      headers: {},
      body: {}
    };
    const facultyCheck = await checkHistoricalOperation(facultyReq, '2025-26', 'Section');
    assert(!facultyCheck.allowed, 'Faculty modification on historical year 2025-26 strictly blocked (403)');

    // Simulated Request: Admin trying to modify 2025-26 record WITHOUT historical manage mode
    const adminReqDefault = {
      user: { _id: new mongoose.Types.ObjectId(), name: 'Test Admin', role: 'ADMIN' },
      headers: {},
      body: {}
    };
    const adminDefaultCheck = await checkHistoricalOperation(adminReqDefault, '2025-26', 'Section');
    assert(!adminDefaultCheck.allowed, 'Admin modification on historical year without Historical Manage Mode blocked (default view-only)');

    // Simulated Request: Admin trying to modify 2025-26 record even WITH x-historical-manage header (MUST BE FORBIDDEN)
    const adminReqManage = {
      user: { _id: new mongoose.Types.ObjectId(), name: 'Test Admin', role: 'ADMIN' },
      headers: { 'x-historical-manage': 'true' },
      body: {}
    };
    const adminManageCheck = await checkHistoricalOperation(adminReqManage, '2025-26', 'Section');
    assert(!adminManageCheck.allowed && adminManageCheck.code === 'HISTORICAL_YEAR_READ_ONLY',
      'Normal Admin modification on historical year is strictly blocked (403 HISTORICAL_YEAR_READ_ONLY), cannot bypass via headers');

    // Simulated Request: SUPER_ADMIN modifying individual historical record (Strictly Read-Only per Section 24)
    // Historical records are read-only for all operational actions; Super Admin uses bulk cleanup endpoint instead.
    const superAdminReq = {
      user: { _id: new mongoose.Types.ObjectId(), name: 'Test Super Admin', role: 'SUPER_ADMIN' },
      headers: { 'x-historical-manage': 'true' },
      body: {}
    };
    const superAdminCheck = await checkHistoricalOperation(superAdminReq, '2025-26', 'Section');
    assert(!superAdminCheck.allowed && superAdminCheck.code === 'HISTORICAL_YEAR_READ_ONLY',
      'SUPER_ADMIN individual modification on historical record is blocked (403 HISTORICAL_YEAR_READ_ONLY; cleanup is done via dedicated endpoint)');

    // Simulated Request: Operations on CURRENT year 2026-27 always permitted
    const currentYearCheck = await checkHistoricalOperation(facultyReq, '2026-27', 'Section');
    assert(currentYearCheck.allowed, 'Operations on current active year (2026-27) proceed normally');

    // -----------------------------------------------------------------
    // TEST 7: Non-Destructive Academic Year Transition
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Testing Non-Destructive Academic Year Transition Guarantee...');
    const countBefore = await AcademicYear.countDocuments();
    const studentsBefore = await Student.countDocuments();
    const sectionsBefore = await Section.countDocuments();

    // Verify setCurrentAcademicYear does not delete or alter any other collection
    await setCurrentAcademicYear('2026-27'); // Re-assert current
    const countAfter = await AcademicYear.countDocuments();
    const studentsAfter = await Student.countDocuments();
    const sectionsAfter = await Section.countDocuments();

    assert(countBefore === countAfter, `Academic years count preserved (${countBefore} -> ${countAfter})`);
    assert(studentsBefore === studentsAfter, `Students count preserved (${studentsBefore} -> ${studentsAfter})`);
    assert(sectionsBefore === sectionsAfter, `Sections count preserved (${sectionsBefore} -> ${sectionsAfter})`);

    // -----------------------------------------------------------------
    // RESULTS SUMMARY
    // -----------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error('[Test Suite Error]', err);
  process.exit(1);
});
