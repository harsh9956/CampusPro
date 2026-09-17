const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const Question = require('../models/Question');
const InterviewExperience = require('../models/InterviewExperience');
const MockTest = require('../models/MockTest');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const TestType = require('../models/TestType');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to persistent local MongoDB at', mongoUri);

    // Clear existing data across all collections
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Faculty.deleteMany({}),
      Department.deleteMany({}),
      Company.deleteMany({}),
      PlacementDrive.deleteMany({}),
      Application.deleteMany({}),
      Question.deleteMany({}),
      InterviewExperience.deleteMany({}),
      MockTest.deleteMany({}),
      Announcement.deleteMany({}),
      AuditLog.deleteMany({}),
      TestType.deleteMany({})
    ]);

    console.log('[Seed] Cleared old collections');

    // 1. System Test Types
    await TestType.insertMany([
      { name: 'Company Specific', description: 'Tailored for specific corporate hiring drives', isActive: true },
      { name: 'General Placement', description: 'Comprehensive overall placement mock test', isActive: true },
      { name: 'DSA (Data Structures & Algorithms)', description: 'Data Structures & Algorithms problem solving', isActive: true },
      { name: 'Aptitude & Reasoning', description: 'Quantitative, Logical, and Analytical reasoning', isActive: true },
      { name: 'Technical Domain', description: 'Domain specific core engineering topics', isActive: true },
      { name: 'Core CS Subjects', description: 'OS, DBMS, Computer Networks, and OOPs', isActive: true },
      { name: 'Verbal & Communication', description: 'Grammar, Reading Comprehension, and Vocabulary', isActive: true },
      { name: 'HR & Soft Skills', description: 'Behavioral, Managerial, and HR situational tests', isActive: true }
    ]);

    // 2. Departments
    await Department.insertMany([
      { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science' },
      { code: 'IT', name: 'Information Technology', description: 'Department of IT' },
      { code: 'ECE', name: 'Electronics & Communication', description: 'Department of ECE' },
      { code: 'AI-ML', name: 'Artificial Intelligence & Machine Learning', description: 'Department of AI/ML' }
    ]);

    // 3. Admin User (TPO)
    await User.create({
      name: 'TPO Admin Office',
      email: 'admin@campuspro.com',
      password: 'admin123',
      role: 'admin',
      academicYear: '2026-27'
    });

    // 4. Faculty User
    const facultyUser = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'faculty@campuspro.com',
      password: 'faculty123',
      role: 'faculty',
      academicYear: '2026-27'
    });
    await Faculty.create({
      user: facultyUser._id,
      employeeId: 'EMP-CSE-101',
      department: 'CSE',
      designation: 'Department Placement Coordinator',
      phone: '+91 98765 43210'
    });

    // 5. Student User
    const studentUser = await User.create({
      name: 'Rahul Sharma',
      email: 'student@campuspro.com',
      password: 'student123',
      role: 'student',
      academicYear: '2026-27'
    });
    await Student.create({
      user: studentUser._id,
      enrollmentNo: 'EN2023CSE042',
      department: 'CSE',
      branch: 'Computer Science & Engineering',
      year: 4,
      cgpa: 8.5,
      backlogs: 0,
      skills: ['Java', 'React.js', 'SQL', 'DSA'],
      phone: '+91 91234 56789',
      bio: 'Enthusiastic full-stack developer preparing for software engineering placement drives.'
    });

    console.log('[Seed] Database initialized cleanly with test accounts! 🎉');
    console.log('======================================================');
    console.log('🔑 CREDENTIALS FOR TESTING:');
    console.log('🔴 ADMIN:   admin@campuspro.com   / admin123');
    console.log('🟡 FACULTY: faculty@campuspro.com / faculty123');
    console.log('🟢 STUDENT: student@campuspro.com / student123');
    console.log('======================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
