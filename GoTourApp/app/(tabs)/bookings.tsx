import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { bookingsApi, tourBookingsApi, hotelBookingsApi } from '@/lib/api';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FontAwesome5 } from '@expo/vector-icons';

// Đảm bảo mã hoạt động ngay cả khi không có hook useToast
const useSimpleToast = () => {
  const showToast = (message: string, type?: string) => {
    Alert.alert(type === 'error' ? 'Lỗi' : 'Thông báo', message);
  };
  return { showToast };
};

export default function BookingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token, isAuthenticated } = useAuth();
  const { showToast } = useSimpleToast();

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingType, setBookingType] = useState<'all' | 'tour' | 'flight' | 'hotel'>('all');
  const [flightBookings, setFlightBookings] = useState<any[]>([]);
  const [tourBookings, setTourBookings] = useState<any[]>([]);
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'tour' | 'flight' | 'hotel'>('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllBookings();
    }
  }, [isAuthenticated]);

  // Thêm useEffect để kiểm tra cấu trúc dữ liệu booking khi nó thay đổi
  useEffect(() => {
    if (tourBookings.length > 0) {
      console.log('===== KIỂM TRA CẤU TRÚC TOUR BOOKING =====');
      console.log('Tour booking đầu tiên:', JSON.stringify(tourBookings[0], null, 2));
    }
  }, [tourBookings]);

  const fetchAllBookings = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      // Tạo mảng promises để có thể bắt lỗi riêng cho từng request
      const flightPromise = bookingsApi.getMyBookings(token).catch(error => {
        console.error('Lỗi lấy danh sách vé máy bay:', error);
        return { success: false, data: [], message: 'Không thể lấy danh sách vé máy bay' };
      });
      
      const tourPromise = tourBookingsApi.getMyBookings(token).catch(error => {
        console.error('Lỗi lấy danh sách tour:', error);
        return { success: false, data: [], message: 'Không thể lấy danh sách tour' };
      });
      
      const hotelPromise = hotelBookingsApi.getMyBookings(token).catch(error => {
        console.error('Lỗi lấy danh sách đặt phòng:', error);
        return { success: false, data: [], message: 'Không thể lấy danh sách đặt phòng khách sạn' };
      });
      
      // Thực hiện đồng thời cả ba request với xử lý lỗi riêng biệt
      const [flightResponse, tourResponse, hotelResponse] = await Promise.all([
        flightPromise, tourPromise, hotelPromise
      ]);

      // Xử lý dữ liệu đặt vé máy bay
      if (flightResponse.success && flightResponse.data) {
        console.log('Flight bookings data:', flightResponse.data);
        setFlightBookings(flightResponse.data);
      } else {
        console.error('Lỗi lấy danh sách vé máy bay:', flightResponse.message);
        setFlightBookings([]);
      }

      // Xử lý dữ liệu đặt tour
      if (tourResponse.success && tourResponse.data) {
        console.log('Tour bookings data RAW:', tourResponse.data);
        
        // Kiểm tra cấu trúc dữ liệu và làm sạch
        const processedTourBookings = tourResponse.data.map(booking => {
          // Đảm bảo _id luôn tồn tại
          if (!booking._id && booking.id) {
            booking._id = booking.id;
          }
          
          // Đảm bảo booking có thông tin cơ bản
          if (!booking.totalPrice && booking.price) {
            booking.totalPrice = booking.price;
          }
          
          // Xác định tour ID nếu chưa có
          if (!booking.tourId && booking.tour && booking.tour._id) {
            booking.tourId = booking.tour._id;
          } else if (!booking.tourId && booking.tour && booking.tour.id) {
            booking.tourId = booking.tour.id;
          }
          
          return booking;
        });
        
        console.log('Tour bookings đã xử lý:', processedTourBookings);
        setTourBookings(processedTourBookings);
      } else {
        console.error('Lỗi lấy danh sách tour:', tourResponse.message);
        setTourBookings([]);
      }

      // Xử lý dữ liệu đặt phòng khách sạn - thử tối đa 2 lần nếu thất bại
      if (hotelResponse.success && hotelResponse.data) {
        console.log('Hotel bookings data:', hotelResponse.data);
        
        // Kiểm tra cấu trúc dữ liệu và làm sạch
        const processedHotelBookings = hotelResponse.data.map(booking => {
          // Đảm bảo _id luôn tồn tại
          if (!booking._id && booking.id) {
            booking._id = booking.id;
          }
          
          // Đảm bảo booking có thông tin cơ bản
          if (!booking.totalPrice && booking.price) {
            booking.totalPrice = booking.price;
          }
          
          return booking;
        });
        
        setHotelBookings(processedHotelBookings);
      } else {
        console.error('Lỗi lấy danh sách đặt phòng khách sạn:', hotelResponse.message);
        
        // Thử lại một lần nữa nếu lỗi
        try {
          console.log('Thử lại lấy danh sách đặt phòng khách sạn...');
          const retryResponse = await hotelBookingsApi.getMyBookings(token);
          
          if (retryResponse.success && retryResponse.data) {
            console.log('Thử lại thành công, hotel bookings data:', retryResponse.data);
            setHotelBookings(retryResponse.data);
          } else {
            console.error('Vẫn lỗi sau khi thử lại:', retryResponse.message);
            setHotelBookings([]);
          }
        } catch (retryError) {
          console.error('Lỗi khi thử lại:', retryError);
          setHotelBookings([]);
        }
      }
    } catch (error) {
      console.error('Lỗi chung khi lấy danh sách đặt chỗ:', error);
      // Đặt tất cả danh sách thành mảng rỗng trong trường hợp lỗi
      setFlightBookings([]);
      setTourBookings([]);
      setHotelBookings([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllBookings();
  };

  const handleCancelBooking = async (bookingId: string, type: 'tour' | 'flight' | 'hotel') => {
    if (!token) return;

    Alert.alert(
      'Xác nhận hủy',
      `Bạn có chắc chắn muốn hủy ${
        type === 'tour' ? 'tour' : 
        type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
      } đã đặt này không?`,
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: `Có, hủy ${
            type === 'tour' ? 'tour' : 
            type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
          }`,
          style: 'destructive',
          onPress: async () => {
            try {
              let response;
              if (type === 'tour') {
                response = await bookingsApi.cancelTourBooking(bookingId, token);
              } else if (type === 'flight') {
                response = await bookingsApi.cancelBooking(bookingId, token);
              } else {
                response = await hotelBookingsApi.cancelBooking(bookingId, token);
              }
              
              if (response.success) {
                Alert.alert('Thành công', `Hủy ${
                  type === 'tour' ? 'tour' : 
                  type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
                } thành công`);
                fetchAllBookings(); // Tải lại danh sách
              } else {
                Alert.alert('Lỗi', response.message || `Không thể hủy ${
                  type === 'tour' ? 'tour' : 
                  type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
                }`);
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Lỗi', `Đã xảy ra lỗi khi hủy ${
                type === 'tour' ? 'tour' : 
                type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
              }`);
            }
          },
        },
      ]
    );
  };

  // Hàm lấy màu dựa trên trạng thái đặt chỗ
  const getStatusColor = (status: string) => {
    status = status?.toLowerCase() || '';
    
    switch (status) {
      case 'confirmed':
      case 'xác nhận':
      case 'đã xác nhận':
        return '#4CAF50'; // Xanh lá
      case 'pending':
      case 'chờ xác nhận':
        return '#FF9800'; // Cam
      case 'cancelled':
      case 'hủy':
      case 'đã hủy':
        return '#F44336'; // Đỏ
      case 'completed':
      case 'hoàn thành':
      case 'đã hoàn thành':
        return '#2196F3'; // Xanh dương
      case 'failed':
      case 'thất bại':
        return '#9E9E9E'; // Xám
      default:
        return '#9E9E9E'; // Xám cho trạng thái không xác định
    }
  };

  // Hàm lấy text hiển thị cho trạng thái
  const getStatusText = (status: string) => {
    status = status?.toLowerCase() || '';
    
    switch (status) {
      case 'confirmed':
      case 'xác nhận':
      case 'đã xác nhận':
        return 'Đã xác nhận';
      case 'pending':
      case 'chờ xác nhận':
        return 'Chờ xác nhận';
      case 'cancelled':
      case 'hủy':
      case 'đã hủy':
        return 'Đã hủy';
      case 'completed':
      case 'hoàn thành':
      case 'đã hoàn thành':
        return 'Đã hoàn thành';
      case 'failed':
      case 'thất bại':
        return 'Thất bại';
      default:
        return 'Không xác định';
    }
  };

  const renderTourBookingItem = ({ item: booking }: { item: any }) => {
    console.log("Dữ liệu tour booking:", JSON.stringify(booking, null, 2));
    
    // Trích xuất dữ liệu tour từ booking
    const tour = booking.tour || {};
    
    // Lấy tên tour
    const tourName = tour.name || booking.tourName || booking.title || "Tour không xác định";
    
    // Lấy ID tour
    const tourId = tour._id || booking.tourId || "";
    
    // Xử lý ảnh tour
    let tourImage = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2074&auto=format&fit=crop";
    
    // Tìm ảnh theo thứ tự ưu tiên
    if (tour.images && tour.images.length > 0) {
      tourImage = tour.images[0];
    } else if (tour.coverImage) {
      tourImage = tour.coverImage;
    } else if (booking.tourImage) {
      tourImage = booking.tourImage;
    } else if (tour.image) {
      tourImage = tour.image;
    }
    
    // Xử lý ngày tháng một cách an toàn
    let startDate = "N/A";
    let endDate = "N/A";
    
    try {
      // Kiểm tra booking.startDate
      if (booking.startDate) {
        startDate = format(new Date(booking.startDate), 'dd/MM/yyyy', { locale: vi });
      }
      // Kiểm tra booking.endDate
      if (booking.endDate) {
        endDate = format(new Date(booking.endDate), 'dd/MM/yyyy', { locale: vi });
      }
      // Kiểm tra tour.startDate nếu booking.startDate không tồn tại
      else if (tour.startDate) {
        startDate = format(new Date(tour.startDate), 'dd/MM/yyyy', { locale: vi });
      }
      // Kiểm tra tour.endDate nếu booking.endDate không tồn tại
      else if (tour.endDate) {
        endDate = format(new Date(tour.endDate), 'dd/MM/yyyy', { locale: vi });
      }
    } catch (error) {
      console.error("Lỗi khi xử lý ngày tháng cho tour:", error);
    }
    
    // Lấy trạng thái đặt tour
    const status = booking.status || "pending";
    
    // Xử lý giá tiền
    const totalPrice = booking.totalPrice || booking.price || tour.price || 0;
    const formattedPrice = totalPrice.toLocaleString('vi-VN') + 'đ';
    
    // Trích xuất thông tin địa điểm tour
    const destination = tour.destination || booking.destination || "Địa điểm không xác định";
    
    // Lấy số lượng người
    const adultCount = booking.adultsCount || booking.adults || 1;
    const childrenCount = booking.childrenCount || booking.children || 0;
    
    return (
      <View style={styles.bookingItem}>
        <Image
          source={{ uri: tourImage }}
          style={styles.bookingThumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="map-outline" size={12} color="white" />
            <Text style={styles.bookingTypeText}>Tour</Text>
          </View>
          
          <Text style={styles.tourName} numberOfLines={2}>{tourName}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={[styles.statusText, { color: 'white' }]}>{getStatusText(status)}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="location-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText} numberOfLines={1}>
              {destination}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {startDate} - {endDate}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {adultCount} người lớn {childrenCount > 0 ? ` & ${childrenCount} trẻ em` : ''}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {formattedPrice}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          <TouchableOpacity 
            style={[styles.viewDetailsButton, { borderColor: '#4CAF50' }]}
            onPress={() => tourId ? router.push(`/tour/${tourId}`) : showToast('Không tìm thấy thông tin tour', 'error')}
          >
            <Text style={[styles.viewDetailsText, { color: '#4CAF50' }]}>Chi tiết tour</Text>
          </TouchableOpacity>
          
          {status !== 'cancelled' && status !== 'completed' && (
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: '#F44336' }]}
              onPress={() => handleCancelBooking(booking._id, 'tour')}
            >
              <Text style={[styles.cancelText, { color: '#F44336' }]}>Hủy đặt tour</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFlightBookingItem = (booking: any) => {
    const statusColor = getStatusColor(booking.status);
    
    // Trích xuất đúng dữ liệu chuyến bay
    const flight = booking.flight || {};
    const flightId = flight._id || booking.flightId || '';
    
    const departureCity = flight.departureCity || 'N/A';
    const arrivalCity = flight.arrivalCity || 'N/A';
    const flightTitle = `${departureCity} - ${arrivalCity}`;
    
    // Xử lý đúng ngày giờ
    let departureTime = null;
    try {
      departureTime = flight.departureTime ? new Date(flight.departureTime) : null;
    } catch (e) {
      console.error('Lỗi chuyển đổi ngày bay:', e);
    }
    
    const formattedDepartureTime = departureTime
      ? format(departureTime, 'HH:mm - dd/MM/yyyy', { locale: vi })
      : 'N/A';
      
    const isPastDate = departureTime ? departureTime.getTime() < new Date().getTime() : false;
    const canCancel = booking.status !== 'cancelled' && !isPastDate;
    
    // Xử lý số lượng hành khách và giá tiền
    const passengers = booking.passengers?.length || booking.numOfPassengers || 1;
    const totalPrice = booking.totalPrice || 0;
    const formattedPrice = totalPrice.toLocaleString('vi-VN') + 'đ';
    
    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        {flight.image && (
          <Image
            source={{ uri: flight.image }}
            style={styles.bookingThumbnail}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: '#1976D2' }]}>
            <Ionicons name="airplane-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Vé máy bay</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]} numberOfLines={2}>
            {flightTitle !== 'N/A - N/A' ? flightTitle : 'Chuyến bay không xác định'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          {departureTime && (
            <View style={styles.bookingDetailItem}>
              <Ionicons name="time-outline" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.bookingDetailText, { color: colors.text }]}>
                {formattedDepartureTime}
              </Text>
            </View>
          )}
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {passengers} hành khách
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {formattedPrice}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          <TouchableOpacity
            style={[styles.viewDetailsButton, { borderColor: colors.tint }]}
            onPress={() => flightId ? router.push(`/flight/${flightId}`) : showToast('Không tìm thấy thông tin chuyến bay', 'error')}
          >
            <Text style={[styles.viewDetailsText, { color: colors.tint }]}>
              Chi tiết chuyến bay
            </Text>
          </TouchableOpacity>
          
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={() => handleCancelBooking(booking._id, 'flight')}
            >
              <Text style={[styles.cancelText, { color: colors.error }]}>
                Hủy vé
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Thêm debug log cho dữ liệu booking
  useEffect(() => {
    if (hotelBookings.length > 0) {
      console.log('===== Hotel Booking Data (First Item) =====');
      console.log('Hotel:', hotelBookings[0].hotel);
      console.log('Room:', hotelBookings[0].room);
      console.log('Dates:', {
        checkIn: hotelBookings[0].checkIn,
        checkOut: hotelBookings[0].checkOut
      });
      console.log('Status:', hotelBookings[0].status);
      console.log('Price:', hotelBookings[0].totalPrice);
    }
    if (tourBookings.length > 0) {
      console.log('===== Tour Booking Data (First Item) =====');
      console.log('Tour:', tourBookings[0].tour);
      console.log('Dates:', {
        startDate: tourBookings[0].startDate,
        endDate: tourBookings[0].endDate
      });
      console.log('Status:', tourBookings[0].status);
      console.log('Price:', tourBookings[0].totalPrice);
    }
    if (flightBookings.length > 0) {
      console.log('===== Flight Booking Data (First Item) =====');
      console.log('Flight:', flightBookings[0].flight);
      console.log('Dates:', {
        departureDate: flightBookings[0].departureDate,
        returnDate: flightBookings[0].returnDate
      });
      console.log('Status:', flightBookings[0].status);
      console.log('Price:', flightBookings[0].totalPrice);
    }
  }, [hotelBookings, tourBookings, flightBookings]);

  const renderHotelBookingItem = (booking: any) => {
    console.log('Đang render hotel booking:', booking);
    
    // Xử lý dữ liệu hotel
    const hotel = booking.hotel || {};
    const hotelName = hotel.name || booking.hotelName || 'Khách sạn không xác định';
    const hotelId = hotel._id || booking.hotelId || '';
    
    // Xử lý ảnh
    const hotelImage = hotel.coverImage || 
                      (hotel.images && hotel.images.length > 0 ? hotel.images[0] : null) || 
                      hotel.image || 
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop';
    
    // Xử lý thông tin phòng
    const roomName = typeof booking.room === 'string' 
                    ? booking.room 
                    : (booking.room?.name || 'Phòng tiêu chuẩn');
    const roomCount = booking.roomCount || 1;
    
    // Xử lý ngày check-in/check-out
    let checkInDate = null;
    let checkOutDate = null;
    
    try {
      checkInDate = booking.checkIn ? new Date(booking.checkIn) : null;
      checkOutDate = booking.checkOut ? new Date(booking.checkOut) : null;
    } catch (e) {
      console.error('Lỗi khi xử lý ngày tháng:', e);
    }
    
    // Tính số đêm
    let nights = 0;
    if (checkInDate && checkOutDate) {
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    
    // Format ngày
    const formattedCheckIn = checkInDate 
      ? format(checkInDate, 'dd/MM/yyyy', { locale: vi })
      : 'N/A';
    const formattedCheckOut = checkOutDate
      ? format(checkOutDate, 'dd/MM/yyyy', { locale: vi })
      : 'N/A';
    
    // Xử lý số lượng khách
    const guestCount = booking.guests?.adults || booking.numOfAdults || 1;
    const childrenCount = booking.guests?.children || booking.numOfChildren || 0;
    const totalGuests = guestCount + childrenCount;
    
    // Kiểm tra ngày quá khứ
    const isPastDate = checkOutDate ? checkOutDate < new Date() : false;
    
    // Kiểm tra trạng thái đặt phòng
    const status = booking.status || 'pending';
    const isCancellable = !isPastDate && status !== 'cancelled' && status !== 'completed';
    
    // Xử lý giá tiền
    const totalPrice = booking.totalPrice || 0;
    const formattedPrice = totalPrice.toLocaleString('vi-VN') + 'đ';

    return (
      <View style={styles.bookingItem}>
        <Image 
          source={{ uri: hotelImage }} 
          style={styles.bookingThumbnail}
          resizeMode="cover"
        />
        
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="bed-outline" size={12} color="white" />
            <Text style={styles.bookingTypeText}>Khách sạn</Text>
          </View>
          
          <Text style={styles.tourName} numberOfLines={2}>{hotelName}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={[styles.statusText, { color: 'white' }]}>{getStatusText(status)}</Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="home-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText} numberOfLines={1}>
              {roomName} • {roomCount} phòng • {nights} đêm
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {formattedCheckIn} - {formattedCheckOut}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {totalGuests} khách{childrenCount > 0 ? ` (${childrenCount} trẻ em)` : ''}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color="#555" />
            <Text style={styles.bookingDetailText}>
              {formattedPrice}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          <TouchableOpacity 
            style={[styles.viewDetailsButton, { borderColor: '#2196F3' }]}
            onPress={() => hotelId ? router.push(`/hotel/${hotelId}`) : showToast('Không tìm thấy thông tin khách sạn', 'error')}
          >
            <Text style={[styles.viewDetailsText, { color: '#2196F3' }]}>Chi tiết khách sạn</Text>
          </TouchableOpacity>
          
          {isCancellable && (
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: '#F44336' }]}
              onPress={() => handleCancelBooking(booking._id, 'hotel')}
            >
              <Text style={[styles.cancelText, { color: '#F44336' }]}>Hủy đặt phòng</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen
          options={{
            title: "Đặt chỗ của tôi",
            headerShown: true,
          }}
        />
        <View style={styles.notLoggedInContainer}>
          <Text style={[styles.notLoggedInText, { color: colors.text }]}>
            Bạn cần đăng nhập để xem lịch sử đặt chỗ
          </Text>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.authButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Lọc bookings theo loại được chọn
  const filteredBookings = useMemo(() => {
    // Sắp xếp bookings theo thời gian tạo mới nhất
    const sortBookings = (bookings: any[]) => {
      return [...bookings].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    };

    switch (activeTab) {
      case 'tour':
        return sortBookings(tourBookings.filter(booking => booking && (booking._id || booking.id)));
      case 'flight':
        return sortBookings(flightBookings.filter(booking => booking && (booking._id || booking.id)));
      case 'hotel':
        return sortBookings(hotelBookings.filter(booking => booking && (booking._id || booking.id)));
      default:
        // Kết hợp tất cả loại booking
        const allBookings = [
          ...tourBookings.filter(booking => booking && (booking._id || booking.id)),
          ...flightBookings.filter(booking => booking && (booking._id || booking.id)),
          ...hotelBookings.filter(booking => booking && (booking._id || booking.id))
        ];
        return sortBookings(allBookings);
    }
  }, [activeTab, tourBookings, flightBookings, hotelBookings]);

  // Hàm render booking item dựa vào loại
  const renderBookingItem = ({ item }: { item: any }) => {
    console.log('Đang render item:', item._id || item.id, 'loại:', 
                item.tour ? 'tour' : (item.flight ? 'flight' : 'hotel'));
    
    // Xác định loại booking để render đúng component
    if (item.tour || item.tourId) {
      return renderTourBookingItem({ item });
    } else if (item.flight || item.flightId) {
      return renderFlightBookingItem(item);
    } else {
      return renderHotelBookingItem(item);
    }
  };

  // Hàm hiển thị các nút filter loại booking
  const renderFilters = () => {
    const filters = [
      { id: 'all', label: 'Tất cả' },
      { id: 'tour', label: 'Tour' },
      { id: 'flight', label: 'Vé máy bay' },
      { id: 'hotel', label: 'Khách sạn' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              bookingType === filter.id && styles.activeFilterButton
            ]}
            onPress={() => setBookingType(filter.id as any)}
          >
            <Text
              style={[
                styles.filterText,
                bookingType === filter.id && styles.activeFilterText
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Đếm số lượng booking theo loại
  const getBookingCount = (type: string): number => {
    switch (type) {
      case 'tour':
        return tourBookings.length;
      case 'flight':
        return flightBookings.length;
      case 'hotel':
        return hotelBookings.length;
      default:
        return tourBookings.length + flightBookings.length + hotelBookings.length;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          title: "Đặt chỗ của tôi",
          headerShown: true,
        }}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            style={[styles.filterButton, activeTab === 'all' && styles.activeFilterButton]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.filterText, activeTab === 'all' && styles.activeFilterText]}>Tất cả</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, activeTab === 'tour' && styles.activeFilterButton]}
            onPress={() => setActiveTab('tour')}
          >
            <Text style={[styles.filterText, activeTab === 'tour' && styles.activeFilterText]}>Tour</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, activeTab === 'flight' && styles.activeFilterButton]}
            onPress={() => setActiveTab('flight')}
          >
            <Text style={[styles.filterText, activeTab === 'flight' && styles.activeFilterText]}>Vé máy bay</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, activeTab === 'hotel' && styles.activeFilterButton]}
            onPress={() => setActiveTab('hotel')}
          >
            <Text style={[styles.filterText, activeTab === 'hotel' && styles.activeFilterText]}>Khách sạn</Text>
          </Pressable>
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2089dc" />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item._id || item.id || `booking-${Math.random()}`}
          renderItem={renderBookingItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có đặt chỗ nào</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bookingTypeFilter: {
    flexDirection: 'row',
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTypeFilterButton: {
    backgroundColor: '#1976D2',
  },
  typeFilterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bookingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  bookingThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#E0E0E0',
  },
  bookingHeaderWithBadge: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  bookingTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  bookingTypeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  tourName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  viewDetailsButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  authButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bookingsList: {
    padding: 16,
    paddingTop: 8,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    color: '#0066CC',
  },
  bookingContent: {
    flexDirection: 'row',
    padding: 12,
  },
  bookingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  bookingDestination: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  bookingTravelers: {
    fontSize: 13,
    color: '#666',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  viewDetailButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0066CC',
    borderRadius: 16,
  },
  viewDetailText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    minWidth: 70,
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#0066CC',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  bookingCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  bookingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusContainer: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  filterScroll: {
    paddingHorizontal: 8,
  },
  loader: {
    marginTop: 20,
  },
  listContent: {
    padding: 16,
  },
}); 