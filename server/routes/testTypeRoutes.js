const express = require('express');
const router = express.Router();
const {
  getTestTypes,
  createTestType,
  updateTestType,
  deleteTestType
} = require('../controllers/testTypeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

router.get('/', protect, getTestTypes);
router.post('/', protect, authorize('FACULTY', 'ADMIN'), createTestType);
router.put('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), updateTestType);
router.delete('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), deleteTestType);

module.exports = router;
