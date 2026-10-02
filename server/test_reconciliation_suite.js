/**
 * CampusPro Comprehensive Reconciliation Test Suite
 * Validates Security, Data Integrity, Scalability, and Profile Update Fixes
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BASE_URL = 'http://127.0.0.1:5000';
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

async function runSuite() {
  console.log('====================================================');
  console.log(' CAMPUSPRO CRITICAL RECONCILIATION TEST SUITE');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro');
  console.log('Connected to local MongoDB successfully.');

  const User = require('./models/User');
  const Student = require('./models/Student');
  const Faculty = require('./models/Faculty');
  const Department = require('./models/Department');
  const Section = require('./models/Section');
  const PlacementDrive = require('./models/PlacementDrive');
  const Application = require('./models/Application');
  const Resume = require('./models/Resume');

  // Retrieve test users for Admin, Faculty, and Student
  let adminUser = await User.findOne({ role: 'ADMIN' });
  let studentDoc = await Student.findOne().populate('user department section');
  let studentUser = studentDoc ? studentDoc.user : null;
  if (!studentDoc) {
    let dept = await Department.findOne();
    let sec = await Section.findOne();
    studentUser = await User.findOne({ role: 'STUDENT' });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Test Reconciliation Student',
        email: `recon_student_${Date.now()}@campuspro.com`,
        password: '$2a$10$abcdefghijklmnopqrstuv',
        role: 'STUDENT',
        academicYear: '2026-27'
      });
    }
    studentDoc = await Student.create({
      user: studentUser._id,
      enrollmentNo: `ENR_RECON_${Date.now().toString().slice(-6)}`,
      department: dept?._id,
      section: sec?._id,
      branch: 'CSE',
      cgpa: 8.0,
      backlogs: 0,
      academicYear: '2026-27'
    });
  }
  let facultyDoc = await Faculty.findOne().populate('department');
  let facultyUser = facultyDoc ? await User.findById(facultyDoc.user) : null;

  const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET);
  const studentToken = jwt.sign({ id: studentUser._id, role: studentUser.role }, JWT_SECRET);
  const facultyToken = facultyUser ? jwt.sign({ id: facultyUser._id, role: facultyUser.role }, JWT_SECRET) : null;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(name, condition, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${name}`);
    } else {
      failedTests++;
      console.error(`  [FAIL] ${name}: ${details}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 1: Health, Diagnostics & 404 Handling
  // ----------------------------------------------------
  console.log('\n--- Section 1: Health, Diagnostics & 404 Handling ---');
  {
    const res = await makeRequest({ urlPath: '/api/health' });
    assert('Health endpoint returns 200', res.status === 200);
    assert('X-Request-ID header attached to response', Boolean(res.headers['x-request-id']));
    assert('Health returns safe system diagnostics', res.data?.status === 'healthy' && res.data?.services?.database === 'connected');
    assert('Database secrets are not exposed in health', !res.raw.includes('mongodb://') && !res.raw.includes('password'));
  }
  {
    const res = await makeRequest({ urlPath: '/api/non-existent-endpoint-12345' });
    assert('Unmapped route returns 404', res.status === 404);
    assert('404 returns structured error payload with code NOT_FOUND', res.data?.code === 'NOT_FOUND');
    assert('404 response contains requestId', Boolean(res.data?.requestId));
  }

  // ----------------------------------------------------
  // SECTION 2: CORS & Private Uploads Protection
  // ----------------------------------------------------
  console.log('\n--- Section 2: CORS & Private Uploads Protection ---');
  {
    const res = await makeRequest({ urlPath: '/uploads' });
    assert('Direct access to /uploads directory is 403 Forbidden', res.status === 403);
  }
  {
    const res = await makeRequest({ urlPath: '/uploads/resumes/confidential_student_resume.pdf' });
    assert('Unauthenticated access to /uploads/resumes is 401 Unauthorized', res.status === 401);
  }
  {
    const res = await makeRequest({ urlPath: '/uploads/exports/CampusPro_Export.xlsx' });
    assert('Unauthenticated access to /uploads/exports is 401 Unauthorized', res.status === 401);
  }
  {
    const res = await makeRequest({
      urlPath: '/uploads/exports/CampusPro_Export.xlsx',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert('Student cannot access /uploads/exports (403 Forbidden)', res.status === 403);
  }

  // ----------------------------------------------------
  // SECTION 3: Student Profile "Update Profile" End-to-End
  // ----------------------------------------------------
  console.log('\n--- Section 3: Student Profile "Update Profile" End-to-End ---');
  {
    // Test 3.1: Valid Update with all contact & academic fields
    const updatePayload = {
      cgpa: 8.75,
      tenthPercentage: 89.5,
      twelfthPercentage: 87.2,
      backlogs: 0,
      studentMobileNumber: '9876543210',
      parentMobileNumber: '9123456780',
      permanentAddress: '100 Innovation Blvd, Tech Park',
      permanentPinCode: '110001',
      temporaryAddress: 'Hostel Block B, Room 204',
      temporaryPinCode: '110001',
      skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
      bio: 'Aspiring Full Stack Engineer passionate about distributed systems.',
      profileLinks: {
        github: 'https://github.com/campuspro-candidate',
        linkedin: 'https://linkedin.com/in/campuspro-candidate',
        leetcode: 'https://leetcode.com/u/campuspro-candidate',
        geeksforgeeks: 'https://geeksforgeeks.org/user/campuspro',
        custom: [{ label: 'Portfolio', url: 'https://myportfolio.dev' }]
      }
    };

    const res = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: updatePayload
    });

    assert('PUT /api/users/student-profile returns 200 OK', res.status === 200);
    assert('Response contains success: true', res.data?.success === true);
    assert('Response returns updated student object', res.data?.student?.cgpa === 8.75);

    // Verify directly in MongoDB
    const persistedStudent = await Student.findById(studentDoc._id);
    assert('CGPA persisted accurately in MongoDB', persistedStudent.cgpa === 8.75);
    assert('10th Percentage persisted in MongoDB', persistedStudent.tenthPercentage === 89.5);
    assert('12th Percentage persisted in MongoDB', persistedStudent.twelfthPercentage === 87.2);
    assert('Student Mobile persisted in MongoDB', persistedStudent.studentMobileNumber === '9876543210');
    assert('Parent Mobile persisted in MongoDB', persistedStudent.parentMobileNumber === '9123456780');
    assert('Profile Links persisted in MongoDB', persistedStudent.profileLinks.github === 'https://github.com/campuspro-candidate');

    // Test 3.2: Edge case - zero values (0 CGPA, 0 backlogs)
    const zeroRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { cgpa: 0, backlogs: 0 }
    });
    assert('CGPA = 0 and backlogs = 0 update successfully (200)', zeroRes.status === 200);
    const zeroStudent = await Student.findById(studentDoc._id);
    assert('Zero values persisted correctly', zeroStudent.cgpa === 0 && zeroStudent.backlogs === 0);

    // Restore CGPA for further tests
    await Student.findByIdAndUpdate(studentDoc._id, { cgpa: 8.5 });

    // Test 3.3: Null and empty string handling (no "null" string conversion)
    const nullRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { tenthPercentage: null, twelfthPercentage: null, parentMobileNumber: '' }
    });
    assert('Null percentages and empty parent mobile handled safely (200)', nullRes.status === 200);
    const nullStudent = await Student.findById(studentDoc._id);
    assert('Null percentage saved as null without crash', nullStudent.tenthPercentage === null);

    // Test 3.4: Validation failure on invalid mobile (alphabetic / != 10 digits)
    const badMobileRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { studentMobileNumber: '12345' }
    });
    assert('Invalid mobile number rejected with 400', badMobileRes.status === 400);

    // Test 3.5: Validation failure on invalid PIN code (!= 6 digits)
    const badPinRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { permanentPinCode: '999' }
    });
    assert('Invalid PIN code rejected with 400', badPinRes.status === 400);

    // Test 3.6: Validation failure on invalid CGPA (> 10)
    const badCgpaRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { cgpa: 15.0 }
    });
    assert('CGPA > 10 rejected with 400', badCgpaRes.status === 400);

    // Test 3.7: Mass assignment / privilege escalation blocked
    const massAssignRes = await makeRequest({
      method: 'PUT',
      urlPath: '/api/users/student-profile',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { role: 'ADMIN', enrollmentNo: 'HACK_ENROLLMENT', department: new mongoose.Types.ObjectId() }
    });
    assert('Mass assignment attempt completed without privilege escalation', massAssignRes.status === 200);
    const refreshedStudent = await Student.findById(studentDoc._id);
    const refreshedUser = await User.findById(studentUser._id);
    assert('User role remained STUDENT', refreshedUser.role === 'STUDENT');
    assert('Student enrollment number remained unchanged', refreshedStudent.enrollmentNo === studentDoc.enrollmentNo);
  }

  console.log('\n--- Section 4: Placement Drive Security & Mass-Assignment ---');
  {
    // Find or create test company
    const Company = require('./models/Company');
    let anyCompany = await Company.findOne();
    if (!anyCompany) {
      anyCompany = await Company.create({
        name: 'Test Inc',
        industry: 'Software',
        location: 'Kanpur, India'
      });
    }

    // Create a temporary Draft drive to test Draft isolation
    const draftDrive = await PlacementDrive.create({
      company: anyCompany._id,
      companyName: anyCompany.name,
      jobRole: 'Confidential R&D Engineer',
      package: '25 LPA',
      location: 'Kanpur, India',
      status: 'DRAFT',
      eligibleBranches: ['CSE', 'AI-ML', 'IT'],
      deadline: new Date(Date.now() + 7 * 86400000),
      driveDate: new Date(Date.now() + 14 * 86400000),
      createdBy: adminUser._id,
      minCgpa: 7.0,
      academicYear: (await (require('./services/academicYearService').getCurrentAcademicYear()))
    });

    // Student GET /api/drives
    const studentDrivesRes = await makeRequest({
      urlPath: '/api/drives',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const foundDraft = Array.isArray(studentDrivesRes.data) && studentDrivesRes.data.some(d => d._id === draftDrive._id.toString() || d.status === 'DRAFT' || d.status === 'Draft');
    assert('Students cannot view Draft drives in drives list', !foundDraft);

    // Student GET /api/drives/:id on Draft drive
    const studentSingleDraftRes = await makeRequest({
      urlPath: `/api/drives/${draftDrive._id}`,
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert('Student direct access to Draft drive is 403 Forbidden', studentSingleDraftRes.status === 403);

    // Admin CAN view Draft drive
    const adminDraftRes = await makeRequest({
      urlPath: `/api/drives/${draftDrive._id}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Admin can view Draft drive (200 OK)', adminDraftRes.status === 200);

    // Test updateDrive mass-assignment protection
    const updateDriveRes = await makeRequest({
      method: 'PUT',
      urlPath: `/api/drives/${draftDrive._id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        jobRole: 'Updated R&D Engineer',
        injectedMaliciousField: 'evil_payload',
        _id: new mongoose.Types.ObjectId() // Attempt to change immutable ID
      }
    });
    assert('Drive update succeeded (200)', updateDriveRes.status === 200);
    const refreshedDrive = await PlacementDrive.findById(draftDrive._id);
    assert('Drive jobRole was updated', refreshedDrive.jobRole === 'Updated R&D Engineer');
    assert('Non-whitelisted field was NOT added by mass assignment', refreshedDrive.get('injectedMaliciousField') === undefined);
    assert('Immutable _id was NOT overwritten', refreshedDrive._id.toString() === draftDrive._id.toString());

    // Clean up temporary draft drive
    await PlacementDrive.findByIdAndDelete(draftDrive._id);
  }

  // ----------------------------------------------------
  // SECTION 5: Resume Mass-Assignment & Personal Details
  // ----------------------------------------------------
  console.log('\n--- Section 5: Resume Mass-Assignment & Personal Details ---');
  {
    let studentResume = await Resume.findOne({ user: studentUser._id });
    if (!studentResume) {
      studentResume = await Resume.create({
        user: studentUser._id,
        title: 'Master Resume',
        targetRole: 'Software Engineer',
        personalInfo: { fullName: studentUser.name, email: studentUser.email }
      });
    }

    // Attempt to hijack resume user ownership
    const hijackRes = await makeRequest({
      method: 'PUT',
      urlPath: `/api/resumes/${studentResume._id}`,
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Updated Resume Title',
        user: adminUser._id // Attempt to change resume owner
      }
    });
    assert('Resume update returned 200', hijackRes.status === 200);
    const refreshedResume = await Resume.findById(studentResume._id);
    assert('Resume title updated', refreshedResume.resumeName === 'Updated Resume Title');
    assert('Resume user ownership was NOT hijacked by mass-assignment', refreshedResume.user.toString() === studentUser._id.toString());
  }

  // ----------------------------------------------------
  // SECTION 6: Eligibility Engine Canonical Verification
  // ----------------------------------------------------
  console.log('\n--- Section 6: Eligibility Engine Canonical Verification ---');
  {
    const { checkEligibility } = require('./services/eligibilityService');

    // Drive with criteria: minimumAcademic value 6.5, legacy minCgpa 7.5
    const mockDrive = {
      minCgpa: 7.5,
      maxBacklogs: 1,
      eligibilityCriteria: {
        minimumAcademic: {
          enabled: true,
          type: 'CGPA',
          value: 6.5
        },
        highSchool: { enabled: false },
        intermediate: { enabled: false }
      }
    };

    // Student with CGPA 7.0 (Should be ELIGIBLE because minimumAcademic value 6.5 takes precedence over legacy 7.5)
    const mockStudent = {
      cgpa: 7.0,
      backlogs: 0,
      department: { code: 'CSE', name: 'Computer Science' },
      branch: 'Computer Science'
    };

    const evalResult = checkEligibility(mockStudent, mockDrive);
    assert('eligibilityCriteria.minimumAcademic takes precedence over legacy minCgpa', evalResult.eligible === true);
    assert('No false failure reasons emitted', evalResult.reasons.length === 0);
  }

  // ----------------------------------------------------
  // SECTION 7: Faculty Department Scoping
  // ----------------------------------------------------
  console.log('\n--- Section 7: Faculty Department Scoping ---');
  if (facultyUser && facultyDoc) {
    // Find a student from a DIFFERENT department
    const otherDept = await Department.findOne({ _id: { $ne: facultyDoc.department } });
    if (otherDept) {
      const otherStudent = await Student.findOne({ department: otherDept._id });
      if (otherStudent) {
        // Create an application for other student
        const anyDrive = await PlacementDrive.findOne();
        if (anyDrive) {
          let testApp = await Application.findOne({ student: otherStudent._id, drive: anyDrive._id });
          if (!testApp) {
            testApp = await Application.create({
              student: otherStudent._id,
              user: otherStudent.user,
              drive: anyDrive._id,
              status: 'REGISTERED'
            });
          }

          // Faculty attempting to save round result for student outside their department
          const evalRes = await makeRequest({
            method: 'POST',
            urlPath: '/api/interviews/result',
            headers: { Authorization: `Bearer ${facultyToken}` },
            body: {
              applicationId: testApp._id,
              roundName: 'Technical Round 1',
              roundOrder: 1,
              status: 'PASSED'
            }
          });

          assert('Faculty cannot evaluate student outside their assigned department (403 Forbidden)', evalRes.status === 403);
        }
      }
    }
  } else {
    console.log('  [SKIP] Faculty user not configured in database for scoping test.');
  }

  // ----------------------------------------------------
  // SECTION 8: Bounded Pagination Enforcement
  // ----------------------------------------------------
  console.log('\n--- Section 8: Bounded Pagination Enforcement ---');
  {
    const res = await makeRequest({
      urlPath: '/api/users/students?page=1&limit=500',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Student directory returns 200 OK', res.status === 200);
    assert('Pagination enforces maximum limit of 100 per page', res.data?.pagination?.limit === 100);
    assert('Data array contains at most 100 items', Array.isArray(res.data?.data) && res.data.data.length <= 100);
  }
  {
    const res = await makeRequest({
      urlPath: '/api/experiences?all=true',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert('Experiences endpoint returns 200 with pagination metadata', res.status === 200 && res.data?.pagination);
    assert('Experiences enforces bounded limit (at most 100)', res.data?.pagination?.limit <= 100);
  }

  console.log('\n====================================================');
  console.log(` RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runSuite().catch((err) => {
  console.error('[Test Suite Error]', err);
  process.exit(1);
});
