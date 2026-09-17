const express = require('express');
const router = express.Router();
const {
  uploadJdPdf,
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive
} = require('../controllers/driveController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { jdPdfUpload } = require('../middleware/uploadMiddleware');

// Upload JD PDF
router.post('/upload-jd', protect, authorize('admin', 'faculty'), (req, res, next) => {
  jdPdfUpload.single('jdFile')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds maximum limit of 10 MB.' });
      }
      return res.status(400).json({ message: err.message || 'File upload failed. Only PDF files are allowed.' });
    }
    next();
  });
}, uploadJdPdf);

router.get('/', protect, getDrives);
router.get('/:id', protect, getDriveById);
router.post('/', protect, authorize('admin', 'faculty'), createDrive);
router.put('/:id', protect, authorize('admin', 'faculty'), updateDrive);
router.delete('/:id', protect, authorize('admin', 'faculty'), deleteDrive);

module.exports = router;
