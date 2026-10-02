const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Public/Authenticated access for fetching departments
router.get('/active', getDepartments);
router.get('/', getDepartments);
router.get('/:id', validateObjectId('id'), getDepartmentById);

// Admin-only management endpoints
router.post('/', protect, authorize('ADMIN'), createDepartment);
router.put('/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateDepartment);
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteDepartment);

module.exports = router;
