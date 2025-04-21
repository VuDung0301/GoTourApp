import React, { useState, useEffect } from 'react';
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

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings'>('profile');
  const [bookingType, setBookingType] = useState<'all' | 'tour' | 'flight' | 'hotel'>('all');
  const [flightBookings, setFlightBookings] = useState<any[]>([]);
  const [tourBookings, setTourBookings] = useState<any[]>([]);
  const [hotelBookings, setHotelBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'bookings') {
      fetchAllBookings();
    }
  }, [isAuthenticated, activeTab]);

  const fetchAllBookings = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [flightResponse, tourResponse, hotelResponse] = await Promise.all([
        bookingsApi.getMyBookings(token).catch(e => ({ success: false, data: [], message: e.message })),
        tourBookingsApi.getMyBookings(token).catch(e => ({ success: false, data: [], message: e.message })),
        hotelBookingsApi.getMyBookings(token).catch(e => ({ success: false, data: [], message: e.message }))
      ]);

      setFlightBookings(flightResponse.success ? flightResponse.data : []);
      setTourBookings(tourResponse.success ? tourResponse.data : []);
      setHotelBookings(hotelResponse.success ? hotelResponse.data : []);

    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setFlightBookings([]);
      setTourBookings([]);
      setHotelBookings([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'bookings') {
      setRefreshing(true);
      fetchAllBookings();
    }
    // Không cần làm gì nếu đang ở tab profile
  };


  const handleCancelBooking = async (bookingId: string, type: 'tour' | 'flight' | 'hotel') => {
    if (!token) return;
    Alert.alert(
      'Xác nhận hủy',
      `Bạn có chắc chắn muốn hủy ${type === 'tour' ? 'tour' :
        type === 'flight' ? 'vé máy bay' : 'đặt phòng khách sạn'
      } đã đặt này không?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: `Có, hủy`,
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
                Alert.alert('Thành công', `Hủy đặt chỗ thành công`);
                fetchAllBookings(); // Tải lại danh sách
              } else {
                Alert.alert('Lỗi', response.message || `Không thể hủy đặt chỗ`);
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Lỗi', `Đã xảy ra lỗi khi hủy đặt chỗ`);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive', // Thêm style destructive
        onPress: async () => {
          await logout();
          // Sử dụng replace để không thể quay lại màn hình Account sau khi logout
          router.replace('/');
        },
      },
    ]);
  };

  // *** GIAO DIỆN TAB HỒ SƠ ĐÃ THIẾT KẾ LẠI ***
  const renderProfileTab = () => {
    if (!isAuthenticated) {
      return (
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.notLoggedInText, { color: colors.text }]}>
            Đăng nhập để quản lý tài khoản
          </Text>
          <View style={styles.authButtonsContainer}>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.authButtonText}>Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.secondaryTint }]}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.authButtonText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Render khi đã đăng nhập
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Phần Header Profile */}
        <View style={[styles.profileHeaderContainer, { backgroundColor: colors.tint + '15' }]}>
          <View style={styles.profileAvatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
            ) : (
              <View style={[styles.profileAvatarPlaceholder, { backgroundColor: colors.tint }]}>
                <Text style={styles.profileAvatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.tabIconDefault }]}>{user?.email}</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={[styles.editProfileText, { color: colors.tint }]}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>

        {/* Phần Các Lựa Chọn */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="person-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Đổi mật khẩu</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Thông báo</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Bảo mật</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="language-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Ngôn ngữ</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="help-circle-outline" size={22} color={colors.tabIconDefault} style={styles.optionIcon} />
            <Text style={[styles.optionText, { color: colors.text }]}>Trợ giúp & Hỗ trợ</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.tabIconDefault} />
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error + '1A' }]} // Màu nền nhẹ hơn
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} style={styles.optionIcon} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };


  // --- Phần renderBookingTab và các hàm liên quan giữ nguyên ---
  const renderBookingTab = () => {
    if (!isAuthenticated) {
      return (
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
      );
    }
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }
    // Lọc booking theo loại đã chọn
    const filteredBookings = (() => {
      const all = [
        ...tourBookings.map(booking => ({ ...booking, type: 'tour' })),
        ...flightBookings.map(booking => ({ ...booking, type: 'flight' })),
        ...hotelBookings.map(booking => ({ ...booking, type: 'hotel' }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sắp xếp mới nhất trước

      if (bookingType === 'tour') return all.filter(b => b.type === 'tour');
      if (bookingType === 'flight') return all.filter(b => b.type === 'flight');
      if (bookingType === 'hotel') return all.filter(b => b.type === 'hotel');
      return all;
    })();

    if (filteredBookings.length === 0 && !isLoading) { // Thêm điều kiện !isLoading
      return (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
        >
          <Ionicons name="calendar-outline" size={64} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {bookingType === 'all'
              ? 'Bạn chưa đặt tour, vé máy bay hoặc khách sạn nào'
              : bookingType === 'tour'
                ? 'Bạn chưa đặt tour nào'
                : bookingType === 'flight'
                  ? 'Bạn chưa đặt vé máy bay nào'
                  : 'Bạn chưa đặt phòng khách sạn nào'}
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.browseButtonText}>
              {bookingType === 'flight'
                ? 'Tìm chuyến bay'
                : bookingType === 'hotel'
                  ? 'Tìm khách sạn'
                  : 'Khám phá tour'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return (
      <>
        <View style={styles.bookingTypeFilter}>
          <TouchableOpacity
            style={[
              styles.typeFilterButton,
              bookingType === 'all' && [
                styles.activeTypeFilterButton,
                { backgroundColor: colors.tint + '20' },
              ],
            ]}
            onPress={() => setBookingType('all')}
          >
            <Text
              style={[
                styles.typeFilterText,
                { color: bookingType === 'all' ? colors.tint : colors.tabIconDefault },
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterButton,
              bookingType === 'tour' && [
                styles.activeTypeFilterButton,
                { backgroundColor: colors.tint + '20' },
              ],
            ]}
            onPress={() => setBookingType('tour')}
          >
            <Text
              style={[
                styles.typeFilterText,
                { color: bookingType === 'tour' ? colors.tint : colors.tabIconDefault },
              ]}
            >
              Tour
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterButton,
              bookingType === 'flight' && [
                styles.activeTypeFilterButton,
                { backgroundColor: colors.tint + '20' },
              ],
            ]}
            onPress={() => setBookingType('flight')}
          >
            <Text
              style={[
                styles.typeFilterText,
                { color: bookingType === 'flight' ? colors.tint : colors.tabIconDefault },
              ]}
            >
              Vé máy bay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeFilterButton,
              bookingType === 'hotel' && [
                styles.activeTypeFilterButton,
                { backgroundColor: colors.tint + '20' },
              ],
            ]}
            onPress={() => setBookingType('hotel')}
          >
            <Text
              style={[
                styles.typeFilterText,
                { color: bookingType === 'hotel' ? colors.tint : colors.tabIconDefault },
              ]}
            >
              Khách sạn
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => `${item.type || 'unknown'}-${item._id}`}
          renderItem={({ item }) =>
            item.type === 'flight'
              ? renderFlightBookingItem(item)
              : item.type === 'hotel'
                ? renderHotelBookingItem(item)
                : renderTourBookingItem(item)
          }
          contentContainerStyle={styles.bookingsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
        />
      </>
    );
  };
  const getStatusColor = (status: string) => {
    status = status?.toLowerCase() || 'pending'; // Mặc định là pending nếu không có status
    switch (status) {
      case 'confirmed': return '#4CAF50'; // green
      case 'pending': return '#FF9800'; // orange
      case 'cancelled': return '#F44336'; // red
      case 'completed': return '#2196F3'; // blue
      default: return colors.tabIconDefault;
    }
  };
  const getStatusText = (status: string) => {
    status = status?.toLowerCase() || 'pending';
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'pending': return 'Đang chờ';
      case 'cancelled': return 'Đã hủy';
      case 'completed': return 'Hoàn thành';
      default: return 'Không xác định';
    }
  };
  const renderTourBookingItem = (booking: any) => {
    const statusColor = getStatusColor(booking.status);
    const startDate = booking.startDate ? new Date(booking.startDate) : null;
    const isPastDate = startDate ? startDate.getTime() < new Date().getTime() : false;
    const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && !isPastDate;

    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: CategoryColors.tour }]}>
            <Ionicons name="map-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Tour</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]} numberOfLines={1}>
            {booking.tour?.name || 'Tour không xác định'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {startDate ? format(startDate, 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
            </Text>
          </View>

          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {booking.participants || booking.numOfPeople || 1} người
            </Text>
          </View>

          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text, fontWeight: 'bold' }]}>
              {(booking.price || booking.totalPrice || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <TouchableOpacity
            style={[styles.viewDetailsButton, { borderColor: colors.tint }]}
            onPress={() => router.push(`/tour/${booking.tour?._id}`)}
          >
            <Text style={[styles.viewDetailsText, { color: colors.tint }]}>
              Chi tiết tour
            </Text>
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={() => handleCancelBooking(booking._id, 'tour')}
            >
              <Text style={[styles.cancelText, { color: colors.error }]}>
                Hủy tour
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  const renderFlightBookingItem = (booking: any) => {
    const statusColor = getStatusColor(booking.status);
    const departureTime = booking.flight?.departureTime ? new Date(booking.flight.departureTime) : null;
    const isPastDate = departureTime ? departureTime.getTime() < new Date().getTime() : false;
    const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && !isPastDate;

    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: CategoryColors.flight }]}>
            <Ionicons name="airplane-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Vé máy bay</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]} numberOfLines={1}>
            {booking.flight ?
              `${booking.flight.departureCity} - ${booking.flight.arrivalCity}` :
              'Chuyến bay không xác định'}
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
                {format(departureTime, 'HH:mm - dd/MM/yyyy', { locale: vi })}
              </Text>
            </View>
          )}

          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {booking.passengers?.length || 1} hành khách
            </Text>
          </View>

          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text, fontWeight: 'bold' }]}>
              {(booking.totalPrice || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <TouchableOpacity
            style={[styles.viewDetailsButton, { borderColor: colors.tint }]}
            onPress={() => router.push({ pathname: '/booking/confirmation', params: { bookingId: booking._id, type: 'flight' } })}
          >
            <Text style={[styles.viewDetailsText, { color: colors.tint }]}>
              Chi tiết vé
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
  const renderHotelBookingItem = (booking: any) => {
    const statusColor = getStatusColor(booking.status);
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : null;
    const checkOutDate = booking.checkOut ? new Date(booking.checkOut) : null;
    const isPastDate = checkOutDate ? checkOutDate.getTime() < new Date().getTime() : false;
    const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && !isPastDate;

    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: CategoryColors.hotel }]}>
            <Ionicons name="bed-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Khách sạn</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]} numberOfLines={1}>
            {booking.hotel?.name || 'Khách sạn không xác định'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          {checkInDate && checkOutDate && (
            <View style={styles.bookingDetailItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.bookingDetailText, { color: colors.text }]}>
                {`${format(checkInDate, 'dd/MM/yyyy', { locale: vi })} - ${format(checkOutDate, 'dd/MM/yyyy', { locale: vi })}`}
              </Text>
            </View>
          )}

          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {booking.guests?.adults || 1} người lớn
              {booking.guests?.children ? `, ${booking.guests.children} trẻ em` : ''}
            </Text>
          </View>

          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text, fontWeight: 'bold' }]}>
              {(booking.totalPrice || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <TouchableOpacity
            style={[styles.viewDetailsButton, { borderColor: colors.tint }]}
            onPress={() => router.push(`/hotel/${booking.hotel?._id}`)}
          >
            <Text style={[styles.viewDetailsText, { color: colors.tint }]}>
              Chi tiết khách sạn
            </Text>
          </TouchableOpacity>

          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.error }]}
              onPress={() => handleCancelBooking(booking._id, 'hotel')}
            >
              <Text style={[styles.cancelText, { color: colors.error }]}>
                Hủy đặt phòng
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };


  // --- Render chính của màn hình Account ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          title: 'Tài khoản',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false, // Bỏ shadow header
        }}
      />
      {/* Thanh Tab chọn Profile / Bookings */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'profile' && [
              styles.activeTabButton,
              { borderBottomColor: colors.tint },
            ],
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'profile' ? colors.tint : colors.tabIconDefault },
            ]}
          >
            Hồ sơ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'bookings' && [
              styles.activeTabButton,
              { borderBottomColor: colors.tint },
            ],
          ]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'bookings' ? colors.tint : colors.tabIconDefault },
            ]}
          >
            Đặt chỗ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hiển thị nội dung tương ứng với tab đang chọn */}
      {activeTab === 'profile' ? renderProfileTab() : renderBookingTab()}
    </SafeAreaView>
  );
}

// --- Styles --- (Bao gồm cả styles mới cho Profile)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    // backgroundColor: 'white', // Thêm màu nền nếu cần
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  authButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around', // Hoặc 'center' nếu muốn gần nhau hơn
    marginTop: 10,
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 10, // Thêm khoảng cách giữa 2 nút
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Styles for Profile Tab (New)
  profileHeaderContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  profileAvatarContainer: {
    marginBottom: 15,
    position: 'relative', // Để đặt nút edit
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 16,
    marginTop: 4,
  },
  editProfileButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#0366d6', // Màu tint
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: 10, // Giảm khoảng cách trên
    marginHorizontal: 16,
    borderRadius: 12,
    // backgroundColor: 'white', // Thêm màu nền nếu cần
    overflow: 'hidden', // Đảm bảo border được bo tròn
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18, // Tăng padding dọc
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20, // Tăng khoảng cách trên
    marginBottom: 30, // Tăng khoảng cách dưới
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  // Styles for Booking Tab (Existing - Keep as is)
  bookingTypeFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5', // Sử dụng màu từ theme
  },
  typeFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    // backgroundColor: '#f0f0f0', // Sử dụng màu từ theme
  },
  activeTypeFilterButton: {
    // backgroundColor: colors.tint + '20', // Sử dụng màu từ theme
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bookingsList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50, // Thêm khoảng cách trên
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bookingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookingHeaderWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tourName: { // Đổi tên từ tourName để dùng chung
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12, // Bo tròn hơn
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingDetails: {
    marginBottom: 16,
    paddingLeft: 4, // Thêm padding để thẳng hàng với icon
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingDetailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    // borderTopColor: '#f0f0f0', // Sử dụng màu từ theme
    paddingTop: 12,
    marginTop: 4,
  },
  viewDetailsButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  viewDetailsText: {
    fontWeight: '500',
    fontSize: 14,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  cancelText: {
    fontWeight: '500',
    fontSize: 14,
  },
});
