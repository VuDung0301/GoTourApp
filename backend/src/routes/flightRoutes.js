const express = require('express');
const {
  getFlights,
  getFlight,
  createFlight,
  updateFlight,
  deleteFlight,
} = require('../controllers/flightController');
const { protect, authorize } = require('../middlewares/auth');
const { upload } = require('../utils/fileHandler');

const router = express.Router();

// Routes công khai
router.get('/', getFlights);
router.get('/:id', getFlight);

// Routes yêu cầu quyền admin
router.post('/', protect, authorize('admin'), upload.single('image'), createFlight);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateFlight);
router.delete('/:id', protect, authorize('admin'), deleteFlight);

module.exports = router; 