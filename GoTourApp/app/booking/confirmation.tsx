import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Share
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { bookingsApi } from '@/lib/api';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function BookingConfirmationScreen() {
  const { bookingId, type } = useLocalSearchParams<{ bookingId: string, type: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookingData = async () => {
    setIsLoading(true);
    try {
      let response;
      
      if (type === 'flight') {
        response = await bookingsApi.getFlightBooking(bookingId);
      } else if (type === 'hotel') {
        response = await bookingsApi.getHotelBooking(bookingId);
      } else {
        response = await bookingsApi.getTourBooking(bookingId);
      }

      if (response.success) {
        setBooking(response.data);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể lấy thông tin đặt chỗ');
        setError(response.message || 'Không thể lấy thông tin đặt chỗ');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đặt chỗ:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin đặt chỗ');
      setError(error.message || 'Không thể lấy thông tin đặt chỗ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId && type) {
      fetchBookingData();
    } else {
      setIsLoading(false);
      setError('Thiếu thông tin đặt chỗ');
    }
  }, [bookingId, type]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: vi });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: vi });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm - dd/MM/yyyy', { locale: vi });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'cancelled': return '#f44336';
      default: return '#ff9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'pending': return 'Đang chờ xác nhận';
      case 'cancelled': return 'Đã hủy';
      default: return 'Đang chờ xác nhận';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Đã thanh toán';
      case 'pending': return 'Chờ thanh toán';
      case 'failed': return 'Thanh toán thất bại';
      default: return 'Chờ thanh toán';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'failed': return '#f44336';
      default: return '#ff9800';
    }
  };

  const handleShare = async () => {
    if (!booking) return;

    try {
      const bookingType = type === 'flight' ? 'vé máy bay' : 
                          type === 'hotel' ? 'phòng khách sạn' : 'tour';
      
      const title = type === 'flight' 
        ? `${booking.flight.departureCity} - ${booking.flight.arrivalCity}`
        : type === 'hotel' 
          ? booking.hotel.name
          : booking.tour.name;
      
      const message = `Tôi đã đặt ${bookingType} "${title}" trên GoTour App! Mã đặt chỗ: ${booking.bookingNumber || booking.bookingReference}`;
      
      await Share.share({
        message: message,
        title: 'Chia sẻ thông tin đặt chỗ'
      });
    } catch (error) {
      console.error('Lỗi khi chia sẻ:', error);
      Alert.alert('Không thể chia sẻ', 'Đã xảy ra lỗi khi chia sẻ thông tin đặt chỗ.');
    }
  };

  const renderFlightBooking = () => {
    if (!booking || !booking.flight) return null;

    return (
      <>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin chuyến bay
            </Text>
          </View>

          <View style={styles.flightDetails}>
            <View style={styles.airline}>
              <Text style={[styles.airlineName, { color: colors.text }]}>
                {booking.flight.airline}
              </Text>
              <Text style={[styles.flightNumber, { color: colors.tabIconDefault }]}>
                {booking.flight.flightNumber}
              </Text>
            </View>
            
            <View style={styles.route}>
              <View style={styles.locationTime}>
                <Text style={[styles.city, { color: colors.text }]}>
                  {booking.flight.departureCity}
                </Text>
                <Text style={[styles.time, { color: colors.text }]}>
                  {formatTime(booking.flight.departureTime)}
                </Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>
                  {formatDate(booking.flight.departureTime)}
                </Text>
              </View>

              <View style={styles.flightPath}>
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                <View style={[styles.line, { backgroundColor: colors.tabIconDefault }]} />
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
              </View>

              <View style={styles.locationTime}>
                <Text style={[styles.city, { color: colors.text }]}>
                  {booking.flight.arrivalCity}
                </Text>
                <Text style={[styles.time, { color: colors.text }]}>
                  {formatTime(booking.flight.arrivalTime)}
                </Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>
                  {formatDate(booking.flight.arrivalTime)}
                </Text>
              </View>
            </View>

            <View style={styles.flightInfo}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                  Hạng ghế
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {booking.class === 'economy' ? 'Phổ thông' : 
                   booking.class === 'business' ? 'Thương gia' : 'Hạng nhất'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                  Số hành khách
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {Array.isArray(booking.passengers) ? booking.passengers.length : booking.passengers || 0} người
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin hành khách
            </Text>
          </View>

          <View style={styles.contactInfo}>
            {Array.isArray(booking.passengers) ? (
              booking.passengers.map((passenger, index) => (
                <View key={index} style={styles.passengerItem}>
                  <Text style={[styles.passengerTitle, { color: colors.text }]}>
                    Hành khách {index + 1}:
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                      Họ tên
                    </Text>
                    <Text style={[styles.contactValue, { color: colors.text }]}>
                      {passenger.name || 'Không có thông tin'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                      Hạng ghế
                    </Text>
                    <Text style={[styles.contactValue, { color: colors.text }]}>
                      {passenger.seatClass === 'economy' ? 'Phổ thông' : 
                       passenger.seatClass === 'business' ? 'Thương gia' : 'Hạng nhất'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                      CCCD/CMND
                    </Text>
                    <Text style={[styles.contactValue, { color: colors.text }]}>
                      {passenger.idNumber || 'Không có thông tin'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.text, padding: 16 }}>Không có thông tin hành khách</Text>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin liên hệ
            </Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Họ tên
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.name || booking.contactInfo?.fullName || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Email
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.email || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Số điện thoại
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.phone || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                CCCD/CMND
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo.identification}
              </Text>
            </View>

            {booking.additionalRequests && (
              <View style={styles.infoRow}>
                <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                  Yêu cầu đặc biệt
                </Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>
                  {booking.additionalRequests}
                </Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  const renderTourBooking = () => {
    if (!booking || !booking.tour) return null;

    return (
      <>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin tour
            </Text>
          </View>

          <View style={styles.tourDetails}>
            <Image 
              source={{ uri: booking.tour.imageCover || booking.tour.coverImage || 'https://via.placeholder.com/400x200?text=No+Image' }} 
              style={styles.tourImage} 
              resizeMode="cover"
            />
            
            <Text style={[styles.tourName, { color: colors.text }]}>
              {booking.tour.name}
            </Text>
            
            <View style={styles.tourInfo}>
              <View style={styles.infoItem}>
                <IconSymbol name="calendar" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  {booking.startDate ? formatDate(booking.startDate) : 'Chưa chọn ngày'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <IconSymbol name="clock" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  {booking.tour.duration} ngày
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <IconSymbol name="users" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  {booking.participants || booking.numOfPeople || 1} người
                </Text>
              </View>
            </View>

            <View style={styles.tourLocation}>
              <IconSymbol name="map-pin" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {booking.tour.startLocation?.description || 'Không có thông tin địa điểm'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin khách hàng
            </Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Họ tên
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.name || booking.contactInfo?.fullName || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Email
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.email || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Số điện thoại
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.phone || 'Không có thông tin'}
              </Text>
            </View>

            {booking.specialRequests && (
              <View style={styles.infoRow}>
                <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                  Yêu cầu đặc biệt
                </Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>
                  {booking.specialRequests}
                </Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  const renderHotelBooking = () => {
    if (!booking || !booking.hotel) return null;

    return (
      <>
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin khách sạn
            </Text>
          </View>

          <View style={styles.tourDetails}>
            <Image 
              source={{ uri: booking.hotel.coverImage || 'https://via.placeholder.com/400x200?text=No+Image' }} 
              style={styles.tourImage} 
              resizeMode="cover"
            />
            
            <Text style={[styles.tourName, { color: colors.text }]}>
              {booking.hotel.name}
            </Text>
            
            <View style={styles.hotelAddress}>
              <IconSymbol name="map-pin" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.locationText, { color: colors.text }]}>
                {booking.hotel.address}, {booking.hotel.city}
              </Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.tourInfo}>
              <View style={styles.infoItem}>
                <IconSymbol name="calendar" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  Nhận phòng: {formatDate(booking.checkIn)}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <IconSymbol name="calendar" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  Trả phòng: {formatDate(booking.checkOut)}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <IconSymbol name="moon" size={16} color={colors.tabIconDefault} />
                <Text style={[styles.tourInfoText, { color: colors.text }]}>
                  {booking.nights} đêm
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin phòng
            </Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Loại phòng
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.room}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Số lượng phòng
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.roomCount} phòng
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Người lớn
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.guests?.adults || 1} người
              </Text>
            </View>

            {booking.guests?.children > 0 && (
              <View style={styles.infoRow}>
                <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                  Trẻ em
                </Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>
                  {booking.guests.children} người
                </Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Giá phòng
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {(booking.priceDetails?.roomPrice || 0).toLocaleString('vi-VN')}đ
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Thuế
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {(booking.priceDetails?.tax || 0).toLocaleString('vi-VN')}đ
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Phí dịch vụ
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {(booking.priceDetails?.serviceFee || 0).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Thông tin khách hàng
            </Text>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Họ tên
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.name || booking.contactInfo?.fullName || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Email
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.email || 'Không có thông tin'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                Số điện thoại
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {booking.contactInfo?.phone || 'Không có thông tin'}
              </Text>
            </View>

            {booking.specialRequests && (
              <View style={styles.infoRow}>
                <Text style={[styles.contactLabel, { color: colors.tabIconDefault }]}>
                  Yêu cầu đặc biệt
                </Text>
                <Text style={[styles.contactValue, { color: colors.text }]}>
                  {booking.specialRequests}
                </Text>
              </View>
            )}
          </View>
        </View>
      </>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy thông tin đặt chỗ</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.tint }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen 
        options={{
          title: 'Xác nhận đặt chỗ',
          headerShown: true,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconSymbol 
            name="check-circle" 
            size={64} 
            color="#4caf50"
            style={styles.successIcon}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {type === 'flight' ? 'Đặt vé thành công!' : 
             type === 'hotel' ? 'Đặt phòng thành công!' : 'Đặt tour thành công!'}
          </Text>
          <Text style={[styles.bookingNumber, { color: colors.tabIconDefault }]}>
            Mã đặt chỗ: {booking.bookingNumber || booking.bookingReference || 'N/A'}
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.tabIconDefault }]}>
              Trạng thái
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status || 'pending') + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(booking.status || 'pending') }]}>
                {getStatusText(booking.status || 'pending')}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.tabIconDefault }]}>
              Thanh toán
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(booking.paymentStatus || 'pending') + '20' }]}>
              <Text style={[styles.statusText, { color: getPaymentStatusColor(booking.paymentStatus || 'pending') }]}>
                {getPaymentStatusText(booking.paymentStatus || 'pending')}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.tabIconDefault }]}>
              Ngày đặt
            </Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>
              {booking.createdAt ? formatDateTime(booking.createdAt) : 'Không có thông tin'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.tabIconDefault }]}>
              Tổng tiền
            </Text>
            <Text style={[styles.priceValue, { color: colors.tint }]}>
              {(booking.totalPrice || booking.price || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {type === 'flight' ? renderFlightBooking() : 
         type === 'hotel' ? renderHotelBooking() : renderTourBooking()}

        <View style={styles.buttonContainer}>
          {booking.paymentStatus === 'pending' && (
            <Button 
              title="Thanh toán ngay"
              onPress={() => {
                // Navigating to payment screen would go here
                Alert.alert('Thông báo', 'Chức năng thanh toán sẽ sớm được cập nhật.');
              }}
              size="large"
              style={{ marginBottom: 12 }}
            />
          )}
          
          <Button 
            title="Chia sẻ"
            onPress={handleShare}
            size="large"
            variant="outlined"
            style={{ marginBottom: 12 }}
          />
          
          <Button 
            title="Về trang chủ"
            onPress={() => router.push('/')}
            size="large"
            variant="text"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 16,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  flightDetails: {
    padding: 16,
  },
  airline: {
    marginBottom: 16,
  },
  airlineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  flightNumber: {
    fontSize: 14,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTime: {
    flex: 1,
    alignItems: 'center',
  },
  city: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  time: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  flightPath: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    height: 1,
    marginHorizontal: 4,
  },
  flightInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactInfo: {
    padding: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  tourDetails: {
    padding: 16,
  },
  tourImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
  },
  tourName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tourInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tourInfoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  tourLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotelAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 8,
  },
  buttonContainer: {
    padding: 16,
    marginBottom: 24,
  },
  passengerItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 12,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 12,
  },
}); 