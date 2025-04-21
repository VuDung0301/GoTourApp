const Booking = require('../models/Booking');
const TourBooking = require('../models/TourBooking');
const HotelBooking = require('../models/HotelBooking');
const Tour = require('../models/TourModel');
const Hotel = require('../models/Hotel');
const User = require('../models/User');

/**
 * @desc    Lấy báo cáo doanh thu
 * @route   GET /api/reports/revenue
 * @access  Private (Admin)
 */
exports.getRevenueReport = async (req, res, next) => {
  try {
    // Lấy tham số từ query
    const { startDate, endDate, type } = req.query;
    
    // Xác định khoảng thời gian báo cáo
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Điều kiện chung cho tất cả các loại booking
    const dateFilter = {
      createdAt: {
        $gte: start,
        $lte: end
      }
    };
    
    // Tùy vào loại báo cáo mà thực hiện các truy vấn khác nhau
    let revenueData = [];
    let totalRevenue = 0;
    
    if (!type || type === 'all' || type === 'flight') {
      // Doanh thu từ đặt vé máy bay
      const flightBookings = await Booking.aggregate([
        { $match: { ...dateFilter, paymentStatus: 'Đã thanh toán' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      const flightRevenue = flightBookings.reduce((sum, item) => sum + item.revenue, 0);
      totalRevenue += flightRevenue;
      
      revenueData.push({
        type: 'flight',
        dailyData: flightBookings,
        totalRevenue: flightRevenue,
        bookingCount: flightBookings.reduce((sum, item) => sum + item.count, 0)
      });
    }
    
    if (!type || type === 'all' || type === 'tour') {
      // Doanh thu từ đặt tour
      const tourBookings = await TourBooking.aggregate([
        { $match: { ...dateFilter, status: 'confirmed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$price' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      const tourRevenue = tourBookings.reduce((sum, item) => sum + item.revenue, 0);
      totalRevenue += tourRevenue;
      
      revenueData.push({
        type: 'tour',
        dailyData: tourBookings,
        totalRevenue: tourRevenue,
        bookingCount: tourBookings.reduce((sum, item) => sum + item.count, 0)
      });
    }
    
    if (!type || type === 'all' || type === 'hotel') {
      // Doanh thu từ đặt khách sạn
      const hotelBookings = await HotelBooking.aggregate([
        { $match: { ...dateFilter, isPaid: true } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      const hotelRevenue = hotelBookings.reduce((sum, item) => sum + item.revenue, 0);
      totalRevenue += hotelRevenue;
      
      revenueData.push({
        type: 'hotel',
        dailyData: hotelBookings,
        totalRevenue: hotelRevenue,
        bookingCount: hotelBookings.reduce((sum, item) => sum + item.count, 0)
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: end,
        totalRevenue,
        revenueByType: revenueData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy báo cáo điểm đến phổ biến
 * @route   GET /api/reports/popular-destinations
 * @access  Private (Admin)
 */
exports.getPopularDestinationsReport = async (req, res, next) => {
  try {
    // Lấy tham số từ query
    const { limit } = req.query;
    const limitVal = parseInt(limit) || 10;
    
    // Lấy các điểm đến phổ biến từ tour
    const popularTourDestinations = await Tour.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$startLocation.description',
          count: { $sum: 1 },
          averageRating: { $avg: '$ratingsAverage' },
          image: { $first: '$images' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limitVal }
    ]);
    
    // Lấy các thành phố phổ biến từ khách sạn
    const popularHotelCities = await Hotel.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          averageRating: { $avg: '$ratingsAverage' },
          image: { $first: '$coverImage' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limitVal }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        tourDestinations: popularTourDestinations.map(item => ({
          destination: item._id,
          count: item.count,
          averageRating: item.averageRating,
          image: Array.isArray(item.image) && item.image.length > 0 ? item.image[0] : null
        })),
        hotelCities: popularHotelCities.map(item => ({
          city: item._id,
          count: item.count,
          averageRating: item.averageRating,
          image: item.image
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy báo cáo khách hàng thân thiết
 * @route   GET /api/reports/active-customers
 * @access  Private (Admin)
 */
exports.getActiveCustomersReport = async (req, res, next) => {
  try {
    // Lấy tham số từ query
    const { limit } = req.query;
    const limitVal = parseInt(limit) || 10;
    
    // Lấy danh sách người dùng đặt nhiều tour/khách sạn nhất
    const activeUsers = await User.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'user',
          as: 'flightBookings'
        }
      },
      {
        $lookup: {
          from: 'tourbookings',
          localField: '_id',
          foreignField: 'user',
          as: 'tourBookings'
        }
      },
      {
        $lookup: {
          from: 'hotelbookings',
          localField: '_id',
          foreignField: 'user',
          as: 'hotelBookings'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          flightBookingsCount: { $size: '$flightBookings' },
          tourBookingsCount: { $size: '$tourBookings' },
          hotelBookingsCount: { $size: '$hotelBookings' },
          totalBookings: {
            $add: [
              { $size: '$flightBookings' },
              { $size: '$tourBookings' },
              { $size: '$hotelBookings' }
            ]
          },
          totalSpent: {
            $add: [
              { $sum: '$flightBookings.totalPrice' },
              { $sum: '$tourBookings.price' },
              { $sum: '$hotelBookings.totalPrice' }
            ]
          }
        }
      },
      { $sort: { totalBookings: -1, totalSpent: -1 } },
      { $limit: limitVal }
    ]);
    
    res.status(200).json({
      success: true,
      count: activeUsers.length,
      data: activeUsers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy báo cáo tour phổ biến
 * @route   GET /api/reports/popular-tours
 * @access  Private (Admin)
 */
exports.getPopularToursReport = async (req, res, next) => {
  try {
    // Lấy tham số từ query
    const { limit } = req.query;
    const limitVal = parseInt(limit) || 10;
    
    // Lấy các tour được đặt nhiều nhất
    const popularTours = await TourBooking.aggregate([
      {
        $group: {
          _id: '$tour',
          bookingsCount: { $sum: 1 },
          totalRevenue: { $sum: '$price' }
        }
      },
      {
        $lookup: {
          from: 'tours',
          localField: '_id',
          foreignField: '_id',
          as: 'tourDetails'
        }
      },
      { $unwind: '$tourDetails' },
      {
        $project: {
          tour: '$tourDetails',
          bookingsCount: 1,
          totalRevenue: 1,
          avgRating: '$tourDetails.ratingsAverage'
        }
      },
      { $sort: { bookingsCount: -1 } },
      { $limit: limitVal }
    ]);
    
    res.status(200).json({
      success: true,
      count: popularTours.length,
      data: popularTours.map(item => ({
        id: item.tour._id,
        name: item.tour.name,
        duration: item.tour.duration,
        price: item.tour.price,
        bookingsCount: item.bookingsCount,
        totalRevenue: item.totalRevenue,
        rating: item.avgRating,
        image: item.tour.images && item.tour.images.length > 0 ? item.tour.images[0] : null
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy báo cáo chuyến bay phổ biến
 * @route   GET /api/reports/popular-flights
 * @access  Private (Admin)
 */
exports.getPopularFlightsReport = async (req, res, next) => {
  try {
    // Lấy tham số từ query
    const { limit } = req.query;
    const limitVal = parseInt(limit) || 10;
    
    // Lấy các đường bay phổ biến nhất
    const popularRoutes = await Booking.aggregate([
      {
        $lookup: {
          from: 'flights',
          localField: 'flight',
          foreignField: '_id',
          as: 'flightDetails'
        }
      },
      { $unwind: '$flightDetails' },
      {
        $group: {
          _id: {
            from: '$flightDetails.departureCity',
            to: '$flightDetails.arrivalCity'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          airlines: { $addToSet: '$flightDetails.airline' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limitVal }
    ]);
    
    res.status(200).json({
      success: true,
      count: popularRoutes.length,
      data: popularRoutes.map(route => ({
        from: route._id.from,
        to: route._id.to,
        bookingsCount: route.count,
        totalRevenue: route.totalRevenue,
        airlines: route.airlines
      }))
    });
  } catch (error) {
    next(error);
  }
}; 