const express = require('express');
const router = express.Router();
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, getCompanies);
router.get('/:id', protect, getCompanyById);
router.post('/', protect, authorize('faculty', 'admin'), createCompany);
router.put('/:id', protect, authorize('faculty', 'admin'), updateCompany);
router.delete('/:id', protect, authorize('admin'), deleteCompany);

module.exports = router;
