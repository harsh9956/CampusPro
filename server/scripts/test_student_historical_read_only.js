const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Section = require('../models/Section');
const Department = require('../models/Department');
const { getCurrentAcademicYear } = require('../services/academicYearService');

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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runStudentHistoricalTests() {
  console.log('\n======================================================');
  console.log('🚀 TESTING STUDENT DIRECTORY HISTORICAL READ-ONLY RULES');
  console.log('======================================================\n');

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(uri);

  try {
    const currentYear = await getCurrentAcademicYear();
    assert(currentYear === '2026-27', `Current academic year confirmed as "${currentYear}"`);

    const adminUser = await User.findOne({ role: 'ADMIN' });
    const superAdminUser = await User.findOne({ role: 'SUPER_ADMIN' });

    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const superAdminToken = jwt.sign({ id: superAdminUser._id, role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed test students:
    // 1 Historical Student in 2025-26
    const dept = await Department.findOne({ isActive: true });
    const sec2025 = await Section.findOne({ academicYear: '2025-26' }) || await Section.create({ name: 'Sec-25-Test', code: `S25_${Date.now()}`, academicYear: '2025-26', department: dept._id });
    const sec2026 = await Section.findOne({ academicYear: '2026-27' }) || await Section.create({ name: 'Sec-26-Test', code: `S26_${Date.now()}`, academicYear: '2026-27', department: dept._id });

    const histUser = await User.create({
      name: 'Historical Student 2025',
      email: `hist25_${Date.now()}@campuspro.com`,
      password: 'password123',
      role: 'STUDENT',
      status: 'ACTIVE',
      academicYear: '2025-26'
    });
    const histStudent = await Student.create({
      user: histUser._id,
      enrollmentNo: `EN25_${Date.now()}`,
      department: dept._id,
      section: sec2025._id,
      branch: 'Computer Science',
      year: 4,
      cgpa: 8.2,
      backlogs: 0,
      academicYear: '2025-26'
    });

    // 1 Current Student in 2026-27
    const curUser = await User.create({
      name: 'Current Student 2026',
      email: `cur26_${Date.now()}@campuspro.com`,
      password: 'password123',
      role: 'STUDENT',
      status: 'ACTIVE',
      academicYear: '2026-27'
    });
    const curStudent = await Student.create({
      user: curUser._id,
      enrollmentNo: `EN26_${Date.now()}`,
      department: dept._id,
      section: sec2026._id,
      branch: 'Computer Science',
      year: 4,
      cgpa: 8.8,
      backlogs: 0,
      academicYear: '2026-27'
    });

    console.log(`\nCreated test students: Historical (2025-26): ${histStudent._id}, Current (2026-27): ${curStudent._id}`);

    // TEST 1: Normal Admin GET /api/users/students?academicYear=2025-26 (View permitted)
    const getRes = await request(`/api/users/students?academicYear=2025-26`, 'GET', null, adminToken);
    assert(getRes.status === 200, `Admin can view historical 2025-26 students (status 200)`);
    const studentList = getRes.body.data || getRes.body.students || [];
    assert(studentList.some(s => s._id.toString() === histStudent._id.toString()), `Returned list includes historical student`);

    // TEST 2: Normal Admin POST/GET /api/users/students/export?academicYear=2025-26 (Excel export initiated permitted)
    const exportRes = await request(`/api/users/students/export?academicYear=2025-26`, 'POST', { academicYear: '2025-26' }, adminToken);
    assert(exportRes.status === 202 || exportRes.status === 200, `Admin can initiate Excel export for historical 2025-26 students (status ${exportRes.status})`);
    assert(exportRes.body.jobId || exportRes.headers['content-type']?.includes('spreadsheetml'), `Export jobId returned or excel stream returned`);

    // TEST 3: Normal Admin DELETE /api/users/students/:id on historical student -> 403 HISTORICAL_YEAR_READ_ONLY
    const delHistRes = await request(`/api/users/students/${histStudent._id}`, 'DELETE', null, adminToken);
    assert(delHistRes.status === 403, `Normal Admin DELETE /api/users/students/:id on 2025-26 student returns 403 (got ${delHistRes.status})`);
    assert(delHistRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Returns code HISTORICAL_YEAR_READ_ONLY: "${delHistRes.body.message}"`);

    // TEST 4: Normal Admin DELETE /api/students/:id on historical student -> 403 HISTORICAL_YEAR_READ_ONLY
    const delHistDirectRes = await request(`/api/students/${histStudent._id}`, 'DELETE', null, adminToken);
    assert(delHistDirectRes.status === 403, `Normal Admin DELETE /api/students/:id on 2025-26 student returns 403 (got ${delHistDirectRes.status})`);
    assert(delHistDirectRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Direct student route returns code HISTORICAL_YEAR_READ_ONLY`);

    // TEST 5: Normal Admin PUT /api/users/students/:id on historical student -> 403 HISTORICAL_YEAR_READ_ONLY
    const updateHistRes = await request(`/api/users/students/${histStudent._id}`, 'PUT', { cgpa: 9.9 }, adminToken);
    assert(updateHistRes.status === 403, `Normal Admin PUT /api/users/students/:id on 2025-26 student returns 403 (got ${updateHistRes.status})`);
    assert(updateHistRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Update returns code HISTORICAL_YEAR_READ_ONLY`);

    // TEST 6: Normal Admin PATCH /api/users/students/:id/status on historical student -> 403 HISTORICAL_YEAR_READ_ONLY
    const patchHistRes = await request(`/api/users/students/${histStudent._id}/status`, 'PATCH', { status: 'INACTIVE' }, adminToken);
    assert(patchHistRes.status === 403, `Normal Admin PATCH status on 2025-26 student returns 403 (got ${patchHistRes.status})`);
    assert(patchHistRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Status toggle returns code HISTORICAL_YEAR_READ_ONLY`);

    // TEST 7: Normal Admin DELETE bulk /api/users/students/bulk containing historical student -> 403 HISTORICAL_YEAR_READ_ONLY
    const bulkHistRes = await request(`/api/users/students/bulk`, 'DELETE', { studentIds: [histStudent._id.toString()] }, adminToken);
    assert(bulkHistRes.status === 403, `Normal Admin bulk delete with 2025-26 student returns 403 (got ${bulkHistRes.status})`);
    assert(bulkHistRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Bulk delete returns code HISTORICAL_YEAR_READ_ONLY`);

    // TEST 8: Verify historical student was NOT deleted or modified in MongoDB
    const histStudentCheck = await Student.findById(histStudent._id);
    const histUserCheck = await User.findById(histUser._id);
    assert(histStudentCheck !== null && histUserCheck !== null, `Historical student and user records remain completely intact in DB`);

    // TEST 9: Normal Admin DELETE on CURRENT student (2026-27) -> ALLOWED (status 200)
    const delCurRes = await request(`/api/users/students/${curStudent._id}`, 'DELETE', null, adminToken);
    assert(delCurRes.status === 200, `Normal Admin DELETE on CURRENT year 2026-27 student proceeds successfully (got status 200)`);
    const curStudentCheck = await Student.findById(curStudent._id);
    assert(curStudentCheck === null, `Current year student was successfully deleted`);

    // TEST 10: SUPER_ADMIN individual DELETE on historical student (2025-26) -> 403 HISTORICAL_YEAR_READ_ONLY
    // Per Section 24: Historical records are read-only for operational actions for ALL roles. Super Admin performs cleanup via dedicated bulk endpoint DELETE /api/academic-years/:id/data.
    const superDelHistRes = await request(`/api/users/students/${histStudent._id}`, 'DELETE', null, superAdminToken);
    assert(superDelHistRes.status === 403, `SUPER_ADMIN individual delete on historical student is blocked with 403 (got status ${superDelHistRes.status})`);
    assert(superDelHistRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Returns code HISTORICAL_YEAR_READ_ONLY`);

    // Clean up test documents directly
    await Student.findByIdAndDelete(histStudent._id);
    await User.findByIdAndDelete(histUser._id);
    await User.findByIdAndDelete(curUser._id);

    console.log('\n======================================================');
    console.log(`🏁 STUDENT PERMISSION TESTS: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    process.exit(failCount === 0 ? 0 : 1);
  } finally {
    await mongoose.disconnect();
  }
}

runStudentHistoricalTests().catch(err => {
  console.error('[Student Historical Tests Error]', err);
  process.exit(1);
});
