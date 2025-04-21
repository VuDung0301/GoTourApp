const TourBooking = require('../models/TourBooking');
const Tour = require('../models/TourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Lấy tất cả tour bookings
 * @route   GET /api/tour-bookings
 * @access  Private/Admin
 */
exports.getAllTourBookings = async (req, res, next) => {
  try {
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Lọc theo trạng thái booking
    let query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Lọc theo trạng thái thanh toán
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }
    
    // Lọc theo ID tour
    if (req.query.tourId) {
      query.tour = req.query.tourId;
    }
    
    // Lọc theo ngày booking
    if (req.query.startDate && req.query.endDate) {
      query.bookingDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }
    
    const bookings = await TourBooking.find(query)
      .populate({
        path: 'user',
        select: 'name email phone',
      })
      .populate({
        path: 'tour',
        select: 'name duration difficulty price',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số bookings
    const total = await TourBooking.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả đặt tour của người dùng hiện tại
 * @route   GET /api/tour-bookings/me
 * @access  Private
 */
exports.getMyTourBookings = async (req, res, next) => {
  try {
    const bookings = await TourBooking.find({ user: req.user.id })
      .populate({
        path: 'tour',
        select: 'name duration difficulty price imageCover startLocation'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một đặt tour (không cần login)
 * @route   GET /api/tour-bookings/:id
 * @access  Public
 */
exports.getTourBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    // Kiểm tra ID có phải là ObjectId hợp lệ không
    if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'ID đặt tour không hợp lệ'
      });
    }

    const booking = await TourBooking.findById(bookingId)
      .populate({
        path: 'tour',
        select: 'name duration difficulty price imageCover startLocation locations description'
      })
      .populate({
        path: 'user',
        select: 'name'
      });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt tour'
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin đặt tour:', error);
    next(error);
  }
};

/**
 * @desc    Tạo đặt tour mới
 * @route   POST /api/tour-bookings
 * @access  Private
 */
exports.createTourBooking = async (req, res, next) => {
  try {
    const {
      tourId,
      participants,
      tourDate,
      contactInfo,
      specialRequests,
      additionalServices,
    } = req.body;
    
    // Kiểm tra tour
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour',
      });
    }
    
    // Tính tổng giá tiền
    let totalPrice = tour.price * participants.length;
    
    // Cộng thêm giá dịch vụ bổ sung nếu có
    if (additionalServices) {
      for (const [key, service] of Object.entries(additionalServices)) {
        if (service.selected) {
          totalPrice += service.price * (service.quantity || 1);
        }
      }
    }
    
    // Tạo đặt tour mới
    const booking = await TourBooking.create({
      tour: tourId,
      user: req.user.id,
      price: tour.price,
      participants,
      tourDate,
      contactInfo,
      specialRequests,
      totalPrice,
      additionalServices,
      bookingReference: 'TMP', // Sẽ được tạo tự động bởi pre-save middleware
    });
    
    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật trạng thái đặt tour
 * @route   PUT /api/tour-bookings/:id/status
 * @access  Private/Admin
 */
exports.updateTourBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp trạng thái đặt tour',
      });
    }
    
    const booking = await TourBooking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus: status },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt tour',
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật trạng thái thanh toán
 * @route   PUT /api/tour-bookings/:id/payment
 * @access  Private/Admin
 */
exports.updateTourPaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    
    if (!paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp trạng thái thanh toán',
      });
    }
    
    const updateData = {
      paymentStatus,
      paymentMethod: paymentMethod || undefined,
    };
    
    if (paymentStatus === 'Đã thanh toán') {
      updateData.paymentDate = Date.now();
    }
    
    const booking = await TourBooking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt tour',
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Hủy đặt tour
 * @route   PUT /api/tour-bookings/:id/cancel
 * @access  Private
 */
exports.cancelTourBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    const booking = await TourBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đặt tour',
      });
    }
    
    // Kiểm tra quyền truy cập
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đặt tour này',
      });
    }
    
    // Cập nhật booking
    booking.bookingStatus = 'Hủy';
    booking.paymentStatus = 'Đã hủy';
    booking.cancellationReason = reason || 'Không có lý do';
    
    await booking.save();
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy tất cả bookings (chỉ dành cho admin)
exports.getAllBookings = catchAsync(async (req, res, next) => {
  // Cho phép filter theo query parameters
  const bookings = await TourBooking.find(req.query);

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

// Lấy booking theo ID
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await TourBooking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Không tìm thấy booking với ID này', 404));
  }

  // Chỉ cho phép admin hoặc người dùng liên quan đến booking này xem thông tin
  if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
    return next(new AppError('Bạn không có quyền xem booking này', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Lấy tất cả bookings của người dùng hiện tại
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await TourBooking.find({ user: req.user.id })
    .populate({
      path: 'tour',
      select: 'name duration difficulty price imageCover'
    });

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// Tạo booking mới
exports.createBooking = catchAsync(async (req, res, next) => {
  // Không cho phép người dùng tự ý đặt trường user
  if (!req.body.user) req.body.user = req.user.id;
  
  // Nếu người dùng gửi lên user_id khác với id của họ và không phải admin
  if (req.body.user !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Bạn không thể đặt tour cho người dùng khác', 403));
  }

  // Kiểm tra tour có tồn tại không
  const tour = await Tour.findById(req.body.tour);
  if (!tour) {
    return next(new AppError('Không tìm thấy tour với ID này', 404));
  }
  
  // Tạo booking mới
  const newBooking = await TourBooking.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      booking: newBooking
    }
  });
});

// Cập nhật trạng thái booking
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  // Chỉ cho phép cập nhật trạng thái
  const { status } = req.body;
  
  // Kiểm tra status hợp lệ
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Trạng thái không hợp lệ', 400));
  }
  
  const booking = await TourBooking.findById(req.params.id);
  
  if (!booking) {
    return next(new AppError('Không tìm thấy booking với ID này', 404));
  }
  
  // Kiểm tra quyền: admin có thể cập nhật bất kỳ booking nào, 
  // người dùng thường chỉ có thể cập nhật booking của chính họ
  if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
    return next(new AppError('Bạn không có quyền cập nhật booking này', 403));
  }
  
  // Người dùng thường chỉ có thể hủy booking, không thể chuyển sang trạng thái khác
  if (req.user.role !== 'admin' && status !== 'cancelled') {
    return next(new AppError('Bạn chỉ có thể hủy booking của mình', 403));
  }
  
  booking.status = status;
  await booking.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Hủy booking
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await TourBooking.findById(req.params.id);
  
  if (!booking) {
    return next(new AppError('Không tìm thấy booking với ID này', 404));
  }
  
  // Không thể hủy booking đã hoàn thành
  if (booking.status === 'completed') {
    return next(new AppError('Không thể hủy booking đã hoàn thành', 400));
  }
  
  // Kiểm tra quyền: admin có thể hủy bất kỳ booking nào, 
  // người dùng thường chỉ có thể hủy booking của chính họ
  if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
    return next(new AppError('Bạn không có quyền hủy booking này', 403));
  }
  
  booking.status = 'cancelled';
  await booking.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
}); 