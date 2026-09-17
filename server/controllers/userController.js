const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');

// @desc Get all students
// @route GET /api/users/students
const getStudents = async (req, res) => {
  try {
    const { department, academicYear } = req.query;
    let query = {};
    if (department && department !== 'ALL') {
      query.department = department;
    }
    if (academicYear) {
      query.academicYear = academicYear;
    }

    const students = await Student.find(query).populate('user', 'name email status avatar');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all faculty
// @route GET /api/users/faculty
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find().populate('user', 'name email status avatar');
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update student profile (for logged in student)
// @route PUT /api/users/student-profile
const updateStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { cgpa, backlogs, skills, phone, resumeUrl, bio } = req.body;
    if (cgpa !== undefined) student.cgpa = Number(cgpa);
    if (backlogs !== undefined) student.backlogs = Number(backlogs);
    if (skills) student.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    if (phone !== undefined) student.phone = phone;
    if (resumeUrl !== undefined) student.resumeUrl = resumeUrl;
    if (bio !== undefined) student.bio = bio;

    await student.save();

    res.json({ message: 'Profile updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all departments
// @route GET /api/users/departments
const getDepartments = async (req, res) => {
  try {
    let depts = await Department.find();
    if (!depts || depts.length === 0) {
      // Default fallback list
      depts = [
        { code: 'CSE', name: 'Computer Science & Engineering' },
        { code: 'IT', name: 'Information Technology' },
        { code: 'ECE', name: 'Electronics & Communication' },
        { code: 'AI-ML', name: 'Artificial Intelligence & Machine Learning' },
        { code: 'ME', name: 'Mechanical Engineering' },
        { code: 'CE', name: 'Civil Engineering' }
      ];
    }
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create department
// @route POST /api/users/departments
const createDepartment = async (req, res) => {
  try {
    const { code, name, description } = req.body;
    const dept = await Department.create({ code: code.toUpperCase(), name, description });
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStudents,
  getFaculty,
  updateStudentProfile,
  getDepartments,
  createDepartment
};
