/**
 * Comprehensive Academic-Year Data Isolation Test Suite
 * Validates:
 * 1. Strict Year Isolation (Clean workspace for new current year)
 * 2. Uniqueness Scoped per Academic Year (Same dept/section name/code across years)
 * 3. Historical View-Only Guard (HTTP 403 HISTORICAL_YEAR_READ_ONLY for Admin mutations)
 * 4. Automatic Student Scoping to Current Year
 * 5. Super Admin Protections (Cannot delete active current year)
 * 6. Super Admin Cascade Deletion of Historical Year Data
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'campuspro_super_secret_jwt_key_2026_tnp';

function makeRequest({ method = 'GET', urlPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log(' ACADEMIC YEAR STRICT ISOLATION & SECURITY ACCEPTANCE SUITE');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro');
  console.log('Connected to MongoDB.\n');

  const User = require('./models/User');
  const AcademicYear = require('./models/AcademicYear');
  const Department = require('./models/Department');
  const Section = require('./models/Section');
  const Student = require('./models/Student');

  // Load test users
  const superAdminUser = await User.findOne({ role: 'SUPER_ADMIN' });
  const normalAdminUser = await User.findOne({ role: 'ADMIN' });

  const superAdminToken = jwt.sign(
    { id: superAdminUser._id, role: superAdminUser.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  const normalAdminToken = jwt.sign(
    { id: normalAdminUser._id, role: normalAdminUser.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Ensure 2027-28 is set as the active Current Academic Year for test scenarios
  const { setCurrentAcademicYear, createAcademicYear } = require('./services/academicYearService');
  let ay2027 = await AcademicYear.findOne({ year: '2027-28' });
  if (!ay2027) {
    ay2027 = await createAcademicYear({ year: '2027-28', user: superAdminUser });
  }
  let ay2026 = await AcademicYear.findOne({ year: '2026-27' });
  if (!ay2026) {
    ay2026 = await AcademicYear.create({
      year: '2026-27',
      isCurrent: false,
      status: 'COMPLETED',
      createdBy: superAdminUser._id
    });
  } else if (ay2026.isCurrent) {
    ay2026.isCurrent = false;
    ay2026.status = 'COMPLETED';
    await ay2026.save();
  }
  await setCurrentAcademicYear('2027-28', superAdminUser);

  // Ensure historical department fixtures exist for 2026-27
  let histDept = await Department.findOne({ academicYear: '2026-27', code: 'CSE' });
  if (!histDept) {
    histDept = await Department.create({
      name: 'Computer Science and Engineering',
      code: 'CSE',
      academicYear: '2026-27'
    });
  }
  let histDept2 = await Department.findOne({ academicYear: '2026-27', code: 'ECE' });
  if (!histDept2) {
    histDept2 = await Department.create({
      name: 'Electronics and Communication Engineering',
      code: 'ECE',
      academicYear: '2026-27'
    });
  }

  // Ensure fresh clean state for 2027-28 test execution
  await Department.deleteMany({ academicYear: '2027-28' });
  await Section.deleteMany({ academicYear: '2027-28' });
  await Student.deleteMany({ academicYear: '2027-28' });

  console.log('--- TEST GROUP 1: Academic Year Status & Clean Workspace ---');
  // 1. Verify Active Year
  const currentAY = await AcademicYear.findOne({ isCurrent: true });
  assert(currentAY && currentAY.year === '2027-28', `Current Academic Year is 2027-28 (found: ${currentAY?.year})`);

  const historicalAY = await AcademicYear.findOne({ year: '2026-27' });
  assert(historicalAY && historicalAY.isCurrent === false, 'Historical Academic Year 2026-27 exists and isCurrent is false');

  // 2. Fetch departments and sections for 2027-28 (clean workspace initially)
  const resDepts2027 = await makeRequest({
    method: 'GET',
    urlPath: '/api/departments?academicYear=2027-28',
    headers: { Authorization: `Bearer ${normalAdminToken}` }
  });
  assert(resDepts2027.data?.length === 0, `Clean workspace: 0 departments exist initially for new Current Year 2027-28 (got ${resDepts2027.data?.length})`);
  
  const resSecs2027 = await makeRequest({
    method: 'GET',
    urlPath: '/api/sections?academicYear=2027-28',
    headers: { Authorization: `Bearer ${normalAdminToken}` }
  });
  assert(resSecs2027.data?.length === 0, `Clean workspace: 0 sections exist initially for new Current Year 2027-28 (got ${resSecs2027.data?.length})`);

  console.log('\n--- TEST GROUP 2: Year-Scoped Creation (Cross-Year Name/Code Collisions Allowed) ---');
  // 3. Create Department 'Computer Science & Engineering' (code: 'CSE') in 2027-28
  // Note: 'CSE' already exists in 2026-27
  let newDept2027Id = null;
  const createDeptRes = await makeRequest({
    method: 'POST',
    urlPath: '/api/departments',
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science in 2027-28',
      academicYear: '2027-28'
    }
  });

  if (createDeptRes.status === 201) {
    assert(true, 'Successfully created department CSE in 2027-28 despite CSE existing in 2026-27');
    newDept2027Id = createDeptRes.data?.department?._id || createDeptRes.data?._id;
  } else if (createDeptRes.status === 200 || (createDeptRes.status === 409 && createDeptRes.data?.message?.includes('already exists'))) {
    // If already created in a previous test run
    const existing = await Department.findOne({ code: 'CSE', academicYear: '2027-28' });
    if (existing) {
      assert(true, 'Department CSE in 2027-28 exists in database');
      newDept2027Id = existing._id;
    } else {
      assert(false, `Failed to create department: ${JSON.stringify(createDeptRes.data)}`);
    }
  } else {
    assert(false, `Failed to create department CSE in 2027-28: ${JSON.stringify(createDeptRes.data)}`);
  }

  // 4. Create Section 'P1' (code: 'P1') in 2027-28
  // Note: 'P1' already exists in 2026-27
  let newSec2027Id = null;
  const createSecRes = await makeRequest({
    method: 'POST',
    urlPath: '/api/sections',
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: {
      name: 'P1',
      code: 'P1',
      academicYear: '2027-28'
    }
  });

  if (createSecRes.status === 201) {
    assert(true, 'Successfully created section P1 in 2027-28 despite P1 existing in 2026-27');
    newSec2027Id = createSecRes.data?.section?._id || createSecRes.data?.data?._id || createSecRes.data?._id;
  } else if (createSecRes.status === 200 || (createSecRes.status === 409 && createSecRes.data?.message?.includes('already exists'))) {
    const existingSec = await Section.findOne({ code: 'P1', academicYear: '2027-28' });
    if (existingSec) {
      assert(true, 'Section P1 in 2027-28 exists in database');
      newSec2027Id = existingSec._id;
    } else {
      assert(false, `Failed to create section: ${JSON.stringify(createSecRes.data)}`);
    }
  } else {
    assert(false, `Failed to create section P1 in 2027-28: ${JSON.stringify(createSecRes.data)}`);
  }

  // 5. Attempt duplicate Department creation within the SAME year (2027-28) -> Must fail
  const dupDeptRes = await makeRequest({
    method: 'POST',
    urlPath: '/api/departments',
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      academicYear: '2027-28'
    }
  });
  assert(
    dupDeptRes.status === 400 || dupDeptRes.status === 409,
    `Intra-year duplicate department creation correctly rejected with 400/409 (got ${dupDeptRes.status})`
  );

  console.log('\n--- TEST GROUP 3: Historical Year Read-Only Enforcement (HTTP 403) ---');
  // 6. Normal Admin attempts to create Department in historical year 2026-27
  const histDeptCreate = await makeRequest({
    method: 'POST',
    urlPath: '/api/departments',
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: {
      name: 'Illegal Historical Dept',
      code: 'IHD',
      academicYear: '2026-27'
    }
  });
  assert(
    histDeptCreate.status === 403 && histDeptCreate.data?.code === 'HISTORICAL_YEAR_READ_ONLY',
    `POST /departments on historical year rejected with 403 HISTORICAL_YEAR_READ_ONLY (got status: ${histDeptCreate.status}, code: ${histDeptCreate.data?.code})`
  );

  // 7. Normal Admin attempts to update an existing Department in historical year 2026-27
  const historicalDept = await Department.findOne({ academicYear: '2026-27' });
  if (historicalDept) {
    const histDeptUpdate = await makeRequest({
      method: 'PUT',
      urlPath: `/api/departments/${historicalDept._id}`,
      headers: { Authorization: `Bearer ${normalAdminToken}` },
      body: { name: 'Attempted Name Change' }
    });
    assert(
      histDeptUpdate.status === 403 && histDeptUpdate.data?.code === 'HISTORICAL_YEAR_READ_ONLY',
      `PUT /departments/:id on historical year rejected with 403 HISTORICAL_YEAR_READ_ONLY (got status: ${histDeptUpdate.status}, code: ${histDeptUpdate.data?.code})`
    );

    // 8. Normal Admin attempts to delete Department in historical year 2026-27
    const histDeptDelete = await makeRequest({
      method: 'DELETE',
      urlPath: `/api/departments/${historicalDept._id}`,
      headers: { Authorization: `Bearer ${normalAdminToken}` }
    });
    assert(
      histDeptDelete.status === 403 && histDeptDelete.data?.code === 'HISTORICAL_YEAR_READ_ONLY',
      `DELETE /departments/:id on historical year rejected with 403 HISTORICAL_YEAR_READ_ONLY (got status: ${histDeptDelete.status}, code: ${histDeptDelete.data?.code})`
    );
  } else {
    console.error('No historical department found in 2026-27 to test update/delete guards.');
  }

  // 9. Normal Admin attempts to create Section in historical year 2026-27
  const histSecCreate = await makeRequest({
    method: 'POST',
    urlPath: '/api/sections',
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: {
      name: 'Illegal Historical Section',
      code: 'IHS',
      academicYear: '2026-27'
    }
  });
  assert(
    histSecCreate.status === 403 && histSecCreate.data?.code === 'HISTORICAL_YEAR_READ_ONLY',
    `POST /sections on historical year rejected with 403 HISTORICAL_YEAR_READ_ONLY (got status: ${histSecCreate.status}, code: ${histSecCreate.data?.code})`
  );

  console.log('\n--- TEST GROUP 4: Query Isolation between Academic Years ---');
  // 10. Fetch departments for 2026-27 vs 2027-28
  const q2026 = await makeRequest({
    method: 'GET',
    urlPath: '/api/departments?academicYear=2026-27&all=true',
    headers: { Authorization: `Bearer ${normalAdminToken}` }
  });
  const q2027 = await makeRequest({
    method: 'GET',
    urlPath: '/api/departments?academicYear=2027-28&all=true',
    headers: { Authorization: `Bearer ${normalAdminToken}` }
  });

  const depts2026 = Array.isArray(q2026.data) ? q2026.data : [];
  const depts2027 = Array.isArray(q2027.data) ? q2027.data : [];

  const all2026Match = depts2026.length > 0 && depts2026.every(d => d.academicYear === '2026-27');
  const all2027Match = depts2027.length > 0 && depts2027.every(d => d.academicYear === '2027-28');

  assert(all2026Match, `All returned departments for 2026-27 strictly belong to 2026-27 (count: ${depts2026.length})`);
  assert(all2027Match, `All returned departments for 2027-28 strictly belong to 2027-28 (count: ${depts2027.length})`);

  console.log('\n--- TEST GROUP 5: Student Registration Auto-Assignment to Current Year ---');
  // 11. Register new student without specifying academicYear
  const testStudentEmail = `test_student_${Date.now()}@testcampus.edu`;
  const regRes = await makeRequest({
    method: 'POST',
    urlPath: '/api/auth/register',
    body: {
      name: 'Test Student 2027',
      email: testStudentEmail,
      password: 'Password@123',
      role: 'STUDENT',
      dateOfBirth: '2003-01-15',
      studentMobileNumber: '9876543210',
      parentMobileNumber: '9876543211',
      permanentAddress: '123 Campus Road',
      permanentPinCode: '201301',
      temporaryAddress: '123 Campus Road',
      temporaryPinCode: '201301',
      enrollmentNo: `ENR${Date.now().toString().slice(-8)}`,
      department: newDept2027Id,
      section: newSec2027Id,
      branch: 'CSE',
      year: 4,
      cgpa: 8.5,
      tenthPercentage: 88,
      twelfthPercentage: 86,
      backlogs: 0
    }
  });

  assert(regRes.status === 201, `Student registration succeeded with status 201 (got ${regRes.status})`);
  if (regRes.status === 201) {
    const createdStudentUser = await User.findOne({ email: testStudentEmail });
    const createdStudent = await Student.findOne({ user: createdStudentUser._id });
    assert(
      createdStudent && createdStudent.academicYear === '2027-28',
      `Registered student automatically assigned to active current year 2027-28 (found: ${createdStudent?.academicYear})`
    );
    // Cleanup test student
    if (createdStudent) await Student.deleteOne({ _id: createdStudent._id });
    if (createdStudentUser) await User.deleteOne({ _id: createdStudentUser._id });
  }

  console.log('\n--- TEST GROUP 6: Super Admin Protected Actions & Cascade Deletion ---');
  // 12. Attempt to delete current active academic year 2027-28 -> Must be blocked
  const delActiveRes = await makeRequest({
    method: 'DELETE',
    urlPath: `/api/academic-years/${currentAY._id}`,
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: { confirmYear: '2027-28', reason: 'Attempting to delete active current year' }
  });
  assert(
    delActiveRes.status === 400 && (delActiveRes.data?.code === 'ACTIVE_YEAR_PROTECTED' || delActiveRes.data?.message?.includes('cannot be deleted')),
    `Attempt to delete active academic year rejected with 400 ACTIVE_YEAR_PROTECTED (status: ${delActiveRes.status})`
  );

  // 13. Normal admin cannot delete any academic year
  const normalDelRes = await makeRequest({
    method: 'DELETE',
    urlPath: `/api/academic-years/${historicalAY._id}`,
    headers: { Authorization: `Bearer ${normalAdminToken}` },
    body: { confirmYear: '2026-27', reason: 'Attempting normal admin deletion' }
  });
  assert(
    normalDelRes.status === 403,
    `Normal admin deletion of academic year blocked with 403 Forbidden (got status: ${normalDelRes.status})`
  );

  // 14. Temporary Year Creation, Scoped Data Addition, and Cascade Deletion
  const tempYear = '2023-24';
  // Cleanup any lingering tempYear records from prior runs
  await AcademicYear.deleteMany({ year: tempYear });
  await Department.deleteMany({ academicYear: tempYear });
  await Section.deleteMany({ academicYear: tempYear });

  const createTempRes = await makeRequest({
    method: 'POST',
    urlPath: '/api/academic-years',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: { year: tempYear, isCurrent: false }
  });
  assert(createTempRes.status === 201, `Super Admin successfully created temporary academic year ${tempYear}`);
  const tempYearDoc = createTempRes.data?.data || createTempRes.data;

  // Create temporary department and section in tempYear
  const tempDept = await Department.create({
    name: 'Temporary Cascade Dept',
    code: 'TCD',
    academicYear: tempYear,
    status: 'active'
  });
  const tempSec = await Section.create({
    name: 'T1',
    code: 'T1',
    academicYear: tempYear,
    status: 'active'
  });

  // Now delete tempYear via Super Admin cascade delete
  const cascadeDelRes = await makeRequest({
    method: 'DELETE',
    urlPath: `/api/academic-years/${tempYearDoc._id}`,
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: { confirmYear: tempYear, reason: 'Testing automated cascade deletion' }
  });

  assert(cascadeDelRes.status === 200, `Super Admin cascade deletion succeeded with 200 (got status: ${cascadeDelRes.status})`);

  // Verify cascade deletion results
  const checkTempAY = await AcademicYear.findOne({ year: tempYear });
  const checkTempDept = await Department.findOne({ academicYear: tempYear });
  const checkTempSec = await Section.findOne({ academicYear: tempYear });

  assert(!checkTempAY, `Academic Year ${tempYear} record removed from database`);
  assert(!checkTempDept, `Department belonging to ${tempYear} cascade-deleted`);
  assert(!checkTempSec, `Section belonging to ${tempYear} cascade-deleted`);

  // Verify other academic years and records are intact
  const check2026Depts = await Department.countDocuments({ academicYear: '2026-27' });
  const check2027Depts = await Department.countDocuments({ academicYear: '2027-28' });
  assert(check2026Depts >= 2, `2026-27 departments remain completely intact (count: ${check2026Depts})`);
  assert(check2027Depts >= 1, `2027-28 departments remain completely intact (count: ${check2027Depts})`);

  // Restore active Current Academic Year back to 2026-27
  await setCurrentAcademicYear('2026-27', superAdminUser);

  console.log('\n===============================================================');
  console.log(` TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runTestSuite().catch((err) => {
  console.error('Test Suite encountered unhandled error:', err);
  process.exit(1);
});
