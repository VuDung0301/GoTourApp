const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: [true, 'Số hiệu chuyến bay là bắt buộc'],
      unique: true,
      trim: true,
    },
    airline: {
      type: String,
      required: [true, 'Hãng hàng không là bắt buộc'],
      trim: true,
    },
    departureCity: {
      type: String,
      required: [true, 'Thành phố khởi hành là bắt buộc'],
      trim: true,
    },
    arrivalCity: {
      type: String,
      required: [true, 'Thành phố đến là bắt buộc'],
      trim: true,
    },
    departureTime: {
      type: Date,
      required: [true, 'Thời gian khởi hành là bắt buộc'],
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Thời gian đến là bắt buộc'],
    },
    price: {
      economy: {
        type: Number,
        required: [true, 'Giá vé hạng phổ thông là bắt buộc'],
        min: 0,
      },
      business: {
        type: Number,
        required: [true, 'Giá vé hạng thương gia là bắt buộc'],
        min: 0,
      },
      firstClass: {
        type: Number,
        required: [true, 'Giá vé hạng nhất là bắt buộc'],
        min: 0,
      },
    },
    seatsAvailable: {
      economy: {
        type: Number,
        required: [true, 'Số ghế hạng phổ thông là bắt buộc'],
        min: 0,
      },
      business: {
        type: Number,
        required: [true, 'Số ghế hạng thương gia là bắt buộc'],
        min: 0,
      },
      firstClass: {
        type: Number,
        required: [true, 'Số ghế hạng nhất là bắt buộc'],
        min: 0,
      },
    },
    duration: {
      type: Number, // Thời gian bay tính bằng phút
      required: [true, 'Thời gian bay là bắt buộc'],
    },
    status: {
      type: String,
      enum: ['Đúng giờ', 'Trễ', 'Hủy', 'Đã bay'],
      default: 'Đúng giờ',
    },
    features: {
      wifi: { type: Boolean, default: false },
      meals: { type: Boolean, default: true },
      entertainment: { type: Boolean, default: true },
      powerOutlets: { type: Boolean, default: false },
      usb: { type: Boolean, default: false },
    },
    image: {
      type: String,
      default: 'default-flight.jpg',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Flight = mongoose.model('Flight', flightSchema);

module.exports = Flight; 