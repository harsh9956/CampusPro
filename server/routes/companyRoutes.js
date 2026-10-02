const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  uploadCompanyJd,
  deleteCompany
} = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  jdDocumentUpload,
  validateMagicBytesMiddleware,
  handleUploadError
} = require('../middleware/uploadMiddleware');

router.get('/', protect, getCompanies);
router.get('/:id', protect, validateObjectId('id'), getCompanyById);
router.post('/', protect, authorize('ADMIN'), createCompany);
router.put('/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateCompany);
router.post(
  '/:id/upload-jd',
  protect,
  authorize('ADMIN'),
  validateObjectId('id'),
  handleUploadError(jdDocumentUpload),
  validateMagicBytesMiddleware,
  uploadCompanyJd
);
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteCompany);

module.exports = router;
