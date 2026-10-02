const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AcademicYear = require('../models/AcademicYear');
const User = require('../models/User');
const Student = require('../models/Student');
const Section = require('../models/Section');
const Department = require('../models/Department');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const { getCurrentAcademicYear, setCurrentAcademicYear } = require('../services/academicYearService');

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

async function runMandatory12Tests() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING 12 MANDATORY TEST CASES: SUPER ADMIN RESTRICTION');
  console.log('================================================================\n');

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(uri);

  try {
    const adminUser = await User.findOne({ role: 'ADMIN' });
    const superAdminUser = await User.findOne({ role: 'SUPER_ADMIN' });

    const adminToken = jwt.sign({ id: adminUser._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    const superAdminToken = jwt.sign({ id: superAdminUser._id, role: 'SUPER_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

    // Set baseline current year to 2026-27
    await request('/api/academic-years/current', 'PUT', { year: '2026-27' }, superAdminToken);

    // -----------------------------------------------------------------
    // TEST 1: Registered years visible to Normal Admin (GET /api/academic-years)
    // -----------------------------------------------------------------
    console.log('[Test 1] Testing Registered Academic Years list for Normal Admin...');
    const listRes = await request('/api/academic-years', 'GET', null, adminToken);
    assert(listRes.status === 200, 'Normal Admin can retrieve academic years list (status 200)');
    const yearList = listRes.body.data || [];
    assert(yearList.length >= 3, `Registered academic years found (${yearList.length} total)`);
    assert(yearList.some(y => y.year === '2026-27') && yearList.some(y => y.year === '2025-26'), 'Includes 2026-27 and 2025-26');

    // -----------------------------------------------------------------
    // TEST 2: Super Admin API access
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Testing Super Admin endpoints access...');
    const superListRes = await request('/api/academic-years', 'GET', null, superAdminToken);
    assert(superListRes.status === 200, 'Super Admin can retrieve academic years list');

    // -----------------------------------------------------------------
    // TEST 3: Normal Admin tries POST /api/academic-years -> 403 SUPER_ADMIN_REQUIRED
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Testing Normal Admin blocked from POST create academic year...');
    const testNewYear = '2029-30';
    const adminCreateRes = await request('/api/academic-years', 'POST', { year: testNewYear, status: 'ACTIVE' }, adminToken);
    assert(adminCreateRes.status === 403, `Normal Admin POST /api/academic-years returns HTTP 403 (got ${adminCreateRes.status})`);
    assert(adminCreateRes.body.code === 'SUPER_ADMIN_REQUIRED', `Returns code 'SUPER_ADMIN_REQUIRED': "${adminCreateRes.body.message}"`);

    // -----------------------------------------------------------------
    // TEST 4: Normal Admin tries PUT/PATCH set current year -> 403 SUPER_ADMIN_REQUIRED
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Testing Normal Admin blocked from PUT/PATCH set current academic year...');
    const adminPutCurrentRes = await request('/api/academic-years/current', 'PUT', { year: '2025-26' }, adminToken);
    assert(adminPutCurrentRes.status === 403, `Normal Admin PUT /api/academic-years/current returns HTTP 403 (got ${adminPutCurrentRes.status})`);
    assert(adminPutCurrentRes.body.code === 'SUPER_ADMIN_REQUIRED', `Returns code 'SUPER_ADMIN_REQUIRED': "${adminPutCurrentRes.body.message}"`);

    const adminPatchCurrentRes = await request('/api/academic-years/current', 'PATCH', { year: '2025-26' }, adminToken);
    assert(adminPatchCurrentRes.status === 403, `Normal Admin PATCH /api/academic-years/current returns HTTP 403 (got ${adminPatchCurrentRes.status})`);
    assert(adminPatchCurrentRes.body.code === 'SUPER_ADMIN_REQUIRED', `Returns code 'SUPER_ADMIN_REQUIRED'`);

    // -----------------------------------------------------------------
    // TEST 5: Super Admin creates 2029-30 -> appears in registered years
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Testing Super Admin creates dynamic academic year...');
    await AcademicYear.deleteOne({ year: testNewYear });
    const superCreateRes = await request('/api/academic-years', 'POST', { year: testNewYear, status: 'ACTIVE' }, superAdminToken);
    assert(superCreateRes.status === 201, `Super Admin creates ${testNewYear} (status 201)`);

    const checkListRes = await request('/api/academic-years', 'GET', null, adminToken);
    assert(checkListRes.body.data?.some(y => y.year === testNewYear), `${testNewYear} appears in registered years for all users`);

    // -----------------------------------------------------------------
    // TEST 6: Super Admin sets 2029-30 as Current -> Current Academic Year becomes 2029-30
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Testing Super Admin sets 2029-30 as Current...');
    const superSetCurrentRes = await request('/api/academic-years/current', 'PUT', { year: testNewYear }, superAdminToken);
    assert(superSetCurrentRes.status === 200, `Super Admin sets ${testNewYear} as Current Academic Year`);

    const currentDoc = await AcademicYear.findOne({ isCurrent: true }).lean();
    assert(currentDoc?.year === testNewYear, `Database confirms current academic year is ${testNewYear}`);

    // -----------------------------------------------------------------
    // TEST 7: Normal Admin checks current academic year -> shows 2029-30
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Testing Normal Admin queries current academic year...');
    const curRes = await request('/api/academic-years/current', 'GET', null, adminToken);
    const apiCurrentYear = curRes.body.data?.year || curRes.body.data;
    assert(apiCurrentYear === testNewYear, `Normal Admin reads updated current academic year as ${testNewYear}`);

    // -----------------------------------------------------------------
    // TEST 8: Normal Admin selects 2026-27 (now historical) -> Historical read-only mode, mutations blocked
    // -----------------------------------------------------------------
    console.log('\n[Test 8] Testing 2026-27 is now historical for Normal Admin...');
    // Create a student in 2026-27
    const dept = await Department.findOne({ isActive: true });
    const sec2026 = await Section.findOne({ academicYear: '2026-27' }) || await Section.create({ name: 'Sec-26-Test8', code: `S26_${Date.now()}`, academicYear: '2026-27', department: dept._id });
    const u2026 = await User.create({ name: 'Test 2026 Student', email: `test26_${Date.now()}@campuspro.com`, password: 'pass', role: 'STUDENT', academicYear: '2026-27' });
    const s2026 = await Student.create({ user: u2026._id, enrollmentNo: `EN26_${Date.now()}`, academicYear: '2026-27', department: dept._id, section: sec2026._id, branch: 'Computer Science', cgpa: 8.5 });

    // Normal Admin attempts to delete this 2026-27 student (which is now historical since current is 2029-30)
    const adminDeleteHistoricalRes = await request(`/api/users/students/${s2026._id}`, 'DELETE', null, adminToken);
    assert(adminDeleteHistoricalRes.status === 403, `Normal Admin DELETE on 2026-27 student is blocked (status 403)`);
    assert(adminDeleteHistoricalRes.body.code === 'HISTORICAL_YEAR_READ_ONLY', `Returns code 'HISTORICAL_YEAR_READ_ONLY'`);

    // -----------------------------------------------------------------
    // TEST 9: Normal Admin operates on 2029-30 (Current) -> CRUD functionality permitted
    // -----------------------------------------------------------------
    console.log('\n[Test 9] Testing Normal Admin CRUD on current year 2029-30...');
    const sec2029 = await Section.create({ name: `Sec-29-${Date.now()}`, code: `S29_${Date.now()}`, academicYear: testNewYear, department: dept._id });
    const u2029 = await User.create({ name: 'Test 2029 Student', email: `test29_${Date.now()}@campuspro.com`, password: 'pass', role: 'STUDENT', academicYear: testNewYear });
    const s2029 = await Student.create({ user: u2029._id, enrollmentNo: `EN29_${Date.now()}`, academicYear: testNewYear, department: dept._id, section: sec2029._id, branch: 'Computer Science', cgpa: 9.0 });

    const adminDeleteCurrentRes = await request(`/api/users/students/${s2029._id}`, 'DELETE', null, adminToken);
    assert(adminDeleteCurrentRes.status === 200, `Normal Admin DELETE on current year (${testNewYear}) student succeeds (status 200)`);

    // -----------------------------------------------------------------
    // TEST 10: Normal Admin attempts direct API request to create/change academic year -> 403
    // -----------------------------------------------------------------
    console.log('\n[Test 10] Testing Normal Admin direct API manipulation attempts...');
    const directPostRes = await request('/api/academic-years', 'POST', { year: '2030-31' }, adminToken);
    assert(directPostRes.status === 403 && directPostRes.body.code === 'SUPER_ADMIN_REQUIRED', 'Direct POST blocked with 403 SUPER_ADMIN_REQUIRED');

    const directPutRes = await request('/api/academic-years/current', 'PUT', { year: '2026-27' }, adminToken);
    assert(directPutRes.status === 403 && directPutRes.body.code === 'SUPER_ADMIN_REQUIRED', 'Direct PUT blocked with 403 SUPER_ADMIN_REQUIRED');

    // -----------------------------------------------------------------
    // TEST 11: Super Admin selects historical 2024-25 and performs allowed cleanup -> isolated
    // -----------------------------------------------------------------
    console.log('\n[Test 11] Testing Super Admin historical cleanup isolation...');
    const testCleanupYear = '2024-25';
    // Ensure test academic year document exists for cleanup
    await AcademicYear.findOneAndUpdate(
      { year: testCleanupYear },
      { year: testCleanupYear, isCurrent: false, status: 'ARCHIVED' },
      { upsert: true, new: true }
    );

    const sec2024 = await Section.create({ name: `Sec-24-${Date.now()}`, code: `S24_${Date.now()}`, academicYear: testCleanupYear, department: dept._id });
    const u2024 = await User.create({ name: 'Test 2024 Student', email: `test24_${Date.now()}@campuspro.com`, password: 'pass', role: 'STUDENT', academicYear: testCleanupYear });
    const s2024 = await Student.create({ user: u2024._id, enrollmentNo: `EN24_${Date.now()}`, academicYear: testCleanupYear, department: dept._id, section: sec2024._id, branch: 'Computer Science', cgpa: 7.0 });

    const superCleanupRes = await request(`/api/academic-years/${testCleanupYear}/data`, 'DELETE', {
      confirmYear: testCleanupYear,
      reason: 'Institutional statutory retention cleanup'
    }, superAdminToken);
    if (superCleanupRes.status !== 200) {
      console.log('Cleanup error details:', superCleanupRes.status, superCleanupRes.body);
    }
    assert(superCleanupRes.status === 200, `Super Admin cleanup of historical ${testCleanupYear} succeeded (status 200)`);

    // Verify 2026-27 and 2029-30 records remain untouched
    const check2026Student = await Student.findById(s2026._id);
    assert(check2026Student !== null, 'Records belonging to 2026-27 are completely untouched by cleanup');

    // -----------------------------------------------------------------
    // TEST 12: Super Admin attempts historical cleanup on current year -> Blocked by current-year safety
    // -----------------------------------------------------------------
    console.log('\n[Test 12] Testing Super Admin cleanup on CURRENT active year blocked...');
    const superCleanCurrentRes = await request(`/api/academic-years/${testNewYear}/data`, 'DELETE', {
      confirmYear: testNewYear,
      reason: 'Attempting to cleanup current year'
    }, superAdminToken);
    assert(superCleanCurrentRes.status === 400 || superCleanCurrentRes.status === 403, `Super Admin cleanup on CURRENT year (${testNewYear}) strictly rejected (status ${superCleanCurrentRes.status})`);
    assert(superCleanCurrentRes.body.message.includes('Current academic year cannot be deleted'), `Returned error: "${superCleanCurrentRes.body.message}"`);

    // Reset current academic year back to 2026-27 and ensure baseline years are restored
    await request('/api/academic-years/current', 'PUT', { year: '2026-27' }, superAdminToken);
    await AcademicYear.deleteOne({ year: testNewYear });
    await AcademicYear.findOneAndUpdate(
      { year: '2024-25' },
      { year: '2024-25', isCurrent: false, status: 'ARCHIVED' },
      { upsert: true }
    );
    await AcademicYear.findOneAndUpdate(
      { year: '2025-26' },
      { year: '2025-26', isCurrent: false, status: 'COMPLETED' },
      { upsert: true }
    );
    await Section.deleteOne({ _id: sec2029._id });
    await Student.deleteOne({ _id: s2026._id });
    await User.deleteOne({ _id: u2026._id });
    await Section.deleteOne({ _id: sec2026._id });

    console.log('\n================================================================');
    console.log(`🏁 MANDATORY 12 TESTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================\n');

    process.exit(failCount === 0 ? 0 : 1);
  } finally {
    await mongoose.disconnect();
  }
}

runMandatory12Tests().catch(err => {
  console.error('[Mandatory 12 Tests Error]', err);
  process.exit(1);
});
