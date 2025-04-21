import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HotelsListPage from './pages/hotels/HotelsListPage';
import HotelFormPage from './pages/hotels/HotelFormPage';
import ToursListPage from './pages/tours/ToursListPage';
import TourFormPage from './pages/tours/TourFormPage';
import TourBookingsListPage from './pages/tours/TourBookingsListPage';
import FlightsListPage from './pages/flights/FlightsListPage';
import FlightFormPage from './pages/flights/FlightFormPage';
import FlightBookingsListPage from './pages/flights/FlightBookingsListPage';

// Kiểm tra xem người dùng đã đăng nhập chưa
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token; // Chuyển đổi sang boolean
};

// Route cần xác thực
const PrivateRoute = ({ element }) => {
  return isAuthenticated() ? element : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Trang Dashboard */}
        <Route path="/dashboard" element={<PrivateRoute element={<DashboardPage />} />} />
        
        {/* Quản lý khách sạn */}
        <Route path="/hotels" element={<PrivateRoute element={<HotelsListPage />} />} />
        <Route path="/hotels/create" element={<PrivateRoute element={<HotelFormPage />} />} />
        <Route path="/hotels/edit/:id" element={<PrivateRoute element={<HotelFormPage />} />} />
        
        {/* Quản lý tour */}
        <Route path="/tours" element={<PrivateRoute element={<ToursListPage />} />} />
        <Route path="/tours/create" element={<PrivateRoute element={<TourFormPage />} />} />
        <Route path="/tours/edit/:id" element={<PrivateRoute element={<TourFormPage />} />} />
        <Route path="/tour-bookings" element={<PrivateRoute element={<TourBookingsListPage />} />} />
        
        {/* Quản lý chuyến bay */}
        <Route path="/flights" element={<PrivateRoute element={<FlightsListPage />} />} />
        <Route path="/flights/create" element={<PrivateRoute element={<FlightFormPage />} />} />
        <Route path="/flights/edit/:id" element={<PrivateRoute element={<FlightFormPage />} />} />
        <Route path="/flight-bookings" element={<PrivateRoute element={<FlightBookingsListPage />} />} />
        
        {/* Điều hướng mặc định */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
