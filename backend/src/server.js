const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/error');

// Load env vars
dotenv.config({ path: './.env' });

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const flightRoutes = require('./routes/flightRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const tourRoutes = require('./routes/tourRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tourBookingRoutes = require('./routes/tourBookingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const hotelBookingRoutes = require('./routes/hotelBookingRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Body parser - tăng giới hạn dung lượng để xử lý requests lớn
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Logging middleware cho debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Enable CORS - cho phép tất cả các origin
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, '../public')));

// Test endpoint đơn giản - để kiểm tra kết nối
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API kết nối thành công',
    time: new Date().toISOString()
  });
});

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tour-bookings', tourBookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/hotel-bookings', hotelBookingRoutes);
app.use('/api/users', userRoutes);
// Custom error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server đang chạy ở cổng ${PORT}`);
});

// Xử lý các ngoại lệ không bắt được
process.on('unhandledRejection', (err, promise) => {
  console.log(`Lỗi: ${err.message}`);
  // Đóng server và thoát
  server.close(() => process.exit(1));
});