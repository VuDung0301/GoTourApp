const mongoose = require('mongoose');

const tourBookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking phải thuộc về một tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Booking phải thuộc về một người dùng']
    },
    price: {
      type: Number,
      required: [true, 'Booking phải có giá']
    },
    participants: {
      type: Number,
      required: [true, 'Booking phải có số lượng người tham gia'],
      min: [1, 'Số lượng người tham gia phải lớn hơn hoặc bằng 1']
    },
    bookingDate: {
      type: Date,
      default: Date.now()
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled', 'completed'],
        message: 'Trạng thái không hợp lệ'
      },
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['credit_card', 'bank_transfer', 'cash', 'paypal'],
        message: 'Phương thức thanh toán không hợp lệ'
      },
      default: 'bank_transfer'
    },
    specialRequests: {
      type: String,
      trim: true
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
tourBookingSchema.index({ tour: 1, user: 1 }, { unique: false });
tourBookingSchema.index({ status: 1 });

// Middleware
tourBookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'tour',
    select: 'name price images'
  });
  next();
});

module.exports = mongoose.model('TourBooking', tourBookingSchema); 