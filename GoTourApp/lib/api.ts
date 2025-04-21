import { API_BASE_URL, API_ENDPOINTS, getApiBaseUrl } from '@/constants/ApiConfig';

/**
 * Định nghĩa kiểu dữ liệu cho việc đặt vé máy bay
 */
interface FlightBookingData {
  flightId: string;
  passengers: number;
  class: 'economy' | 'business' | 'firstClass';
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    identification?: string;
  };
  additionalRequests?: string;
}

/**
 * Thêm tham số roomType vào interface CheckAvailabilityParams
 */
export interface CheckAvailabilityParams {
  checkIn: string;
  checkOut: string;
  guests: number;
}

/**
 * Hàm xử lý lỗi từ API
 */
const handleError = (error: any) => {
  console.error('API Error:', JSON.stringify(error));
  if (error.response) {
    // Lỗi từ response của server
    console.log('Lỗi response:', error.response.status, error.response.data?.message);
    return {
      success: false,
      message: error.response.data?.message || 'Đã xảy ra lỗi từ server',
      statusCode: error.response.status,
    };
  } 
  if (error.request) {
    // Không nhận được response
    console.log('Lỗi request:', error.request);
    return {
      success: false,
      message: 'Không thể kết nối đến server',
      statusCode: 0,
    };
  }
  // Lỗi khi setup request
  console.log('Lỗi khác:', error.message);
  return {
    success: false,
    message: error.message || 'Đã xảy ra lỗi',
    statusCode: 0,
  };
};

/**
 * Hàm thực hiện các request API
 */
export const fetchApi = async (
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  token?: string
) => {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`Gọi API: ${method} ${url}`);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    // Xử lý các trường hợp phản hồi không thành công
    if (!response.ok) {
      // Thử lấy dữ liệu phản hồi nếu có
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { message: `Lỗi HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Xử lý mã lỗi HTTP cụ thể
      switch (response.status) {
        case 404:
          console.error(`Không tìm thấy tài nguyên: ${endpoint}`);
          return {
            success: false,
            statusCode: 404,
            message: responseData.message || 'Không tìm thấy tài nguyên',
            data: []
          };
        case 403:
          console.error(`Không có quyền truy cập: ${endpoint}`);
          return {
            success: false,
            statusCode: 403,
            message: responseData.message || 'Không có quyền truy cập',
            data: []
          };
        case 401:
          console.error(`Yêu cầu xác thực: ${endpoint}`);
          return {
            success: false,
            statusCode: 401,
            message: responseData.message || 'Vui lòng đăng nhập để tiếp tục',
            data: []
          };
        case 500:
          console.error(`Lỗi server: ${endpoint}`);
          return {
            success: false,
            statusCode: 500,
            message: responseData.message || 'Lỗi server, vui lòng thử lại sau',
            data: []
          };
        default:
          console.error(`Lỗi HTTP ${response.status}: ${endpoint}`);
          return {
            success: false,
            statusCode: response.status,
            message: responseData.message || `Lỗi không xác định (${response.status})`,
            data: []
          };
      }
    }
    
    // Xử lý phản hồi thành công
    const responseData = await response.json();
    
    // Đảm bảo dữ liệu phản hồi có đúng format
    if (!responseData.hasOwnProperty('success')) {
      responseData.success = true;
    }
    
    return responseData;
  } catch (error: any) {
    console.error('Lỗi khi gọi API:', error.message);
    
    // Xử lý lỗi mạng hoặc lỗi parsing JSON
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return {
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
        statusCode: 0,
        data: []
      };
    }
    
    // Các lỗi khác
    return {
      success: false,
      message: error.message || 'Đã xảy ra lỗi không xác định',
      statusCode: 0,
      data: []
    };
  }
};

/**
 * Kiểm tra kết nối đến server API
 * @returns Promise<boolean> true nếu server hoạt động, false nếu không
 */
export const checkApiServer = async (): Promise<boolean> => {
  try {
    const baseUrl = getApiBaseUrl();
    
    // Sử dụng AbortController để tạo timeout cho fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 giây timeout
    
    const response = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH.CHECK}`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Nếu server trả về status 200, có nghĩa là server hoạt động
    return response.ok;
  } catch (error) {
    console.error('Lỗi khi kiểm tra server API:', error);
    return false;
  }
};

/**
 * API Functions cho Tours
 */
export const toursApi = {
  getAll: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.BASE}${queryString}`);
  },
  
  getById: (id: string) => {
    return fetchApi(API_ENDPOINTS.TOURS.DETAIL(id));
  },
  
  searchTours: (searchTerm: string, params?: Record<string, any>) => {
    const queryParams = { 
      keyword: searchTerm,
      ...params
    };
    const queryString = `?${new URLSearchParams(queryParams as any).toString()}`;
    return fetchApi(`${API_ENDPOINTS.TOURS.BASE}${queryString}`);
  },

  getCategories: () => {
    return fetchApi(API_ENDPOINTS.TOURS.CATEGORIES);
  },

  getToursByCategory: (category: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.CATEGORY(category)}${queryString}`);
  },

  getPopularDestinations: () => {
    return fetchApi(API_ENDPOINTS.TOURS.POPULAR_DESTINATIONS);
  },

  getToursByDestination: (destination: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.DESTINATION(destination)}${queryString}`);
  },
  
  // Thêm các hàm mới cho trang khám phá
  getFeaturedTours: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.FEATURED}${queryString}`);
  },
  
  getPopularTours: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.POPULAR}${queryString}`);
  },
  
  getNewestTours: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.NEWEST}${queryString}`);
  },
  
  getBudgetTours: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOURS.BUDGET}${queryString}`);
  }
};

/**
 * API Functions cho Flights
 */
export const flightsApi = {
  getAll: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.FLIGHTS.BASE}${queryString}`);
  },
  
  getById: (id: string) => {
    return fetchApi(API_ENDPOINTS.FLIGHTS.DETAIL(id));
  },
  
  searchFlights: (params: { 
    departureCity?: string; 
    arrivalCity?: string; 
    departureDate?: string;
    returnDate?: string;
    passengers?: number;
  }) => {
    const queryString = `?${new URLSearchParams(params as any).toString()}`;
    return fetchApi(`${API_ENDPOINTS.FLIGHTS.BASE}/search${queryString}`);
  },

  // Kiểm tra tính khả dụng của chuyến bay trước khi đặt vé
  checkFlightAvailability: async (flightId: string, passengers: number, seatClass: string) => {
    console.log(`Kiểm tra khả dụng của chuyến bay ${flightId} với ${passengers} hành khách, hạng ${seatClass}`);
    
    try {
      // Đầu tiên lấy thông tin chi tiết của chuyến bay
      const flightResponse = await fetchApi(API_ENDPOINTS.FLIGHTS.DETAIL(flightId), 'GET');
      const flight = flightResponse.data;
      
      // Kiểm tra số lượng ghế còn trống cho hạng ghế đã chọn
      let availableSeats = 0;
      
      switch(seatClass) {
        case 'economy':
          availableSeats = flight.availableSeats.economy;
          break;
        case 'business':
          availableSeats = flight.availableSeats.business;
          break;
        case 'firstClass':
          availableSeats = flight.availableSeats.firstClass;
          break;
        default:
          throw new Error('Hạng ghế không hợp lệ');
      }
      
      console.log(`Số ghế còn trống cho hạng ${seatClass}: ${availableSeats}`);
      
      // Kiểm tra xem có đủ ghế trống không
      if (availableSeats < passengers) {
        return {
          success: false,
          message: `Không đủ ghế trống. Chỉ còn ${availableSeats} ghế cho hạng ${seatClass}.`
        };
      }
      
      return {
        success: true,
        message: 'Chuyến bay khả dụng',
        flight
      };
    } catch (error: any) {
      console.error('Lỗi khi kiểm tra khả dụng chuyến bay:', error);
      return {
        success: false,
        message: error.message || 'Không thể kiểm tra tính khả dụng của chuyến bay'
      };
    }
  },

  // Đặt vé máy bay
  bookFlight: (bookingData: FlightBookingData, token?: string) => {
    console.log('Booking flight với dữ liệu:', JSON.stringify(bookingData));
    
    // Đảm bảo flightId là chuỗi và được chuẩn hóa
    const flightId = String(bookingData.flightId).trim();
    
    // Tạo mảng hành khách đúng cách với các trường yêu cầu của backend
    const passengersArray = [];
    for (let i = 0; i < bookingData.passengers; i++) {
      passengersArray.push({
        seatClass: bookingData.class,
        name: bookingData.contactInfo.fullName, // Trường name thay vì fullName
        idNumber: bookingData.contactInfo.identification, // Trường idNumber thay vì identification
        gender: 'Nam', // Thêm trường giới tính bắt buộc
        dob: '1990-01-01', // Thêm trường ngày sinh bắt buộc (định dạng YYYY-MM-DD)
      });
    }
    
    // Chuyển đổi dữ liệu từ app sang định dạng backend
    const apiBookingData = {
      flightId,
      passengers: passengersArray,
      contactInfo: {
        fullName: bookingData.contactInfo.fullName,
        email: bookingData.contactInfo.email,
        phone: bookingData.contactInfo.phone,
      },
      paymentMethod: 'Cash', // Thay 'PayAtOffice' thành 'Cash' để phù hợp với enum trong model
      additionalServices: bookingData.additionalRequests ? {
        specialRequests: {
          selected: true,
          details: bookingData.additionalRequests,
          price: 0
        }
      } : undefined
    };

    console.log('Gọi API:', `${API_ENDPOINTS.BOOKINGS.BASE}`);
    console.log('Dữ liệu gửi đi:', JSON.stringify(apiBookingData));
    
    return fetchApi(API_ENDPOINTS.BOOKINGS.BASE, 'POST', apiBookingData, token);
  },

  // Hàm kiểm tra khả năng đặt chuyến bay
  testFlightBooking: async (flightId: string) => {
    try {
      console.log('Kiểm tra chuyến bay với ID:', flightId);
      
      if (!flightId) {
        return {
          success: false,
          message: 'Thiếu ID chuyến bay'
        };
      }
      
      // Bước 1: Kiểm tra xem chuyến bay có tồn tại không
      const flightResponse = await fetchApi(API_ENDPOINTS.FLIGHTS.DETAIL(flightId), 'GET');
      
      if (!flightResponse.success) {
        return {
          success: false,
          message: 'Không tìm thấy chuyến bay với ID đã cung cấp'
        };
      }
      
      const flight = flightResponse.data;
      console.log('Tìm thấy chuyến bay:', flight.flightNumber);
      
      // Bước 2: Gửi request thử nghiệm
      const testBookingData = {
        flightId: String(flightId),
        passengers: [
          {
            seatClass: 'economy',
            name: 'Người dùng test',
            idNumber: '000000000000',
            gender: 'Nam',
            dob: '1990-01-01'
          }
        ],
        contactInfo: {
          fullName: 'Người dùng test',
          email: 'test@example.com',
          phone: '0987654321'
        },
        isTestBooking: true
      };
      
      console.log('Dữ liệu kiểm tra:', JSON.stringify(testBookingData));
      
      // Gọi API booking với cờ test để kiểm tra mà không tạo booking thật
      const response = await fetchApi(`${API_ENDPOINTS.BOOKINGS.BASE}/test`, 'POST', testBookingData);
      
      if (response.success) {
        return {
          success: true,
          message: 'Chuyến bay khả dụng và có thể đặt vé',
          flightInfo: {
            _id: flight._id,
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departureCity: flight.departureCity,
            arrivalCity: flight.arrivalCity,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            price: flight.price,
            availableSeats: flight.seatsAvailable
          },
          testData: response.testData
        };
      } else {
        return {
          success: false,
          message: response.message || 'Không thể đặt vé cho chuyến bay này'
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra booking:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi kiểm tra chuyến bay'
      };
    }
  }
};

/**
 * API Functions cho Auth
 */
export const authApi = {
  login: (email: string, password: string) => {
    return fetchApi(API_ENDPOINTS.AUTH.LOGIN, 'POST', { email, password });
  },
  
  register: (userData: { name: string, email: string, password: string, phone?: string }) => {
    return fetchApi(API_ENDPOINTS.AUTH.REGISTER, 'POST', userData);
  },
  
  logout: (token: string) => {
    return fetchApi(API_ENDPOINTS.AUTH.LOGOUT, 'GET', undefined, token);
  },
  
  getMe: (token: string) => {
    return fetchApi(API_ENDPOINTS.AUTH.ME, 'GET', undefined, token);
  },
  
  updateDetails: (token: string, userData: { name?: string, email?: string, phone?: string }) => {
    return fetchApi(API_ENDPOINTS.AUTH.UPDATE_DETAILS, 'PUT', userData, token);
  },
  
  updatePassword: (token: string, passwordData: { currentPassword: string, newPassword: string }) => {
    return fetchApi(API_ENDPOINTS.AUTH.UPDATE_PASSWORD, 'PUT', passwordData, token);
  }
};

/**
 * API Functions cho Bookings
 */
export const bookingsApi = {
  getAll: (token: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.BOOKINGS.BASE}${queryString}`, 'GET', undefined, token);
  },
  
  getById: (id: string, token: string) => {
    return fetchApi(API_ENDPOINTS.BOOKINGS.DETAIL(id), 'GET', undefined, token);
  },
  
  create: (bookingData: any, token: string) => {
    return fetchApi(API_ENDPOINTS.BOOKINGS.BASE, 'POST', bookingData, token);
  },
  
  getMyBookings: (token: string) => {
    return fetchApi(API_ENDPOINTS.BOOKINGS.GET_MY_BOOKINGS, 'GET', undefined, token);
  },
  
  cancelBooking: (id: string, token: string) => {
    return fetchApi(`${API_ENDPOINTS.BOOKINGS.DETAIL(id)}/cancel`, 'PUT', undefined, token);
  },
  
  // Hủy đặt tour
  cancelTourBooking: (id: string, token: string) => {
    return fetchApi(`${API_ENDPOINTS.TOUR_BOOKINGS.DETAIL(id)}/cancel`, 'PUT', undefined, token);
  },

  // Lấy thông tin chi tiết về đặt vé máy bay
  getFlightBooking: (id: string, token?: string) => {
    console.log('Lấy thông tin đặt vé máy bay ID:', id);
    return fetchApi(API_ENDPOINTS.BOOKINGS.DETAIL(id), 'GET', undefined, token);
  },
  
  // Lấy thông tin chi tiết về đặt tour
  getTourBooking: (id: string, token?: string) => {
    console.log('Lấy thông tin đặt tour ID:', id);
    return fetchApi(`${API_ENDPOINTS.TOUR_BOOKINGS.DETAIL(id)}`, 'GET', undefined, token);
  },

  // Lấy thông tin chi tiết về đặt phòng khách sạn
  getHotelBooking: (id: string, token?: string) => {
    console.log('Lấy thông tin đặt phòng khách sạn ID:', id);
    return fetchApi(`${API_ENDPOINTS.HOTEL_BOOKINGS.DETAIL(id)}`, 'GET', undefined, token);
  },

  // Đặt vé máy bay
  bookFlight: (bookingData: FlightBookingData, token?: string) => {
    console.log('Booking flight với dữ liệu:', JSON.stringify(bookingData));
    
    // Đảm bảo flightId là chuỗi và được chuẩn hóa
    const flightId = String(bookingData.flightId).trim();
    
    // Tạo mảng hành khách đúng cách với các trường yêu cầu của backend
    const passengersArray = [];
    for (let i = 0; i < bookingData.passengers; i++) {
      passengersArray.push({
        seatClass: bookingData.class,
        name: bookingData.contactInfo.fullName, // Trường name thay vì fullName
        idNumber: bookingData.contactInfo.identification, // Trường idNumber thay vì identification
        gender: 'Nam', // Thêm trường giới tính bắt buộc
        dob: '1990-01-01', // Thêm trường ngày sinh bắt buộc (định dạng YYYY-MM-DD)
      });
    }
    
    // Chuyển đổi dữ liệu từ app sang định dạng backend
    const apiBookingData = {
      flightId,
      passengers: passengersArray,
      contactInfo: {
        fullName: bookingData.contactInfo.fullName,
        email: bookingData.contactInfo.email,
        phone: bookingData.contactInfo.phone,
      },
      paymentMethod: 'Cash', // Thay 'PayAtOffice' thành 'Cash' để phù hợp với enum trong model
      additionalServices: bookingData.additionalRequests ? {
        specialRequests: {
          selected: true,
          details: bookingData.additionalRequests,
          price: 0
        }
      } : undefined
    };

    console.log('Gọi API:', `${API_ENDPOINTS.BOOKINGS.BASE}`);
    console.log('Dữ liệu gửi đi:', JSON.stringify(apiBookingData));
    
    return fetchApi(API_ENDPOINTS.BOOKINGS.BASE, 'POST', apiBookingData, token);
  },

  // Thêm hàm bookHotel để đặt phòng khách sạn
  bookHotel: (bookingData: any, token?: string) => {
    console.log('Đặt phòng khách sạn với dữ liệu:', JSON.stringify(bookingData));
    
    // Đảm bảo định dạng dữ liệu đúng cho backend
    const apiBookingData = {
      hotel: bookingData.hotelId,
      room: bookingData.roomId,
      roomCount: bookingData.roomCount || 1,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      guests: bookingData.guests,
      contactInfo: bookingData.contactInfo,
      specialRequests: bookingData.specialRequests,
      totalPrice: bookingData.totalPrice
    };

    console.log('Gọi API:', `${API_ENDPOINTS.HOTEL_BOOKINGS.BASE}`);
    console.log('Dữ liệu gửi đi:', JSON.stringify(apiBookingData));
    
    return fetchApi(API_ENDPOINTS.HOTEL_BOOKINGS.BASE, 'POST', apiBookingData, token);
  },

  // Hàm kiểm tra khả năng đặt chuyến bay
  testFlightBooking: async (flightId: string) => {
    try {
      console.log('Kiểm tra chuyến bay với ID:', flightId);
      
      if (!flightId) {
        return {
          success: false,
          message: 'Thiếu ID chuyến bay'
        };
      }
      
      // Bước 1: Kiểm tra xem chuyến bay có tồn tại không
      const flightResponse = await fetchApi(API_ENDPOINTS.FLIGHTS.DETAIL(flightId), 'GET');
      
      if (!flightResponse.success) {
        return {
          success: false,
          message: 'Không tìm thấy chuyến bay với ID đã cung cấp'
        };
      }
      
      const flight = flightResponse.data;
      console.log('Tìm thấy chuyến bay:', flight.flightNumber);
      
      // Bước 2: Gửi request thử nghiệm
      const testBookingData = {
        flightId: String(flightId),
        passengers: [
          {
            seatClass: 'economy',
            name: 'Người dùng test',
            idNumber: '000000000000',
            gender: 'Nam',
            dob: '1990-01-01'
          }
        ],
        contactInfo: {
          fullName: 'Người dùng test',
          email: 'test@example.com',
          phone: '0987654321'
        },
        isTestBooking: true
      };
      
      console.log('Dữ liệu kiểm tra:', JSON.stringify(testBookingData));
      
      // Gọi API booking với cờ test để kiểm tra mà không tạo booking thật
      const response = await fetchApi(`${API_ENDPOINTS.BOOKINGS.BASE}/test`, 'POST', testBookingData);
      
      if (response.success) {
        return {
          success: true,
          message: 'Chuyến bay khả dụng và có thể đặt vé',
          flightInfo: {
            _id: flight._id,
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departureCity: flight.departureCity,
            arrivalCity: flight.arrivalCity,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            price: flight.price,
            availableSeats: flight.seatsAvailable
          },
          testData: response.testData
        };
      } else {
        return {
          success: false,
          message: response.message || 'Không thể đặt vé cho chuyến bay này'
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra booking:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi kiểm tra chuyến bay'
      };
    }
  },

  // Hàm kiểm tra khả năng đặt tour
  testTourBooking: async (tourId: string, startDate: string | Date, numOfPeople: number = 1) => {
    try {
      console.log('Kiểm tra tour với ID:', tourId);
      
      if (!tourId) {
        return {
          success: false,
          message: 'Thiếu ID tour'
        };
      }
      
      // Bước 1: Kiểm tra xem tour có tồn tại không
      const tourResponse = await fetchApi(API_ENDPOINTS.TOURS.DETAIL(tourId), 'GET');
      
      if (!tourResponse.success) {
        return {
          success: false,
          message: 'Không tìm thấy tour với ID đã cung cấp'
        };
      }
      
      const tour = tourResponse.data;
      console.log('Tìm thấy tour:', tour.name);
      
      // Chuyển startDate thành chuỗi ISO nếu là đối tượng Date
      const startDateStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
      
      // Bước 2: Gửi request thử nghiệm
      const testBookingData = {
        tourId: String(tourId),
        startDate: startDateStr,
        numOfPeople: numOfPeople,
        contactInfo: {
          name: 'Người dùng test',
          email: 'test@example.com',
          phone: '0987654321'
        },
        isTestBooking: true // Cờ để backend biết đây là request test
      };
      
      console.log('Dữ liệu kiểm tra đặt tour:', JSON.stringify(testBookingData));
      
      // Gọi API booking/test để kiểm tra mà không tạo booking thật
      const response = await fetchApi(`${API_ENDPOINTS.BOOKINGS.BASE}/test`, 'POST', testBookingData);
      
      if (response.success) {
        return {
          success: true,
          message: 'Tour khả dụng và có thể đặt',
          tourInfo: {
            _id: tour._id,
            name: tour.name,
            duration: tour.duration,
            maxGroupSize: tour.maxGroupSize,
            difficulty: tour.difficulty,
            price: tour.price,
            priceDiscount: tour.priceDiscount,
            startDate: startDateStr,
            totalPrice: (tour.priceDiscount || tour.price) * numOfPeople
          },
          testData: response.testData
        };
      } else {
        return {
          success: false,
          message: response.message || 'Không thể đặt tour này'
        };
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra booking tour:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi kiểm tra tour'
      };
    }
  }
};

/**
 * API Functions cho Tour Bookings
 */
export const tourBookingsApi = {
  getAll: (token: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.TOUR_BOOKINGS.BASE}${queryString}`, 'GET', undefined, token);
  },
  
  getById: (id: string, token: string) => {
    return fetchApi(API_ENDPOINTS.TOUR_BOOKINGS.DETAIL(id), 'GET', undefined, token);
  },
  
  create: (bookingData: any, token: string) => {
    return fetchApi(API_ENDPOINTS.TOUR_BOOKINGS.BASE, 'POST', bookingData, token);
  },
  
  getMyBookings: (token: string) => {
    return fetchApi(API_ENDPOINTS.TOUR_BOOKINGS.GET_MY_BOOKINGS, 'GET', undefined, token);
  },
  
  cancelBooking: (id: string, token: string) => {
    return fetchApi(`${API_ENDPOINTS.TOUR_BOOKINGS.DETAIL(id)}/cancel`, 'PUT', undefined, token);
  }
};

/**
 * API Functions cho Reviews
 */
export const reviewsApi = {
  getAll: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.REVIEWS.BASE}${queryString}`);
  },
  
  getById: (id: string) => {
    return fetchApi(API_ENDPOINTS.REVIEWS.DETAIL(id));
  },
  
  getTourReviews: (tourId: string) => {
    try {
      return fetchApi(API_ENDPOINTS.REVIEWS.GET_TOUR_REVIEWS(tourId));
    } catch (error) {
      console.log('Lỗi khi lấy reviews của tour:', error);
      // Trả về một response trống nếu có lỗi
      return { success: true, data: [] };
    }
  },
  
  create: (reviewData: { tour: string; rating: number; title: string; text: string }, token: string) => {
    return fetchApi(API_ENDPOINTS.REVIEWS.BASE, 'POST', reviewData, token);
  },
  
  update: (id: string, reviewData: { rating?: number; title?: string; text?: string }, token: string) => {
    return fetchApi(API_ENDPOINTS.REVIEWS.DETAIL(id), 'PUT', reviewData, token);
  },
  
  delete: (id: string, token: string) => {
    return fetchApi(API_ENDPOINTS.REVIEWS.DETAIL(id), 'DELETE', undefined, token);
  },
  
  // Kiểm tra xem người dùng đã đánh giá tour chưa
  checkUserReviewForTour: async (tourId: string, token: string) => {
    try {
      const reviewsResponse = await fetchApi(`${API_ENDPOINTS.REVIEWS.BASE}?tour=${tourId}`, 'GET', undefined, token);
      
      if (reviewsResponse.success && reviewsResponse.data) {
        const reviews = Array.isArray(reviewsResponse.data) ? 
          reviewsResponse.data : 
          (reviewsResponse.data.reviews || []);
          
        // Nếu người dùng có ít nhất một đánh giá cho tour này
        if (reviews.length > 0) {
          return {
            success: true,
            hasReviewed: true,
            review: reviews[0] // Lấy đánh giá đầu tiên nếu có nhiều đánh giá
          };
        }
        
        return {
          success: true,
          hasReviewed: false
        };
      }
      
      return {
        success: false,
        hasReviewed: false,
        message: reviewsResponse.message || 'Không thể kiểm tra đánh giá'
      };
    } catch (error) {
      console.error('Lỗi khi kiểm tra đánh giá tour:', error);
      return {
        success: false,
        hasReviewed: false,
        message: 'Đã xảy ra lỗi khi kiểm tra đánh giá'
      };
    }
  }
};

/**
 * API Functions cho Hotels
 */
export const hotelsApi = {
  getAll: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.HOTELS.BASE}${queryString}`);
  },
  
  getById: (id: string) => {
    return fetchApi(API_ENDPOINTS.HOTELS.DETAIL(id));
  },
  
  searchHotels: (searchTerm: string, params?: Record<string, any>) => {
    const queryParams = { 
      keyword: searchTerm,
      ...params
    };
    const queryString = `?${new URLSearchParams(queryParams as any).toString()}`;
    return fetchApi(`${API_ENDPOINTS.HOTELS.SEARCH}${queryString}`);
  },

  getCategories: () => {
    return fetchApi(API_ENDPOINTS.HOTELS.CATEGORIES);
  },

  getHotelsByCategory: (category: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.HOTELS.CATEGORY(category)}${queryString}`);
  },

  getPopularCities: () => {
    return fetchApi(API_ENDPOINTS.HOTELS.POPULAR_CITIES);
  },

  getHotelsByCity: (city: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.HOTELS.CITY(city)}${queryString}`);
  },
  
  getFeaturedHotels: (params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.HOTELS.FEATURED}${queryString}`);
  },
  
  checkAvailability: async (hotelId: string, params?: Partial<CheckAvailabilityParams>) => {
    try {
      // Tạo request data chỉ với các thông tin cần thiết
      const requestData = {
        checkIn: params?.checkIn || new Date().toISOString().split('T')[0],
        checkOut: params?.checkOut || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guests: params?.guests || 2
      };

      console.log('Kiểm tra phòng khả dụng với thông số:', requestData);

      const response = await fetchApi(API_ENDPOINTS.HOTELS.CHECK_AVAILABILITY(hotelId), 'POST', requestData);
      return response.data;
    } catch (error: any) {
      console.error('Lỗi kiểm tra phòng khả dụng:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Lỗi khi kiểm tra phòng khả dụng',
          error: error.response.data
        };
      }
      
      return {
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
        error
      };
    }
  }
};

/**
 * API Functions cho Hotel Bookings
 */
export const hotelBookingsApi = {
  getAll: (token: string, params?: Record<string, any>) => {
    const queryString = params 
      ? `?${new URLSearchParams(params as any).toString()}` 
      : '';
    return fetchApi(`${API_ENDPOINTS.HOTEL_BOOKINGS.BASE}${queryString}`, 'GET', undefined, token);
  },
  
  getById: (id: string, token?: string) => {
    return fetchApi(API_ENDPOINTS.HOTEL_BOOKINGS.DETAIL(id), 'GET', undefined, token);
  },
  
  create: (bookingData: any, token: string) => {
    return fetchApi(API_ENDPOINTS.HOTEL_BOOKINGS.BASE, 'POST', bookingData, token);
  },
  
  getMyBookings: (token: string) => {
    try {
      console.log('Gọi API lấy danh sách đặt phòng khách sạn của tôi:', API_ENDPOINTS.HOTEL_BOOKINGS.GET_MY_BOOKINGS);
      return fetchApi(API_ENDPOINTS.HOTEL_BOOKINGS.GET_MY_BOOKINGS, 'GET', undefined, token);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách đặt phòng khách sạn:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách đặt phòng khách sạn',
        data: []
      };
    }
  },
  
  cancelBooking: (id: string, token: string) => {
    return fetchApi(`${API_ENDPOINTS.HOTEL_BOOKINGS.DETAIL(id)}/cancel`, 'PUT', undefined, token);
  },

  checkAvailability: (params: any) => {
    return fetchApi(API_ENDPOINTS.HOTEL_BOOKINGS.CHECK_AVAILABILITY, 'POST', params);
  }
}; 