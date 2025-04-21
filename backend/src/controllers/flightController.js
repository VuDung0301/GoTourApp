const Flight = require('../models/Flight');
const { getRelativePath, deleteFile } = require('../utils/fileHandler');

/**
 * @desc    Lấy tất cả chuyến bay
 * @route   GET /api/flights
 * @access  Public
 */
exports.getFlights = async (req, res, next) => {
  try {
    let query = {};
    
    // Thêm điều kiện active nếu không có keyword
    if (!req.query.keyword) {
      query.active = true;
    }
    
    // Tìm kiếm theo từ khóa (hỗ trợ tìm theo hãng bay, số hiệu, thành phố đi/đến)
    if (req.query.keyword) {
      query = {
        $or: [
          { airline: { $regex: req.query.keyword, $options: 'i' } },
          { flightNumber: { $regex: req.query.keyword, $options: 'i' } },
          { departureCity: { $regex: req.query.keyword, $options: 'i' } },
          { arrivalCity: { $regex: req.query.keyword, $options: 'i' } }
        ]
      };
    }
    
    // Tìm kiếm chuyến bay theo thành phố khởi hành
    if (req.query.departureCity) {
      query.departureCity = { $regex: req.query.departureCity, $options: 'i' };
    }
    
    // Tìm kiếm chuyến bay theo thành phố đến
    if (req.query.arrivalCity) {
      query.arrivalCity = { $regex: req.query.arrivalCity, $options: 'i' };
    }
    
    // Tìm kiếm chuyến bay theo ngày khởi hành
    if (req.query.departureDate) {
      const startOfDay = new Date(req.query.departureDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(req.query.departureDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Tìm kiếm chuyến bay theo hãng hàng không
    if (req.query.airline) {
      query.airline = { $regex: req.query.airline, $options: 'i' };
    }
    
    // Tìm kiếm chuyến bay theo số lượng ghế còn trống
    if (req.query.seats && req.query.seatClass) {
      const seatClass = req.query.seatClass;
      const minSeats = parseInt(req.query.seats);
      query[`seatsAvailable.${seatClass}`] = { $gte: minSeats };
    }
    
    // Sắp xếp
    const sortBy = req.query.sortBy || 'departureTime';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const flights = await Flight.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số chuyến bay
    const total = await Flight.countDocuments(query);
    
    // Định dạng phản hồi phù hợp với frontend admin
    res.status(200).json({
      success: true,
      data: {
        flights: flights,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        totalCount: total // Thêm trường này để tương thích với frontend
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một chuyến bay
 * @route   GET /api/flights/:id
 * @access  Public
 */
exports.getFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến bay',
      });
    }
    
    res.status(200).json({
      success: true,
      data: flight,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo chuyến bay mới
 * @route   POST /api/flights
 * @access  Private/Admin
 */
exports.createFlight = async (req, res, next) => {
  try {
    const flightData = { ...req.body };
    
    // Xử lý ảnh nếu có
    if (req.file) {
      const fileType = 'common';
      const relativePath = getRelativePath(fileType, req.file.filename);
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
      flightData.image = fileUrl;
    }
    
    // Xử lý dữ liệu JSON từ form data
    if (req.body.price && typeof req.body.price === 'string') {
      flightData.price = JSON.parse(req.body.price);
    }
    
    if (req.body.seatsAvailable && typeof req.body.seatsAvailable === 'string') {
      flightData.seatsAvailable = JSON.parse(req.body.seatsAvailable);
    }
    
    if (req.body.features && typeof req.body.features === 'string') {
      flightData.features = JSON.parse(req.body.features);
    }
    
    const flight = await Flight.create(flightData);
    
    res.status(201).json({
      success: true,
      data: flight,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cập nhật chuyến bay
 * @route   PUT /api/flights/:id
 * @access  Private/Admin
 */
exports.updateFlight = async (req, res, next) => {
  try {
    // Tìm chuyến bay hiện tại
    const existingFlight = await Flight.findById(req.params.id);
    
    if (!existingFlight) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến bay',
      });
    }
    
    const flightData = { ...req.body };
    
    // Xử lý ảnh nếu có
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (existingFlight.image) {
        deleteFile(existingFlight.image);
      }
      
      // Lưu ảnh mới
      const fileType = 'common';
      const relativePath = getRelativePath(fileType, req.file.filename);
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
      flightData.image = fileUrl;
    }
    
    // Xử lý dữ liệu JSON từ form data
    if (req.body.price && typeof req.body.price === 'string') {
      flightData.price = JSON.parse(req.body.price);
    }
    
    if (req.body.seatsAvailable && typeof req.body.seatsAvailable === 'string') {
      flightData.seatsAvailable = JSON.parse(req.body.seatsAvailable);
    }
    
    if (req.body.features && typeof req.body.features === 'string') {
      flightData.features = JSON.parse(req.body.features);
    }
    
    const flight = await Flight.findByIdAndUpdate(req.params.id, flightData, {
      new: true,
      runValidators: true,
    });
    
    res.status(200).json({
      success: true,
      data: flight,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Xóa chuyến bay
 * @route   DELETE /api/flights/:id
 * @access  Private/Admin
 */
exports.deleteFlight = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyến bay',
      });
    }
    
    // Xóa ảnh liên quan nếu có
    if (flight.image) {
      deleteFile(flight.image);
    }
    
    await flight.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Chuyến bay đã được xóa',
    });
  } catch (error) {
    next(error);
  }
}; 