// Định nghĩa các types cho User
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin';
}

// Định nghĩa types cho Tour
export interface Tour {
  _id: string;
  name: string;
  slug: string;
  description: string;
  duration: number;
  maxGroupSize: number;
  difficulty: 'dễ' | 'trung bình' | 'khó';
  price: number;
  priceDiscount?: number;
  coverImage: string;
  images: string[];
  startDates: string[];
  ratingsAverage: number;
  ratingsQuantity: number;
  includes: string[];
  excludes: string[];
  itinerary: TourItinerary[];
  locations: TourLocation[];
  startLocation: TourLocation;
  active: boolean;
}

export interface TourItinerary {
  day: number;
  title: string;
  description: string;
  activities: string[];
  accommodation: string;
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
}

export interface TourLocation {
  type: string;
  coordinates: number[];
  address: string;
  description: string;
  day?: number;
}

// Định nghĩa types cho Flight
export interface Flight {
  _id: string;
  flightNumber: string;
  airline: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  price: {
    economy: number;
    business: number;
    firstClass: number;
  };
  seatsAvailable: {
    economy: number;
    business: number;
    firstClass: number;
  };
  duration: number;
  status: 'Đúng giờ' | 'Trễ' | 'Hủy' | 'Đã bay';
  features: {
    wifi: boolean;
    meals: boolean;
    entertainment: boolean;
    powerOutlets: boolean;
    usb: boolean;
  };
  image: string;
  active: boolean;
}

// Định nghĩa types cho Booking
export interface Booking {
  _id: string;
  user: string | User;
  flight: string | Flight;
  bookingDate: string;
  passengers: Passenger[];
  totalPrice: number;
  paymentStatus: 'Chưa thanh toán' | 'Đã thanh toán' | 'Hoàn tiền';
  status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã hủy';
}

export interface Passenger {
  name: string;
  type: 'Người lớn' | 'Trẻ em' | 'Em bé';
  seatClass: 'economy' | 'business' | 'firstClass';
  seatNumber?: string;
  passport?: string;
  dateOfBirth?: string;
}

// Định nghĩa types cho TourBooking
export interface TourBooking {
  _id: string;
  user: string | User;
  tour: string | Tour;
  bookingDate: string;
  startDate: string;
  participants: Participant[];
  totalPrice: number;
  paymentStatus: 'Chưa thanh toán' | 'Đã thanh toán' | 'Hoàn tiền';
  status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã hủy';
}

export interface Participant {
  name: string;
  type: 'Người lớn' | 'Trẻ em' | 'Em bé';
  dateOfBirth?: string;
  passport?: string;
  specialRequirements?: string;
}

// Định nghĩa types cho Review
export interface Review {
  _id: string;
  title: string;
  text: string;
  rating: number;
  tour?: string | Tour;
  hotel?: string | Hotel;
  user: string | User;
  createdAt: string;
}

// Định nghĩa types cho Hotel
export interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  category: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  discount?: number;
  amenities?: string[];
  rooms?: HotelRoom[];
  latitude?: number;
  longitude?: number;
  checkInTime?: string;
  checkOutTime?: string;
  policies?: string[];
}

export interface HotelRoom {
  id: string;
  name: string;
  description: string;
  maxOccupancy: number;
  pricePerNight: number;
  discount?: number;
  images: string[];
  amenities: string[];
  quantity: number;
}

export interface HotelBooking {
  _id: string;
  bookingNumber?: string;
  bookingReference?: string;
  hotel: string | Hotel;
  user: string | User;
  room: string;
  roomCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: {
    adults: number;
    children: number;
  };
  contactInfo: {
    name?: string;
    fullName?: string;
    email: string;
    phone: string;
    identification?: string;
  };
  totalPrice: number;
  priceDetails: {
    roomPrice: number;
    tax: number;
    serviceFee: number;
  };
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  specialRequests?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelFilter {
  category?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  amenities?: string[];
}

export interface HotelCategory {
  name: string;
  title: string;
  icon: string;
  description: string;
}

export interface HotelCity {
  city: string;
  count: number;
  rating: number;
  image: string;
} 