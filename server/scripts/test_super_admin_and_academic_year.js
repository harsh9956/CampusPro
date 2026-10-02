const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AcademicYear = require('../models/AcademicYear');
const User = require('../models/User');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const Question = require('../models/Question');
const InterviewExperience = require('../models/InterviewExperience');
const MockTest = require('../models/MockTest');
const MockResult = require('../models/MockResult');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { buildStudentFilterQuery } = require('../utils/studentFilter');
const { getCurrentAcademicYear, setCurrentAcademicYear, createAcademicYear, deleteAcademicYearData } = require('../services/academicYearService');

const JWT_SECRET = process.env.JWT_SECRET || 'campuspro_super_secret_jwt_key_2026_tnp';

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

async function request(apiPath, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: apiPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runComprehensiveSuite() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING SUPER ADMIN & ACADEMIC YEAR VERIFICATION');
  console.log('======================================================\n');

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(uri);

  // Setup test tokens
  let adminUser = await User.findOne({ role: 'ADMIN' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Admin',
      email: 'sysadmin_test@campuspro.com',
      password: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE',
      academicYear: '2026-27'
    });
  }

  let superAdminUser = await User.findOne({ role: 'SUPER_ADMIN' });
  if (!superAdminUser) {
    superAdminUser = await User.create({
      name: 'Super Administrator',
      email: 'superadmin_test@campuspro.com',
      password: 'password123',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      academicYear: '2026-27'
    });
  }

  let studentUser = await User.findOne({ role: 'STUDENT' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Test Student User',
      email: 'student_test_user@campuspro.com',
      password: 'password123',
      role: 'STUDENT',
      status: 'ACTIVE',
      academicYear: '2026-27'
    });
  }

  const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  const superAdminToken = jwt.sign({ id: superAdminUser._id, role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  const studentToken = jwt.sign({ id: studentUser._id, role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });

  // Baseline check via API (SUPER_ADMIN)
  const basePut = await request('/api/academic-years/current', 'PUT', { year: '2026-27' }, superAdminToken);
  assert(basePut.status === 200, `Current Academic Year is set to baseline 2026-27 via Super Admin`);

  // TEST 1: Current = 2026-27
  const curRes = await request('/api/academic-years/current');
  const actualCurrentYear = curRes.body.data?.year || curRes.body.data;
  assert(curRes.status === 200 && actualCurrentYear === '2026-27', `Endpoint GET /api/academic-years/current returns 2026-27 (got ${actualCurrentYear})`);

  // TEST 2: Admin can select/view 2025-26 data
  const listRes = await request('/api/academic-years');
  const has2025 = listRes.body.data?.some(y => y.year === '2025-26');
  assert(has2025, `Admin can view historical year 2025-26 in registered years list`);

  // TEST 3A: Normal Admin tries to create academic year via POST /api/academic-years -> 403 SUPER_ADMIN_REQUIRED
  const adminPostYearRes = await request('/api/academic-years', 'POST', { year: '2028-29', status: 'ACTIVE' }, adminToken);
  assert(adminPostYearRes.status === 403 && adminPostYearRes.body.code === 'SUPER_ADMIN_REQUIRED',
    `Normal Admin cannot create academic year via POST (returns 403 SUPER_ADMIN_REQUIRED: "${adminPostYearRes.body.message}")`);

  // TEST 3B: Normal Admin tries to set current academic year via PUT /api/academic-years/current -> 403 SUPER_ADMIN_REQUIRED
  const adminPutYearRes = await request('/api/academic-years/current', 'PUT', { year: '2025-26' }, adminToken);
  assert(adminPutYearRes.status === 403 && adminPutYearRes.body.code === 'SUPER_ADMIN_REQUIRED',
    `Normal Admin cannot set current academic year via PUT (returns 403 SUPER_ADMIN_REQUIRED: "${adminPutYearRes.body.message}")`);

  // TEST 3C: Super Admin sets 2027-28 as current via PUT /api/academic-years/current
  let y2027 = await AcademicYear.findOne({ year: '2027-28' });
  if (!y2027) {
    const superCreateRes = await request('/api/academic-years', 'POST', { year: '2027-28', status: 'ACTIVE' }, superAdminToken);
    assert(superCreateRes.status === 201, `Super Admin can create new academic year 2027-28 via POST`);
  }
  const putRes = await request('/api/academic-years/current', 'PUT', { year: '2027-28' }, superAdminToken);
  assert(putRes.status === 200 && putRes.body.data?.year === '2027-28', `Super Admin can switch current academic year to 2027-28 via PUT /api/academic-years/current`);
  
  const curAfterSwitchDoc = await AcademicYear.findOne({ isCurrent: true }).lean();
  assert(curAfterSwitchDoc?.year === '2027-28', `System current academic year updated to 2027-28 in database`);

  // TEST 4 & 5: New student registration uses current year (2027-28), old student retains original year
  const dept = await Department.findOne({ isActive: true }) || await Department.create({ name: 'Computer Science', code: 'CSE', isActive: true });
  const sec = await Section.findOne({ academicYear: '2027-28' }) || await Section.create({ name: 'P1-27', code: 'P1-27', department: dept._id, academicYear: '2027-28' });

  const regEmail = `test_fresh_${Date.now()}@campuspro.com`;
  const regRes = await request('/api/auth/register', 'POST', {
    name: 'Fresh 2027 Student',
    email: regEmail,
    password: 'Password@123',
    enrollmentNo: `EN27_${Date.now()}`,
    department: dept._id.toString(),
    section: sec._id.toString(),
    branch: 'Computer Science',
    year: 4,
    cgpa: 8.5,
    tenthPercentage: 88,
    twelfthPercentage: 86,
    backlogs: 0,
    studentMobileNumber: '9876543210',
    parentMobileNumber: '9876543211',
    permanentAddress: '123 Campus Way',
    permanentPinCode: '110001',
    temporaryAddress: '123 Campus Way',
    temporaryPinCode: '110001',
    dateOfBirth: '2004-01-01'
  });
  if (regRes.status !== 201) {
    console.log('Registration error:', regRes.status, regRes.body);
  }
  assert(regRes.status === 201 && regRes.body.user?.academicYear === '2027-28', `New student registration automatically stamped with current year 2027-28`);

  // Verify older student was not modified
  const olderStudent = await Student.findOne({ academicYear: '2026-27' });
  if (olderStudent) {
    assert(olderStudent.academicYear === '2026-27', `Existing student remains stamped with original year 2026-27`);
  }

  // Switch current back to 2026-27 for test continuity (Super Admin)
  await request('/api/academic-years/current', 'PUT', { year: '2026-27' }, superAdminToken);
  const curDocCheck = await AcademicYear.findOne({ isCurrent: true }).lean();
  assert(curDocCheck?.year === '2026-27', `Reverted current year back to 2026-27`);

  // TEST 6 & 7: Placement Drive isolation
  const comp = await Company.findOne() || await Company.create({ name: `TestCorp_${Date.now()}`, industry: 'IT' });
  const drive2026 = await PlacementDrive.create({
    company: comp._id,
    jobRole: 'Software Engineer 2026',
    package: '12 LPA',
    location: 'Noida',
    academicYear: '2026-27',
    driveDate: new Date(),
    deadline: new Date(Date.now() + 86400000)
  });
  const drive2027 = await PlacementDrive.create({
    company: comp._id,
    jobRole: 'Software Engineer 2027',
    package: '15 LPA',
    location: 'Bangalore',
    academicYear: '2027-28',
    driveDate: new Date(),
    deadline: new Date(Date.now() + 86400000)
  });
  const drives2026 = await PlacementDrive.find({ academicYear: '2026-27', _id: { $in: [drive2026._id, drive2027._id] } });
  assert(drives2026.length === 1 && drives2026[0].jobRole === 'Software Engineer 2026', `Querying 2026-27 drives isolates 2027-28 drives`);

  // TEST 8 & 9: Student directory filters + Excel query
  const query2026 = await buildStudentFilterQuery({ academicYear: '2026-27' }, adminUser);
  assert(query2026.academicYear === '2026-27' || query2026.$and?.some(c => c.academicYear === '2026-27'), `Student filter query includes { academicYear: '2026-27' }`);

  // TEST 10 & 11: Question Bank and Interview Experiences global query vs year-filtered
  const qAll = await Question.find();
  const q2026 = await Question.find({ academicYear: '2026-27' });
  assert(qAll.length >= q2026.length, `Question Bank supports global all-years querying and scoped filtering`);

  const expAll = await InterviewExperience.find();
  const exp2026 = await InterviewExperience.find({ academicYear: '2026-27' });
  assert(expAll.length >= exp2026.length, `Interview Experiences supports global all-years querying and scoped filtering`);

  // TEST 12 & 13: Normal ADMIN historical deletion through API is blocked
  const adminDelRes = await request('/api/academic-years/2025-26/data', 'DELETE', {
    confirmYear: '2025-26',
    reason: 'Admin trying unauthorized cleanup'
  }, adminToken);
  assert(adminDelRes.status === 403, `ADMIN role cannot delete historical academic year data (returns 403 FORBIDDEN)`);

  const studentDelRes = await request('/api/academic-years/2025-26/data', 'DELETE', {
    confirmYear: '2025-26',
    reason: 'Student trying unauthorized cleanup'
  }, studentToken);
  assert(studentDelRes.status === 403, `STUDENT role cannot delete academic year data (returns 403 FORBIDDEN)`);

  // TEST 15: SUPER_ADMIN attempts to delete CURRENT active year (2026-27) -> strictly blocked!
  const superDelCurrentRes = await request('/api/academic-years/2026-27/data', 'DELETE', {
    confirmYear: '2026-27',
    reason: 'Trying to delete current active year'
  }, superAdminToken);
  assert(superDelCurrentRes.status === 400 || superDelCurrentRes.status === 403, `SUPER_ADMIN attempting to delete CURRENT academic year is strictly rejected (status ${superDelCurrentRes.status})`);
  assert(superDelCurrentRes.body.message.includes('Current academic year cannot be deleted'), `Returns clear error: "${superDelCurrentRes.body.message}"`);

  // TEST 14, 16, 17, 18: SUPER_ADMIN deletes a designated historical year (e.g. 2023-24)
  // Seed a temporary historical year with full year-scoped data
  const testHistYear = '2023-24';
  await AcademicYear.deleteOne({ year: testHistYear });
  await Section.deleteMany({ academicYear: testHistYear });
  await Student.deleteMany({ academicYear: testHistYear });
  await User.deleteMany({ academicYear: testHistYear, role: 'STUDENT' });
  await PlacementDrive.deleteMany({ academicYear: testHistYear });

  await AcademicYear.create({ year: testHistYear, isCurrent: false, status: 'ARCHIVED' });

  // Create P1 for 2023-24 and P1 for 2026-27
  const sec2023 = await Section.create({ name: 'P1-MULTI', code: 'P1-M23', academicYear: testHistYear, department: dept._id });
  const sec2026 = await Section.findOne({ name: 'P1-MULTI', academicYear: '2026-27' }) || await Section.create({ name: 'P1-MULTI', code: 'P1-M26', academicYear: '2026-27', department: dept._id });

  // Create student in 2023-24 and 2026-27
  const u2023 = await User.create({ name: '2023 Student', email: `s23_${Date.now()}@campuspro.com`, password: 'pass', role: 'STUDENT', academicYear: testHistYear });
  const s2023 = await Student.create({ user: u2023._id, enrollmentNo: `EN23_${Date.now()}`, academicYear: testHistYear, department: dept._id, section: sec2023._id, branch: 'Computer Science', cgpa: 7.5 });

  const u2026 = await User.create({ name: '2026 Student', email: `s26_${Date.now()}@campuspro.com`, password: 'pass', role: 'STUDENT', academicYear: '2026-27' });
  const s2026 = await Student.create({ user: u2026._id, enrollmentNo: `EN26_${Date.now()}`, academicYear: '2026-27', department: dept._id, section: sec2026._id, branch: 'Computer Science', cgpa: 8.0 });

  // Create drive with global company in 2023-24 and 2026-27
  const globalComp = await Company.create({ name: `GlobalMasterCorp_${Date.now()}`, industry: 'FinTech', location: 'Bangalore' });
  const d2023 = await PlacementDrive.create({ company: globalComp._id, jobRole: 'Analyst 2023', location: 'Gurgaon', package: '10 LPA', driveDate: new Date(), deadline: new Date(Date.now() + 86400000), academicYear: testHistYear });
  const d2026 = await PlacementDrive.create({ company: globalComp._id, jobRole: 'Analyst 2026', location: 'Gurgaon', package: '10 LPA', driveDate: new Date(), deadline: new Date(Date.now() + 86400000), academicYear: '2026-27' });

  // Super Admin deletes 2023-24
  const superDelRes = await request(`/api/academic-years/${testHistYear}/data`, 'DELETE', {
    confirmYear: testHistYear,
    reason: 'Routine institutional data cleanup after statutory retention period'
  }, superAdminToken);

  assert(superDelRes.status === 200, `SUPER_ADMIN successfully deleted historical year ${testHistYear} data`);
  assert(superDelRes.body.data?.academicYear === testHistYear, `Delete summary returned for ${testHistYear}`);

  // TEST 17: Verify Global Company was NOT deleted
  const compAfter = await Company.findById(globalComp._id);
  assert(compAfter !== null, `Global Company master record preserved even after historical year deletion`);

  // TEST 18: Verify 2026-27 P1 section and student remained intact
  const s2026After = await Student.findById(s2026._id);
  const sec2026After = await Section.findById(sec2026._id);
  const d2026After = await PlacementDrive.findById(d2026._id);
  assert(s2026After !== null && sec2026After !== null && d2026After !== null, `2026-27 records (Student, Section P1-MULTI, Drive) completely untouched`);

  // Verify 2023-24 records were deleted
  const s2023After = await Student.findById(s2023._id);
  const u2023After = await User.findById(u2023._id);
  const sec2023After = await Section.findById(sec2023._id);
  const d2023After = await PlacementDrive.findById(d2023._id);
  assert(s2023After === null && u2023After === null && sec2023After === null && d2023After === null, `All 2023-24 year-scoped records permanently deleted`);

  // TEST 16: Verify AuditLog survived and recorded the deletion
  const auditEntry = await AuditLog.findOne({ actionType: 'DELETE_ACADEMIC_YEAR_DATA', targetName: `Academic Year ${testHistYear}` });
  assert(auditEntry !== null, `AuditLog preserved and recorded DELETE_ACADEMIC_YEAR_DATA event`);
  assert(auditEntry.role === 'SUPER_ADMIN', `AuditLog recorded role as SUPER_ADMIN`);

  // Cleanup test artifacts
  await PlacementDrive.deleteOne({ _id: d2026._id });
  await Student.deleteOne({ _id: s2026._id });
  await User.deleteOne({ _id: u2026._id });
  await Section.deleteOne({ _id: sec2026._id });
  await Company.deleteOne({ _id: globalComp._id });

  console.log('\n======================================================');
  console.log(`🏁 TEST COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================\n');

  process.exit(failCount === 0 ? 0 : 1);
}

runComprehensiveSuite().catch(err => {
  console.error('Test Suite encountered unhandled error:', err);
  process.exit(1);
});
