const express = require('express');
const router = express.Router();
const {
  getStudents,
  getFaculty,
  updateStudentProfile,
  getDepartments,
  createDepartment
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/students', protect, authorize('admin', 'faculty'), getStudents);
router.get('/faculty', protect, authorize('admin'), getFaculty);
router.put('/student-profile', protect, authorize('student'), updateStudentProfile);
router.get('/departments', protect, getDepartments);
router.post('/departments', protect, authorize('admin'), createDepartment);

module.exports = router;
