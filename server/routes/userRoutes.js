const express = require('express');
const router = express.Router();
const {
  getStudents,
  exportStudentsExcel,
  getExportJobStatus,
  downloadExportFile,
  getStudentById,
  updateStudentAdmin,
  toggleStudentStatus,
  deleteStudentPermanently,
  bulkDeleteStudents,
  getFaculty,
  createFaculty,
  deleteUser,
  getStudentProfile,
  updateStudentProfile,
  getDepartments,
  createDepartment,
  uploadStudentResume,
  deleteStudentResume,
  getStudentResume,
  downloadStudentResume
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { exportLimiter } = require('../middleware/rateLimitMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  singleResumeUpload,
  validateMagicBytesMiddleware,
  handleUploadError
} = require('../middleware/uploadMiddleware');

// Student directories (accessible to Admin and Faculty)
router.get('/students', protect, authorize('ADMIN', 'FACULTY'), getStudents);
router.get('/students/export', protect, authorize('ADMIN'), exportLimiter, exportStudentsExcel);
router.post('/students/export', protect, authorize('ADMIN'), exportLimiter, exportStudentsExcel);
router.get('/students/export/status/:jobId', protect, authorize('ADMIN'), validateObjectId('jobId'), getExportJobStatus);
router.get('/students/export/download/:jobId', protect, authorize('ADMIN'), validateObjectId('jobId'), downloadExportFile);

// Admin Student Management Actions
router.get('/students/:id', protect, authorize('ADMIN'), validateObjectId('id'), getStudentById);
router.put('/students/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateStudentAdmin);
router.patch('/students/:id/status', protect, authorize('ADMIN'), validateObjectId('id'), toggleStudentStatus);
router.delete('/students/bulk', protect, authorize('ADMIN'), bulkDeleteStudents);
router.delete('/students/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteStudentPermanently);

// Faculty directory and creation (Admin only)
router.get('/faculty', protect, authorize('ADMIN'), getFaculty);
router.post('/faculty', protect, authorize('ADMIN'), createFaculty);

// Delete user account (Admin only)
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteUser);

// Student profile management (Student only)
router.get('/student-profile', protect, authorize('STUDENT'), getStudentProfile);
router.put('/student-profile', protect, authorize('STUDENT'), updateStudentProfile);

// Student Resume storage (Secure 10MB upload, Cloudinary / local fallback, strict RBAC)
router.post(
  '/student-resume',
  protect,
  authorize('STUDENT'),
  handleUploadError(singleResumeUpload),
  validateMagicBytesMiddleware,
  uploadStudentResume
);
router.delete('/student-resume', protect, authorize('STUDENT'), deleteStudentResume);
router.get('/student-resume', protect, getStudentResume);
router.get('/student-resume/download', protect, downloadStudentResume);
router.get('/student-resume/:studentId', protect, validateObjectId('studentId'), getStudentResume);
router.get('/student-resume/:studentId/download', protect, validateObjectId('studentId'), downloadStudentResume);

// Department management
router.get('/departments', protect, getDepartments);
router.post('/departments', protect, authorize('ADMIN'), createDepartment);

module.exports = router;
