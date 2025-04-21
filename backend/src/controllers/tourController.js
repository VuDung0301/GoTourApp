const Tour = require('../models/TourModel');
const { upload, getRelativePath, deleteFile } = require('../utils/fileHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Lấy tất cả các tour
 * @route   GET /api/tours
 * @access  Public
 */
exports.getAllTours = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'keyword'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    let query = Tour.find(JSON.parse(queryStr));

    // Tìm kiếm theo từ khóa nếu có
    if (req.query.keyword) {
      query = query.find({
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } }
        ]
      });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const tours = await query;
    
    // Get total count for pagination
    const total = await Tour.countDocuments(JSON.parse(queryStr));

    // Định dạng phản hồi phù hợp với frontend admin
    res.status(200).json({
      success: true,
      data: {
        tours: tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total // Thêm trường này để tương thích với frontend
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy chi tiết một tour
 * @route   GET /api/tours/:id
 * @access  Public
 */
exports.getTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id).populate({
      path: 'reviews',
      select: 'review rating user'
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Tạo tour mới với hình ảnh
 * @route   POST /api/tours
 * @access  Private/Admin
 */
exports.createTour = async (req, res, next) => {
  // Cấu hình multer cho upload nhiều file
  const uploadMultiple = upload.fields([
    { name: 'coverImageFile', maxCount: 1 },
    { name: 'imagesFiles', maxCount: 10 }
  ]);

  uploadMultiple(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Lỗi từ multer
        return res.status(400).json({
          success: false,
          message: `Lỗi upload: ${err.message}`
        });
      } else {
        // Lỗi không xác định
        return res.status(500).json({
          success: false,
          message: `Lỗi upload: ${err.message}`
        });
      }
    }

    try {
      // Dữ liệu tour từ form
      const tourData = { ...req.body };
      
      // Kiểm tra giá và giá giảm
      if (tourData.price && tourData.priceDiscount) {
        const price = Number(tourData.price);
        const priceDiscount = Number(tourData.priceDiscount);
        
        if (priceDiscount >= price) {
          return res.status(400).json({
            success: false,
            message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
          });
        }
        
        // Đảm bảo dữ liệu là kiểu số
        tourData.price = price;
        tourData.priceDiscount = priceDiscount;
      }

      // Xử lý ảnh đại diện
      if (req.files.coverImageFile && req.files.coverImageFile.length > 0) {
        const file = req.files.coverImageFile[0];
        const fileType = 'common';
        const relativePath = getRelativePath(fileType, file.filename);
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
        
        tourData.coverImage = fileUrl;
      } else if (req.body.coverImage) {
        // Giữ nguyên ảnh hiện tại nếu không upload ảnh mới
        tourData.coverImage = req.body.coverImage;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Ảnh đại diện là bắt buộc'
        });
      }

      // Xử lý ảnh bổ sung
      const tourImages = [];
      
      // Thêm các URL ảnh hiện có (nếu có)
      if (req.body.images) {
        try {
          // Xử lý images được gửi từ client
          let existingImages = [];
          
          if (typeof req.body.images === 'string') {
            try {
              // Thử parse JSON từ string
              const parsedImages = JSON.parse(req.body.images);
              if (Array.isArray(parsedImages)) {
                existingImages = parsedImages;
                console.log(`Parsed images từ string JSON, có ${existingImages.length} ảnh`);
              } else {
                console.log('images sau khi parse không phải array:', parsedImages);
              }
            } catch (e) {
              console.error('Lỗi khi parse images JSON:', e);
            }
          } else if (Array.isArray(req.body.images)) {
            existingImages = req.body.images;
            console.log(`Images đã là array, có ${existingImages.length} ảnh`);
          } else {
            console.log('images không phải string hoặc array:', typeof req.body.images);
          }
          
          if (existingImages.length > 0) {
            tourImages.push(...existingImages);
            console.log(`Thêm ${existingImages.length} ảnh hiện có vào gallery`);
          }
        } catch (e) {
          console.error('Lỗi khi xử lý images:', e);
        }
      }
      
      // Thêm các file ảnh mới
      if (req.files.imagesFiles && req.files.imagesFiles.length > 0) {
        const fileType = 'common';
        
        req.files.imagesFiles.forEach(file => {
          const relativePath = getRelativePath(fileType, file.filename);
          const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
          tourImages.push(fileUrl);
        });
        console.log(`Thêm ${req.files.imagesFiles.length} ảnh mới vào gallery`);
      }
      
      tourData.images = tourImages;
      console.log(`Tổng cộng ${tourData.images.length} ảnh trong gallery sau khi xử lý`);

      // Xử lý các trường JSON
      if (tourData.locations && typeof tourData.locations === 'string') {
        try {
          tourData.locations = JSON.parse(tourData.locations);
        } catch (e) {
          console.error('Lỗi khi parse locations:', e);
        }
      }
      
      if (tourData.itinerary && typeof tourData.itinerary === 'string') {
        try {
          tourData.itinerary = JSON.parse(tourData.itinerary);
        } catch (e) {
          console.error('Lỗi khi parse itinerary:', e);
        }
      }
      
      if (tourData.startLocation && typeof tourData.startLocation === 'string') {
        try {
          tourData.startLocation = JSON.parse(tourData.startLocation);
        } catch (e) {
          console.error('Lỗi khi parse startLocation:', e);
        }
      }
      
      if (tourData.guides && typeof tourData.guides === 'string') {
        try {
          tourData.guides = JSON.parse(tourData.guides);
        } catch (e) {
          console.error('Lỗi khi parse guides:', e);
        }
      }
      
      if (tourData.includes && typeof tourData.includes === 'string') {
        try {
          tourData.includes = JSON.parse(tourData.includes);
        } catch (e) {
          console.error('Lỗi khi parse includes:', e);
        }
      }
      
      if (tourData.excludes && typeof tourData.excludes === 'string') {
        try {
          tourData.excludes = JSON.parse(tourData.excludes);
        } catch (e) {
          console.error('Lỗi khi parse excludes:', e);
        }
      }
      
      if (tourData.startDates && typeof tourData.startDates === 'string') {
        try {
          tourData.startDates = JSON.parse(tourData.startDates);
        } catch (e) {
          console.error('Lỗi khi parse startDates:', e);
        }
      }

      // Tạo tour mới
      const newTour = await Tour.create(tourData);

      res.status(201).json({
        success: true,
        data: newTour
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Cập nhật tour với ảnh
 * @route   PUT /api/tours/:id
 * @access  Private/Admin
 */
exports.updateTour = async (req, res, next) => {
  // Cấu hình multer cho upload nhiều file
  const uploadMultiple = upload.fields([
    { name: 'coverImageFile', maxCount: 1 },
    { name: 'imagesFiles', maxCount: 10 }
  ]);

  uploadMultiple(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Lỗi từ multer
        return res.status(400).json({
          success: false,
          message: `Lỗi upload: ${err.message}`
        });
      } else {
        // Lỗi không xác định
        return res.status(500).json({
          success: false,
          message: `Lỗi upload: ${err.message}`
        });
      }
    }

    try {
      // Kiểm tra tour có tồn tại không
      const tourToUpdate = await Tour.findById(req.params.id);
      if (!tourToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tour'
        });
      }

      // Dữ liệu tour từ form
      const tourData = { ...req.body };
      
      // Kiểm tra giá và giá giảm
      if (tourData.price && tourData.priceDiscount) {
        const price = Number(tourData.price);
        const priceDiscount = Number(tourData.priceDiscount);
        
        if (priceDiscount >= price) {
          return res.status(400).json({
            success: false,
            message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
          });
        }
        
        // Đảm bảo dữ liệu là kiểu số
        tourData.price = price;
        tourData.priceDiscount = priceDiscount;
      }

      // Xử lý ảnh đại diện
      if (req.files.coverImageFile && req.files.coverImageFile.length > 0) {
        const file = req.files.coverImageFile[0];
        const fileType = 'common';
        const relativePath = getRelativePath(fileType, file.filename);
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
        
        // Xóa ảnh cũ nếu có
        if (tourToUpdate.coverImage) {
          try {
            const oldImagePath = new URL(tourToUpdate.coverImage).pathname;
            const fileName = path.basename(oldImagePath);
            const fileFolder = path.dirname(oldImagePath).split('/').pop();
            if (fileName && fileFolder) {
              deleteFile(`${fileFolder}/${fileName}`);
            }
          } catch (error) {
            console.error('Lỗi khi xóa ảnh cũ:', error);
          }
        }
        
        tourData.coverImage = fileUrl;
      }

      // Xử lý ảnh bổ sung
      let tourImages = [];
      
      // Thêm các URL ảnh hiện có (nếu có)
      if (req.body.images) {
        try {
          // Xử lý images được gửi từ client
          let existingImages = [];
          
          if (typeof req.body.images === 'string') {
            try {
              // Thử parse JSON từ string
              const parsedImages = JSON.parse(req.body.images);
              if (Array.isArray(parsedImages)) {
                existingImages = parsedImages;
                console.log(`Parsed images từ string JSON, có ${existingImages.length} ảnh`);
              } else {
                console.log('images sau khi parse không phải array:', parsedImages);
              }
            } catch (e) {
              console.error('Lỗi khi parse images JSON:', e);
            }
          } else if (Array.isArray(req.body.images)) {
            existingImages = req.body.images;
            console.log(`Images đã là array, có ${existingImages.length} ảnh`);
          } else {
            console.log('images không phải string hoặc array:', typeof req.body.images);
          }
          
          if (existingImages.length > 0) {
            tourImages = [...existingImages];
            console.log(`Thêm ${existingImages.length} ảnh hiện có vào gallery`);
          }
        } catch (e) {
          console.error('Lỗi khi xử lý images:', e);
        }
      } else {
        // Giữ gallery hiện tại nếu client không gửi
        if (tourToUpdate.images && Array.isArray(tourToUpdate.images)) {
          tourImages = [...tourToUpdate.images];
          console.log(`Giữ lại ${tourImages.length} ảnh từ gallery hiện tại`);
        }
      }
      
      // Thêm các file ảnh mới
      if (req.files.imagesFiles && req.files.imagesFiles.length > 0) {
        const fileType = 'common';
        
        req.files.imagesFiles.forEach(file => {
          const relativePath = getRelativePath(fileType, file.filename);
          const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
          tourImages.push(fileUrl);
        });
        console.log(`Thêm ${req.files.imagesFiles.length} ảnh mới vào gallery`);
      }
      
      tourData.images = tourImages;
      console.log(`Tổng cộng ${tourData.images.length} ảnh trong gallery sau khi xử lý`);

      // Xử lý các trường JSON
      if (tourData.locations && typeof tourData.locations === 'string') {
        try {
          tourData.locations = JSON.parse(tourData.locations);
        } catch (e) {
          console.error('Lỗi khi parse locations:', e);
        }
      }
      
      if (tourData.itinerary && typeof tourData.itinerary === 'string') {
        try {
          tourData.itinerary = JSON.parse(tourData.itinerary);
        } catch (e) {
          console.error('Lỗi khi parse itinerary:', e);
        }
      }
      
      if (tourData.startLocation && typeof tourData.startLocation === 'string') {
        try {
          tourData.startLocation = JSON.parse(tourData.startLocation);
        } catch (e) {
          console.error('Lỗi khi parse startLocation:', e);
        }
      }
      
      if (tourData.guides && typeof tourData.guides === 'string') {
        try {
          tourData.guides = JSON.parse(tourData.guides);
        } catch (e) {
          console.error('Lỗi khi parse guides:', e);
        }
      }
      
      if (tourData.includes && typeof tourData.includes === 'string') {
        try {
          tourData.includes = JSON.parse(tourData.includes);
        } catch (e) {
          console.error('Lỗi khi parse includes:', e);
        }
      }
      
      if (tourData.excludes && typeof tourData.excludes === 'string') {
        try {
          tourData.excludes = JSON.parse(tourData.excludes);
        } catch (e) {
          console.error('Lỗi khi parse excludes:', e);
        }
      }
      
      if (tourData.startDates && typeof tourData.startDates === 'string') {
        try {
          tourData.startDates = JSON.parse(tourData.startDates);
        } catch (e) {
          console.error('Lỗi khi parse startDates:', e);
        }
      }

      // Cập nhật tour
      const updatedTour = await Tour.findByIdAndUpdate(req.params.id, tourData, {
        new: true,
        runValidators: true
      });

      res.status(200).json({
        success: true,
        data: updatedTour
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật tour:', error);
      next(error);
    }
  });
};

/**
 * @desc    Xóa tour
 * @route   DELETE /api/tours/:id
 * @access  Private/Admin
 */
exports.deleteTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tour'
      });
    }

    await tour.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tour đã được xóa thành công'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy thống kê tour
 * @route   GET /api/tours/stats
 * @access  Private/Admin
 */
exports.getTourStats = async (req, res, next) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4 } }
      },
      {
        $group: {
          _id: { $toUpper: '$difficulty' },
          numTours: { $sum: 1 },
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $sort: { avgPrice: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy top 5 tour giá rẻ
 * @route   GET /api/tours/top-5-cheap
 * @access  Public
 */
exports.getTop5CheapTours = async (req, res, next) => {
  try {
    const tours = await Tour.find()
      .sort('price -ratingsAverage')
      .limit(5);

    res.status(200).json({
      success: true,
      count: tours.length,
      data: tours
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tour theo danh mục
 * @route   GET /api/tours/categories/:category
 * @access  Public
 */
exports.getToursByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    // Tạo regex để tìm kiếm các tour có từ khóa thuộc danh mục
    // Tìm kiếm trong name, description, hoặc bất kỳ trường phù hợp
    const query = {
      $or: [
        { name: { $regex: category, $options: 'i' } },
        { description: { $regex: category, $options: 'i' } },
        // Có thể thêm trường "category" vào model nếu cần
      ]
    };

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const tours = await Tour.find(query)
      .skip(skip)
      .limit(limit)
      .sort('-ratingsAverage');
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tour theo điểm đến
 * @route   GET /api/tours/destinations/:destination
 * @access  Public
 */
exports.getToursByDestination = async (req, res, next) => {
  try {
    const { destination } = req.params;
    
    // Tìm kiếm tour với điểm đến cụ thể
    // Tìm tour có điểm đến trong tên, mô tả hoặc trong startLocation
    const query = {
      $or: [
        { name: { $regex: destination, $options: 'i' } },
        { description: { $regex: destination, $options: 'i' } },
        { 'startLocation.description': { $regex: destination, $options: 'i' } },
        { 'startLocation.address': { $regex: destination, $options: 'i' } }
      ]
    };

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    const tours = await Tour.find(query)
      .skip(skip)
      .limit(limit)
      .sort('-ratingsAverage');
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả danh mục tour
 * @route   GET /api/tours/categories
 * @access  Public
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    // Danh sách các danh mục
    const categories = [
      { id: '1', name: 'Biển', icon: 'umbrella-beach', color: '#03A9F4' },
      { id: '2', name: 'Núi', icon: 'mountains', color: '#8BC34A' },
      { id: '3', name: 'Thành phố', icon: 'city', color: '#9C27B0' },
      { id: '4', name: 'Lịch sử', icon: 'landmark', color: '#FF9800' },
      { id: '5', name: 'Ẩm thực', icon: 'utensils', color: '#F44336' },
      { id: '6', name: 'Mạo hiểm', icon: 'hiking', color: '#607D8B' },
    ];

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tất cả điểm đến phổ biến
 * @route   GET /api/tours/popular-destinations
 * @access  Public
 */
exports.getPopularDestinations = async (req, res, next) => {
  try {
    // Sử dụng aggregation để đếm số lượng tour cho từng điểm đến
    const counts = await Tour.aggregate([
      {
        $match: { active: true } // Chỉ đếm tour đang active
      },
      {
        $group: {
          _id: '$startLocation.description',
          count: { $sum: 1 },
          image: { $first: '$imageCover' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 8
      }
    ]);

    // Nếu không đủ dữ liệu từ DB, kết hợp với dữ liệu mẫu
    let destinations = counts.map((item, index) => ({
      id: index.toString(),
      name: item._id || 'Điểm đến',
      image: item.image || 'https://images.unsplash.com/photo-1570868738484-9fe36193da5b',
      color: getDestinationColor(index),
      tourCount: item.count
    }));

    // Nếu không đủ 6 điểm đến, bổ sung thêm
    if (destinations.length < 6) {
      const sampleDestinations = [
        { id: '1', name: 'Đà Lạt', image: 'https://images.unsplash.com/photo-1540308990836-9d27888d48e5', color: '#4CAF50', tourCount: 20 },
        { id: '2', name: 'Phú Quốc', image: 'https://images.unsplash.com/photo-1594380978175-7239bbfa6acb', color: '#2196F3', tourCount: 15 },
        { id: '3', name: 'Hạ Long', image: 'https://images.unsplash.com/photo-1573165231839-7aa0a7d6198f', color: '#9C27B0', tourCount: 18 },
        { id: '4', name: 'Nha Trang', image: 'https://images.unsplash.com/photo-1570868738484-9fe36193da5b', color: '#FF9800', tourCount: 12 },
        { id: '5', name: 'Hội An', image: 'https://images.unsplash.com/photo-1559592432-40e4760f4903', color: '#F44336', tourCount: 22 },
        { id: '6', name: 'Sapa', image: 'https://images.unsplash.com/photo-1562255355-06c922709729', color: '#607D8B', tourCount: 10 },
      ];

      // Thêm các điểm đến mẫu nếu chưa có trong kết quả từ DB
      const existingNames = destinations.map(d => d.name.toLowerCase());
      const additionalDestinations = sampleDestinations.filter(
        d => !existingNames.includes(d.name.toLowerCase())
      );

      destinations = [...destinations, ...additionalDestinations.slice(0, 6 - destinations.length)];
    }

    res.status(200).json({
      success: true,
      data: destinations
    });
  } catch (error) {
    next(error);
  }
};

// Hàm chọn màu cho các điểm đến
function getDestinationColor(index) {
  const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', '#607D8B', '#795548', '#3F51B5'];
  return colors[index % colors.length];
}

/**
 * @desc    Lấy tour nổi bật (có rating cao)
 * @route   GET /api/tours/featured
 * @access  Public
 */
exports.getFeaturedTours = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Lấy tours nổi bật dựa vào rating cao
    const tours = await Tour.find({ ratingsAverage: { $gte: 4.0 }, active: true })
      .sort('-ratingsAverage -ratingsQuantity')
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments({ ratingsAverage: { $gte: 4.0 }, active: true });

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tour phổ biến nhất (nhiều lượt đánh giá)
 * @route   GET /api/tours/popular
 * @access  Public
 */
exports.getPopularTours = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Lấy tours phổ biến dựa vào số lượng đánh giá
    const tours = await Tour.find({ active: true })
      .sort('-ratingsQuantity -ratingsAverage')
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments({ active: true });

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tour mới nhất
 * @route   GET /api/tours/newest
 * @access  Public
 */
exports.getNewestTours = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Lấy tours mới nhất dựa vào ngày tạo
    const tours = await Tour.find({ active: true })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments({ active: true });

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lấy tour giá rẻ
 * @route   GET /api/tours/budget
 * @access  Public
 */
exports.getBudgetTours = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Lấy tours giá rẻ
    const tours = await Tour.find({ active: true })
      .sort('price -ratingsAverage')
      .skip(skip)
      .limit(limit);
    
    // Đếm tổng số lượng kết quả
    const total = await Tour.countDocuments({ active: true });

    res.status(200).json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
}; 