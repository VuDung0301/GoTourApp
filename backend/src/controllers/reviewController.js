const Review = require('../models/Review');
const Tour = require('../models/TourModel');
const Hotel = require('../models/Hotel');

/**
 * @desc    Lấy tất cả đánh giá
 * @route   GET /api/reviews
 * @access  Public
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    let filter = {};
    
    // Nếu có tourId trong query, lọc theo tour
    if (req.query.tourId) {
      filter = { tour: req.query.tourId };
    }
    
    // Nếu có hotelId trong query, lọc theo hotel
    if (req.query.hotelId) {
      filter = { hotel: req.query.hotelId };
    }
    
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Đếm tổng số đánh giá
    const total = await Review.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy một đánh giá
 * @route   GET /api/reviews/:id
 * @access  Public
 */
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }
    
    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo đánh giá mới
 * @route   POST /api/reviews
 * @access  Private
 */
exports.createReview = async (req, res, next) => {
  try {
    // Thêm user ID vào req.body
    req.body.user = req.user.id;
    
    // Kiểm tra xem đánh giá của tour hay hotel
    if (req.body.tour) {
      // Kiểm tra tour tồn tại không
      const tour = await Tour.findById(req.body.tour);
      if (!tour) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tour',
        });
      }
      
      // Kiểm tra xem người dùng đã đánh giá tour này chưa
      const existingReview = await Review.findOne({
        tour: req.body.tour,
        user: req.user.id,
      });
      
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đánh giá tour này rồi',
        });
      }
    } else if (req.body.hotel) {
      // Kiểm tra hotel tồn tại không
      const hotel = await Hotel.findById(req.body.hotel);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khách sạn',
        });
      }
      
      // Kiểm tra xem người dùng đã đánh giá hotel này chưa
      const existingReview = await Review.findOne({
        hotel: req.body.hotel,
        user: req.user.id,
      });
      
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đánh giá khách sạn này rồi',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Phải có tour hoặc hotel để đánh giá',
      });
    }
    
    const review = await Review.create(req.body);
    
    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật đánh giá
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }
    
    // Kiểm tra quyền sở hữu
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật đánh giá này',
      });
    }
    
    // Không cho phép thay đổi tour hoặc hotel
    delete req.body.tour;
    delete req.body.hotel;
    delete req.body.user;
    
    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa đánh giá
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }
    
    // Kiểm tra quyền sở hữu
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đánh giá này',
      });
    }
    
    await review.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Đánh giá đã được xóa',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả đánh giá của một tour
 * @route   GET /api/reviews/tour/:id
 * @access  Public
 */
exports.getTourReviews = async (req, res, next) => {
  try {
    const tourId = req.params.id;
    
    // Kiểm tra tour tồn tại
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour',
      });
    }
    
    // Lấy tất cả đánh giá của tour
    const reviews = await Review.find({ tour: tourId })
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả đánh giá của một khách sạn
 * @route   GET /api/reviews/hotel/:id
 * @access  Public
 */
exports.getHotelReviews = async (req, res, next) => {
  try {
    const hotelId = req.params.id;
    
    // Kiểm tra hotel tồn tại
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn',
      });
    }
    
    // Lấy tất cả đánh giá của hotel
    const reviews = await Review.find({ hotel: hotelId })
      .populate({
        path: 'user',
        select: 'name avatar'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
}; 