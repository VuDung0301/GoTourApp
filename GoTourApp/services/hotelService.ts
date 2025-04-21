import axios from 'axios';
import { API_URL } from '@env';
import { Hotel, HotelBooking, HotelFilter } from '../types';

// Lấy danh sách khách sạn
export const fetchHotels = async (filter?: HotelFilter, page = 1, limit = 10) => {
  try {
    let url = `${API_URL}/hotels?page=${page}&limit=${limit}`;
    
    if (filter) {
      if (filter.city) url += `&city=${filter.city}`;
      if (filter.category) url += `&category=${filter.category}`;
      if (filter.priceMin) url += `&priceMin=${filter.priceMin}`;
      if (filter.priceMax) url += `&priceMax=${filter.priceMax}`;
      if (filter.rating) url += `&rating=${filter.rating}`;
      if (filter.amenities && filter.amenities.length > 0) {
        url += `&amenities=${filter.amenities.join(',')}`;
      }
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching hotels:', error);
    throw error;
  }
};

// Lấy thông tin chi tiết khách sạn
export const fetchHotelById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/hotels/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching hotel with id ${id}:`, error);
    throw error;
  }
};

// Lấy phòng trống theo ngày
export const checkRoomAvailability = async (
  hotelId: string,
  checkInDate: string,
  checkOutDate: string,
  guests: number
) => {
  try {
    const response = await axios.get(
      `${API_URL}/hotels/${hotelId}/rooms/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guests}`
    );
    return response.data;
  } catch (error) {
    console.error('Error checking room availability:', error);
    throw error;
  }
};

// Đặt phòng khách sạn
export const bookHotel = async (bookingData: Partial<HotelBooking>) => {
  try {
    const response = await axios.post(`${API_URL}/bookings/hotel`, bookingData);
    return response.data;
  } catch (error) {
    console.error('Error booking hotel:', error);
    throw error;
  }
};

// Lấy lịch sử đặt phòng khách sạn của người dùng
export const fetchUserHotelBookings = async (userId: string) => {
  try {
    const response = await axios.get(`${API_URL}/users/${userId}/bookings/hotel`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user hotel bookings:', error);
    throw error;
  }
};

// Hủy đặt phòng khách sạn
export const cancelHotelBooking = async (bookingId: string) => {
  try {
    const response = await axios.put(`${API_URL}/bookings/hotel/${bookingId}/cancel`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling hotel booking:', error);
    throw error;
  }
};

// Tìm kiếm khách sạn
export const searchHotels = async (query: string) => {
  try {
    const response = await axios.get(`${API_URL}/hotels/search?q=${query}`);
    return response.data;
  } catch (error) {
    console.error('Error searching hotels:', error);
    throw error;
  }
};

// Lấy các loại phòng của khách sạn
export const fetchHotelRooms = async (hotelId: string) => {
  try {
    const response = await axios.get(`${API_URL}/hotels/${hotelId}/rooms`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching rooms for hotel ${hotelId}:`, error);
    throw error;
  }
}; 