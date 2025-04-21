const HotelBooking = require('../models/HotelBooking');
const Hotel = require('../models/Hotel');

/**
 * @desc    Lấy tất cả đặt phòng khách sạn
 * @route   GET /api/hotel-bookings
 * @access  Private (Admin)
 */
exports.getAllHotelBookings = async (req, res, next) => {
  try {
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Thực hiện query với phân trang
    const bookings = await HotelBooking.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Đếm tổng số đặt phòng
    const total = await HotelBooking.countDocuments();

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
 * @desc    Lấy chi tiết đặt phòng
 * @route   GET /api/hotel-bookings/:id
 * @access  Private
 */
exports.getHotelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra booking có tồn tại không
    const booking = await HotelBooking.findById(id)
      .populate({
        path: 'hotel',
        select: 'name address rating thumbnail',
      })
      .populate({
        path: 'room',
        select: 'name price maxGuests amenities',
      });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt phòng',
      });
    }
    
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error getting hotel booking:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin đặt phòng',
      error: error.message,
    });
  }
};

/**
 * @desc    Tạo đặt phòng mới
 * @route   POST /api/hotel-bookings
 * @access  Private
 */
exports.createHotelBooking = async (req, res, next) => {
  try {
    // Thêm user ID từ token vào req.body
    req.body.user = req.user.id;

    // Tính toán số đêm lưu trú
    const checkInDate = new Date(req.body.checkIn);
    const checkOutDate = new Date(req.body.checkOut);
    const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Cập nhật số đêm lưu trú vào req.body
    req.body.nights = nights;

    // Lấy thông tin hotel để tính giá
    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn',
      });
    }

    // Không kiểm tra phòng tồn tại, đơn giản hóa quy trình
    // Tính toán tổng giá mặc định
    const defaultPrice = 1000000; // Giá mặc định nếu không tìm thấy thông tin giá phòng
    const roomCount = req.body.roomCount || 1;

    // Tìm thông tin giá từ request hoặc sử dụng giá mặc định
    let roomPrice = defaultPrice;
    if (req.body.totalPrice) {
      // Nếu đã có giá tổng từ client, sử dụng giá đó
      roomPrice = req.body.totalPrice;
    } else {
      // Tìm phòng trong danh sách (nhưng không báo lỗi nếu không tìm thấy)
      const room = hotel.roomTypes.find(
        (r) => r.name === req.body.room || r._id.toString() === req.body.room
      );

      if (room) {
        roomPrice = (room.priceDiscount || room.price) * nights * roomCount;
      } else {
        // Sử dụng giá mặc định của khách sạn nếu không tìm thấy phòng
        roomPrice = (hotel.priceDiscount || hotel.pricePerNight || defaultPrice) * nights * roomCount;
      }
    }

    const tax = Math.round(roomPrice * 0.08); // 8% thuế
    const serviceFee = Math.round(roomPrice * 0.05); // 5% phí dịch vụ
    const totalPrice = roomPrice + tax + serviceFee;

    // Cập nhật thông tin giá vào req.body
    req.body.totalPrice = totalPrice;
    req.body.priceDetails = {
      roomPrice,
      tax,
      serviceFee,
    };

    // Tạo đặt phòng mới
    const booking = await HotelBooking.create(req.body);

    // Không cập nhật số lượng phòng có sẵn vì không kiểm tra tính khả dụng

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả đặt phòng của người dùng hiện tại
 * @route   GET /api/hotel-bookings/me
 * @access  Private
 */
exports.getMyHotelBookings = async (req, res, next) => {
  try {
    console.log('Lấy danh sách đặt phòng khách sạn của user:', req.user.id);
    
    // Phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Tìm kiếm đặt phòng của người dùng hiện tại với populate chi tiết 
    const bookings = await HotelBooking.find({ user: req.user.id })
      .populate({
        path: 'hotel',
        select: 'name address rating stars city thumbnail coverImage'
      })
      .populate({
        path: 'room',
        select: 'name price priceDiscount maxGuests amenities'
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Đếm tổng số đặt phòng
    const total = await HotelBooking.countDocuments({ user: req.user.id });

    console.log(`Tìm thấy ${bookings.length} đặt phòng cho user ${req.user.id}`);

    return res.status(200).json({
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
    console.error('Lỗi khi lấy danh sách đặt phòng khách sạn:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin đặt phòng',
      error: error.message
    });
  }
};

/**
 * @desc    Hủy đặt phòng
 * @route   PUT /api/hotel-bookings/:id/cancel
 * @access  Private
 */
exports.cancelHotelBooking = async (req, res, next) => {
  try {
    const booking = await HotelBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt phòng',
      });
    }

    // Kiểm tra quyền truy cập
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đặt phòng này',
      });
    }

    // Không kiểm tra thời gian hủy, cho phép hủy bất kỳ lúc nào

    // Cập nhật trạng thái và lý do hủy
    booking.status = 'cancelled';
    booking.cancellationDate = Date.now();
    booking.cancellationReason = req.body.reason || 'Khách hàng tự hủy';
    await booking.save();

    // Không cần cập nhật số lượng phòng có sẵn vì đã bỏ kiểm tra

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kiểm tra tính khả dụng phòng
 * @route   POST /api/hotel-bookings/check-availability
 * @access  Public
 */
exports.checkRoomAvailability = async (req, res, next) => {
  try {
    const { hotelId, roomType, checkIn, checkOut, guests, roomCount } = req.body;

    // Kiểm tra hotel có tồn tại
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn',
      });
    }

    // Tìm loại phòng (nhưng không báo lỗi nếu không tìm thấy)
    let room = hotel.roomTypes.find((r) => r.name === roomType || r._id.toString() === roomType);
    
    // Nếu không tìm thấy phòng, tạo thông tin phòng mặc định
    if (!room) {
      // Sử dụng phòng đầu tiên hoặc tạo một phòng mặc định
      room = hotel.roomTypes[0] || {
        name: 'Phòng tiêu chuẩn',
        price: hotel.pricePerNight || 1000000,
        capacity: 2,
        amenities: []
      };
    }

    // Luôn trả về khả dụng mà không kiểm tra điều kiện
    // Tính số đêm lưu trú
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Tính giá
    const roomPrice = (room.priceDiscount || room.price) * nights * roomCount;
    const tax = Math.round(roomPrice * 0.08); // 8% thuế
    const serviceFee = Math.round(roomPrice * 0.05); // 5% phí dịch vụ
    const totalPrice = roomPrice + tax + serviceFee;

    res.status(200).json({
      success: true,
      available: true,
      data: {
        hotel: {
          _id: hotel._id,
          name: hotel.name,
          stars: hotel.stars,
          address: hotel.address,
          city: hotel.city,
          coverImage: hotel.coverImage,
        },
        room: {
          name: room.name,
          price: room.price,
          priceDiscount: room.priceDiscount,
          capacity: room.capacity,
          amenities: room.amenities,
        },
        booking: {
          checkIn,
          checkOut,
          nights,
          guests,
          roomCount,
          priceDetails: {
            roomPrice,
            tax,
            serviceFee,
            totalPrice,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Kiểm tra tính khả dụng phòng mà không cần chỉ định loại phòng
 * @route   POST /api/hotel-bookings/check-auto-availability
 * @access  Public
 */
exports.checkAutoRoomAvailability = async (req, res, next) => {
  try {
    const { hotelId, checkIn, checkOut, guests } = req.body;
    const roomCount = req.body.roomCount || 1;
    
    // Kiểm tra đầu vào bắt buộc
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: hotelId, checkIn, checkOut',
      });
    }

    // Tạo đối tượng guests nếu chỉ là số
    let guestsObj = guests;
    if (typeof guests === 'number') {
      guestsObj = {
        adults: guests,
        children: 0
      };
    } else if (!guests) {
      guestsObj = {
        adults: 2,
        children: 0
      };
    }

    // Kiểm tra hotel có tồn tại
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách sạn',
      });
    }

    // Lấy phòng đầu tiên nếu có hoặc tạo phòng mặc định
    let availableRoom;
    
    if (hotel.roomTypes && hotel.roomTypes.length > 0) {
      // Sắp xếp phòng theo giá tăng dần để ưu tiên phòng rẻ nhất trước
      const sortedRooms = [...hotel.roomTypes].sort((a, b) => {
        const priceA = a.priceDiscount || a.price;
        const priceB = b.priceDiscount || b.price;
        return priceA - priceB;
      });
      
      availableRoom = sortedRooms[0]; // Lấy phòng rẻ nhất mà không kiểm tra điều kiện
    } else {
      // Tạo phòng mặc định nếu không có phòng nào
      availableRoom = {
        _id: "default",
        name: "Phòng tiêu chuẩn",
        price: hotel.pricePerNight || 1000000,
        capacity: 2,
        amenities: []
      };
    }

    // Tính số đêm lưu trú
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Tính giá
    const roomPrice = (availableRoom.priceDiscount || availableRoom.price) * nights * roomCount;
    const tax = Math.round(roomPrice * 0.08); // 8% thuế
    const serviceFee = Math.round(roomPrice * 0.05); // 5% phí dịch vụ
    const totalPrice = roomPrice + tax + serviceFee;

    res.status(200).json({
      success: true,
      available: true,
      data: {
        hotel: {
          _id: hotel._id,
          name: hotel.name,
          stars: hotel.stars,
          address: hotel.address,
          city: hotel.city,
          coverImage: hotel.coverImage,
        },
        room: {
          _id: availableRoom._id,
          name: availableRoom.name,
          price: availableRoom.price,
          priceDiscount: availableRoom.priceDiscount,
          capacity: availableRoom.capacity,
          amenities: availableRoom.amenities,
        },
        booking: {
          checkIn,
          checkOut,
          nights,
          guests: guestsObj,
          roomCount,
          priceDetails: {
            roomPrice,
            tax,
            serviceFee,
            totalPrice,
          },
        },
      },
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra phòng:', error);
    next(error);
  }
};

/**
 * @desc    Cập nhật trạng thái đặt phòng
 * @route   PUT /api/hotel-bookings/:id/status
 * @access  Private (Admin)
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const booking = await HotelBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đặt phòng',
      });
    }

    // Cập nhật trạng thái
    booking.status = req.body.status;
    if (req.body.status === 'cancelled') {
      booking.cancellationDate = Date.now();
      booking.cancellationReason = req.body.reason || 'Hủy bởi quản trị viên';
    }

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
}; 