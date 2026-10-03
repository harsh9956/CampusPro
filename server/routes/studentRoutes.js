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
  bulkDeleteStudents
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { exportLimiter } = require('../middleware/rateLimitMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Directory & Excel Export
router.get('/', protect, authorize('ADMIN', 'FACULTY'), getStudents);
router.get('/export', protect, authorize('ADMIN', 'FACULTY'), exportLimiter, exportStudentsExcel);
router.post('/export', protect, authorize('ADMIN', 'FACULTY'), exportLimiter, exportStudentsExcel);
router.get('/export/status/:jobId', protect, authorize('ADMIN', 'FACULTY'), validateObjectId('jobId'), getExportJobStatus);
router.get('/export/download/:jobId', protect, authorize('ADMIN', 'FACULTY'), validateObjectId('jobId'), downloadExportFile);

// Bulk Deletion
router.delete('/bulk', protect, authorize('ADMIN'), bulkDeleteStudents);

// Single Student Management
router.get('/:id', protect, authorize('ADMIN'), validateObjectId('id'), getStudentById);
router.put('/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateStudentAdmin);
router.patch('/:id/status', protect, authorize('ADMIN'), validateObjectId('id'), toggleStudentStatus);
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteStudentPermanently);

module.exports = router;
