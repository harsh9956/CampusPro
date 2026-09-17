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

router.get('/', protect, getTestTypes);
router.post('/', protect, authorize('faculty', 'admin'), createTestType);
router.put('/:id', protect, authorize('faculty', 'admin'), updateTestType);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteTestType);

module.exports = router;
