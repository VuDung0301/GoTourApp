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
      // Thực hiện đồng thời cả ba request
      const [flightResponse, tourResponse, hotelResponse] = await Promise.all([
        bookingsApi.getMyBookings(token),
        tourBookingsApi.getMyBookings(token),
        hotelBookingsApi.getMyBookings(token)
      ]);

      // Xử lý dữ liệu đặt vé máy bay
      if (flightResponse.success && flightResponse.data) {
        console.log('Flight bookings data:', flightResponse.data);
        setFlightBookings(flightResponse.data);
      } else {
        console.error('Error fetching flight bookings:', flightResponse.message);
        setFlightBookings([]);
      }

      // Xử lý dữ liệu đặt tour
      if (tourResponse.success && tourResponse.data) {
        console.log('Tour bookings data:', tourResponse.data);
        setTourBookings(tourResponse.data);
      } else {
        console.error('Error fetching tour bookings:', tourResponse.message);
        setTourBookings([]);
      }

      // Xử lý dữ liệu đặt phòng khách sạn
      if (hotelResponse.success && hotelResponse.data) {
        console.log('Hotel bookings data:', hotelResponse.data);
        setHotelBookings(hotelResponse.data);
      } else {
        console.error('Error fetching hotel bookings:', hotelResponse.message);
        setHotelBookings([]);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
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

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Đăng xuất',
        onPress: async () => {
          await logout();
          // Nên sử dụng setTimeout
          setTimeout(() => {
            router.replace('/');
          }, 100);
        },
      },
    ]);
  };

  const renderProfileTab = () => {
    if (!isAuthenticated) {
      return (
        <View style={styles.notLoggedInContainer}>
          <Text style={[styles.notLoggedInText, { color: colors.text }]}>
            Bạn chưa đăng nhập
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

    return (
      <ScrollView style={styles.tabContent}>
        <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: colors.tabIconDefault }]}>{user?.email}</Text>
        </View>

        <View style={[styles.sectionContainer, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cá nhân</Text>
          
          <View style={styles.profileInfoItem}>
            <Ionicons name="mail-outline" size={20} color={colors.tabIconDefault} />
            <Text style={[styles.profileInfoText, { color: colors.text }]}>{user?.email}</Text>
          </View>
          
          <View style={styles.profileInfoItem}>
            <Ionicons name="call-outline" size={20} color={colors.tabIconDefault} />
            <Text style={[styles.profileInfoText, { color: colors.text }]}>
              {user?.phone || 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.error + '20' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

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
      if (bookingType === 'tour') return tourBookings;
      if (bookingType === 'flight') return flightBookings;
      if (bookingType === 'hotel') return hotelBookings;
      // Kết hợp tất cả các loại booking khi chọn "Tất cả"
      return [
        ...tourBookings.map(booking => ({...booking, type: 'tour'})),
        ...flightBookings.map(booking => ({...booking, type: 'flight'})),
        ...hotelBookings.map(booking => ({...booking, type: 'hotel'}))
      ];
    })();

    if (filteredBookings.length === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      </>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50'; // green
      case 'pending':
        return '#FF9800'; // orange
      case 'cancelled':
        return '#F44336'; // red
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Đã xác nhận';
      case 'pending':
        return 'Đang chờ';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  };

  const renderTourBookingItem = (booking: any) => {
    const statusColor = getStatusColor(booking.status);
    const startDate = booking.startDate ? new Date(booking.startDate) : new Date();
    const isPastDate = startDate.getTime() < new Date().getTime();
    const canCancel = booking.status !== 'cancelled' && !isPastDate;
    
    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={styles.bookingTypeIndicator}>
            <Ionicons name="map-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Tour</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]}>
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
              {booking.startDate ? format(new Date(booking.startDate), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
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
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
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
    const departureTime = booking.flight?.departureTime 
      ? new Date(booking.flight.departureTime)
      : new Date();
    const isPastDate = departureTime.getTime() < new Date().getTime();
    const canCancel = booking.status !== 'cancelled' && !isPastDate;
    
    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: '#1976D2' }]}>
            <Ionicons name="airplane-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Vé máy bay</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]}>
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
          {booking.flight && (
            <View style={styles.bookingDetailItem}>
              <Ionicons name="time-outline" size={16} color={colors.tabIconDefault} />
              <Text style={[styles.bookingDetailText, { color: colors.text }]}>
                {booking.flight.departureTime ? 
                  format(new Date(booking.flight.departureTime), 'HH:mm - dd/MM/yyyy', { locale: vi }) : 
                  'N/A'}
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
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {(booking.totalPrice || 0).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingFooter}>
          {booking.flight && (
            <TouchableOpacity
              style={[styles.viewDetailsButton, { borderColor: colors.tint }]}
              onPress={() => router.push(`/booking/confirmation?bookingId=${booking._id}&type=flight`)}
            >
              <Text style={[styles.viewDetailsText, { color: colors.tint }]}>
                Chi tiết vé
              </Text>
            </TouchableOpacity>
          )}
          
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
    const checkInDate = booking.checkIn ? new Date(booking.checkIn) : new Date();
    const isPastDate = checkInDate.getTime() < new Date().getTime();
    const canCancel = booking.status !== 'cancelled' && !isPastDate;
    
    return (
      <View style={[styles.bookingItem, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingHeaderWithBadge}>
          <View style={[styles.bookingTypeIndicator, { backgroundColor: '#4A90E2' }]}>
            <Ionicons name="bed-outline" size={16} color="white" />
            <Text style={styles.bookingTypeText}>Khách sạn</Text>
          </View>
          <Text style={[styles.tourName, { color: colors.text }]}>
            {booking.hotel?.name || 'Khách sạn không xác định'}
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
              {booking.checkIn 
                ? `${format(new Date(booking.checkIn), 'dd/MM/yyyy', { locale: vi })} - ${format(new Date(booking.checkOut), 'dd/MM/yyyy', { locale: vi })}`
                : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="people-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
              {booking.guests?.adults || 1} người lớn
              {booking.guests?.children ? `, ${booking.guests.children} trẻ em` : ''}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.tabIconDefault} />
            <Text style={[styles.bookingDetailText, { color: colors.text }]}>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          title: 'Tài khoản',
          headerShown: true,
        }}
      />

      <View style={styles.tabBar}>
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
            Đặt tour
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? renderProfileTab() : renderBookingTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    justifyContent: 'space-around',
  },
  authButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileHeader: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  sectionContainer: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileInfoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  bookingTypeFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  typeFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  activeTypeFilterButton: {
    borderRadius: 20,
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
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
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
    backgroundColor: '#4CAF50',
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingDetails: {
    marginBottom: 16,
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