const express = require('express');
const router = express.Router();
const tourBookingController = require('../controllers/tourBookingController');
const authMiddleware = require('../middlewares/auth');

// Các route cần đăng nhập
router.use(authMiddleware.protect);

// Lấy tất cả booking của user hiện tại
router.get('/me', tourBookingController.getMyBookings);

// Route truy cập public (không cần đăng nhập)
// Chi tiết booking cho confirmation
router.get('/:id', tourBookingController.getTourBooking);

// Tạo booking mới (chỉ user thường)
router.post('/', authMiddleware.restrictTo('user'), tourBookingController.createBooking);

// Cập nhật trạng thái booking
router.put('/:id/status', tourBookingController.updateBookingStatus);
router.delete('/:id', tourBookingController.cancelBooking);

// Route dành cho admin
router.use(authMiddleware.restrictTo('admin'));
router.get('/', tourBookingController.getAllBookings);

module.exports = router; 