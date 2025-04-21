// Chuyển từ localhost sang IP thực của máy tính trong cùng mạng LAN
export const API_BASE_URL = "http://10.0.2.2:5001/api";

// Nếu đang chạy trên thiết bị thật, sử dụng biến môi trường để xác định URL API
// Có thể kiểm tra môi trường và tự động chọn URL phù hợp
export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Khi đang phát triển (trên máy ảo hoặc thiết bị thật được kết nối qua USB)
    return "http://10.0.2.2:5001/api"; // Thay bằng IP của máy bạn trong mạng LAN
  } else {
    // Khi đã triển khai ứng dụng
    return "https://api.gotour.com/api"; // URL API production
  }
};

// Định nghĩa các endpoint
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: {
    CHECK: "/health",
  },
  
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    UPDATE_DETAILS: "/auth/updatedetails",
    UPDATE_PASSWORD: "/auth/updatepassword",
  },
  
  // Tours
  TOURS: {
    BASE: "/tours",
    DETAIL: (id: string) => `/tours/${id}`,
    CATEGORIES: "/tours/categories",
    CATEGORY: (category: string) => `/tours/categories/${category}`,
    POPULAR_DESTINATIONS: "/tours/popular-destinations",
    DESTINATION: (destination: string) => `/tours/destinations/${destination}`,
    FEATURED: "/tours/featured",
    POPULAR: "/tours/popular",
    NEWEST: "/tours/newest",
    BUDGET: "/tours/budget"
  },
  
  // Flights
  FLIGHTS: {
    BASE: "/flights",
    DETAIL: (id: string) => `/flights/${id}`,
  },
  
  // Hotels
  HOTELS: {
    BASE: "/hotels",
    DETAIL: (id: string) => `/hotels/${id}`,
    FEATURED: "/hotels/featured",
    SEARCH: "/hotels/search",
    CATEGORIES: "/hotels/categories",
    CATEGORY: (category: string) => `/hotels/categories/${category}`,
    POPULAR_CITIES: "/hotels/popular-cities",
    CITY: (city: string) => `/hotels/cities/${city}`,
    CHECK_AVAILABILITY: (id: string) => `/hotels/${id}/check-availability`,
  },
  
  // Bookings
  BOOKINGS: {
    BASE: "/bookings",
    DETAIL: (id: string) => `/bookings/${id}`,
    GET_MY_BOOKINGS: "/bookings/me",
  },
  
  // Tour Bookings
  TOUR_BOOKINGS: {
    BASE: "/tour-bookings",
    DETAIL: (id: string) => `/tour-bookings/${id}`,
    GET_MY_BOOKINGS: "/tour-bookings/me",
  },
  
  // Hotel Bookings
  HOTEL_BOOKINGS: {
    BASE: "/hotel-bookings",
    DETAIL: (id: string) => `/hotel-bookings/${id}`,
    GET_MY_BOOKINGS: "/hotel-bookings/me",
    CHECK_AVAILABILITY: "/hotel-bookings/check-availability",
  },
  
  // Reviews
  REVIEWS: {
    BASE: "/reviews",
    DETAIL: (id: string) => `/reviews/${id}`,
    GET_TOUR_REVIEWS: (tourId: string) => `/reviews/tour/${tourId}`,
    GET_HOTEL_REVIEWS: (hotelId: string) => `/reviews/hotel/${hotelId}`,
  },
  
  // Uploads
  UPLOADS: {
    BASE: "/uploads",
  }
}; 