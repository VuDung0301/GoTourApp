import axios from 'axios';

// Base URL của API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Tạo instance axios với cấu hình chung
const api = axios.create({
  baseURL: API_URL,
});

// Thêm interceptor để gắn token vào mỗi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Quan trọng: Không thiết lập Content-Type khi gửi FormData
    // Axios sẽ tự động thiết lập content-type đúng và thêm boundary
    if (config.data instanceof FormData) {
      // Đây là form data, để axios tự xử lý header
      delete config.headers['Content-Type'];
    } else {
      // Nếu không phải FormData thì mới thiết lập content-type
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xử lý response và lỗi
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    // Nếu token hết hạn hoặc không hợp lệ
    if (response && response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Trả về lỗi để xử lý ở components
    return Promise.reject(
      (response && response.data) || { message: 'Đã xảy ra lỗi kết nối' }
    );
  }
);

// API cho quản lý khách sạn
export const hotelsAPI = {
  getAll: (params) => api.get('/hotels', { params }),
  getById: (id) => api.get(`/hotels/${id}`),
  create: (data) => api.post('/hotels', data),
  update: (id, data) => api.put(`/hotels/${id}`, data),
  delete: (id) => api.delete(`/hotels/${id}`),
  getFeatured: () => api.get('/hotels/featured'),
  getCategories: () => api.get('/hotels/categories'),
  getPopularCities: () => api.get('/hotels/popular-cities'),
};

// API cho quản lý tour
export const toursAPI = {
  getAll: (params) => api.get('/tours', { params }),
  getById: (id) => api.get(`/tours/${id}`),
  create: (data) => api.post('/tours', data),
  update: (id, data) => api.put(`/tours/${id}`, data),
  delete: (id) => api.delete(`/tours/${id}`),
  getFeatured: () => api.get('/tours/featured'),
  getCategories: () => api.get('/tours/categories'),
  getPopularDestinations: () => api.get('/tours/popular-destinations'),
};

// API cho quản lý đặt phòng
export const bookingsAPI = {
  getAll: (params) => api.get('/hotel-bookings', { params }),
  getById: (id) => api.get(`/hotel-bookings/${id}`),
  update: (id, data) => api.put(`/hotel-bookings/${id}`, data),
  delete: (id) => api.delete(`/hotel-bookings/${id}`),
  getStats: () => api.get('/hotel-bookings/stats'),
};

// API cho quản lý đặt tour
export const tourBookingsAPI = {
  getAll: (params) => api.get('/tour-bookings', { params }),
  getById: (id) => api.get(`/tour-bookings/${id}`),
  create: (data) => api.post('/tour-bookings', data),
  update: (id, data) => api.put(`/tour-bookings/${id}`, data),
  delete: (id) => api.delete(`/tour-bookings/${id}`),
  getStats: () => api.get('/tour-bookings/stats'),
};

// API cho quản lý người dùng
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
};

// API cho quản lý đánh giá
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getById: (id) => api.get(`/reviews/${id}`),
  approve: (id) => api.put(`/reviews/${id}/approve`),
  reject: (id) => api.put(`/reviews/${id}/reject`),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// API cho phần thống kê và báo cáo
export const reportsAPI = {
  getDashboardStats: () => api.get('/dashboard/stats'),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getBookingStats: (params) => api.get('/reports/bookings', { params }),
  getUserStats: () => api.get('/reports/users'),
  getPopularServices: () => api.get('/reports/popular-services'),
};

// API xác thực
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (userData) => api.post('/auth/register', userData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => 
    api.post('/auth/reset-password', { token, newPassword }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// API cho quản lý chuyến bay
export const flightsAPI = {
  getAll: (params) => api.get('/flights', { params }),
  getById: (id) => api.get(`/flights/${id}`),
  create: (data) => api.post('/flights', data),
  update: (id, data) => api.put(`/flights/${id}`, data),
  delete: (id) => api.delete(`/flights/${id}`),
  getUpcoming: () => api.get('/flights/upcoming'),
};

// API cho quản lý đặt vé máy bay
export const flightBookingsAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  delete: (id) => api.delete(`/bookings/${id}`),
  getStats: () => api.get('/bookings/stats'),
};

export default api; 