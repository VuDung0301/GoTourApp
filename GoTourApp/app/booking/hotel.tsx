import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { Hotel, HotelRoom } from '@/types';
import { hotelsApi, bookingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

// Form cho thông tin đặt phòng
const BookingInfoSchema = Yup.object().shape({
  fullName: Yup.string()
    .min(2, 'Tên quá ngắn')
    .max(50, 'Tên quá dài')
    .required('Vui lòng nhập họ tên'),
  email: Yup.string()
    .email('Email không hợp lệ')
    .required('Vui lòng nhập email'),
  phone: Yup.string()
    .matches(/^[0-9]{10}$/, 'Số điện thoại phải có 10 chữ số')
    .required('Vui lòng nhập số điện thoại'),
  identification: Yup.string()
    .matches(/^[0-9]{9,12}$/, 'CCCD/CMND không hợp lệ')
    .required('Vui lòng nhập CCCD/CMND'),
  specialRequests: Yup.string(),
});

export default function HotelBookingScreen() {
  const { 
    hotelId, 
    roomId, 
    roomName, 
    price, 
    checkIn, 
    checkOut, 
    guests 
  } = useLocalSearchParams<{ 
    hotelId: string, 
    roomId: string, 
    roomName: string, 
    price: string, 
    checkIn: string, 
    checkOut: string, 
    guests: string 
  }>();
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token, isAuthenticated } = useAuth();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<HotelRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomCount, setRoomCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có đủ thông tin để đặt phòng không
    if (!hotelId || !roomId || !checkIn || !checkOut) {
      setIsInvalidAccess(true);
      Alert.alert(
        'Thông tin không hợp lệ',
        'Không đủ thông tin để đặt phòng. Vui lòng quay lại và chọn phòng.',
        [
          {
            text: 'Quay lại',
            onPress: () => router.back()
          }
        ]
      );
      return;
    }
    
    fetchHotelData();
  }, [hotelId, roomId]);

  const fetchHotelData = async () => {
    setIsLoading(true);
    try {
      const response = await hotelsApi.getById(hotelId);
      if (response.success && response.data) {
        setHotel(response.data);
        
        // Tạo phòng mặc định nếu roomId là 'default' hoặc không tìm thấy phòng
        if (roomId === 'default' || !response.data.roomTypes || response.data.roomTypes.length === 0) {
          // Tạo đối tượng phòng mặc định dựa trên thông tin truyền vào
          const defaultRoom = {
            _id: roomId,
            name: roomName || 'Phòng tiêu chuẩn',
            pricePerNight: parseFloat(price || '0'),
            price: parseFloat(price || '0'),
            capacity: parseInt(guests || '2'),
            quantity: 5,
            description: 'Phòng tiêu chuẩn tại ' + response.data.name
          };
          setRoom(defaultRoom);
        } else {
          // Tìm phòng đã chọn trong danh sách phòng nếu có
          const selectedRoom = response.data.roomTypes.find(
            r => r._id === roomId
          );
          
          if (selectedRoom) {
            setRoom(selectedRoom);
          } else {
            // Nếu không tìm thấy, vẫn dùng thông tin phòng mặc định
            const defaultRoom = {
              _id: roomId,
              name: roomName || 'Phòng tiêu chuẩn',
              pricePerNight: parseFloat(price || '0'),
              price: parseFloat(price || '0'),
              capacity: parseInt(guests || '2'),
              quantity: 5,
              description: 'Phòng tiêu chuẩn tại ' + response.data.name
            };
            setRoom(defaultRoom);
          }
        }
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin khách sạn');
        router.back();
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu khách sạn:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải dữ liệu');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      fullName: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      identification: '',
      specialRequests: '',
    },
    validationSchema: BookingInfoSchema,
    onSubmit: async (values) => {
      if (!hotel || !room) return;

      // Kiểm tra người dùng đã đăng nhập chưa
      if (!isAuthenticated || !token) {
        Alert.alert(
          'Cần đăng nhập', 
          'Bạn cần đăng nhập để đặt phòng', 
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') }
          ]
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const bookingData = {
          hotelId: hotel._id,
          roomId: room._id || roomId,
          roomCount: roomCount,
          checkIn: checkIn,
          checkOut: checkOut,
          guests: {
            adults: parseInt(guests || '2'),
            children: 0
          },
          contactInfo: {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            identification: values.identification,
          },
          specialRequests: values.specialRequests,
          totalPrice: calculateTotalPrice(),
        };

        const response = await bookingsApi.bookHotel(bookingData, token);
        
        if (response.success) {
          router.push({
            pathname: '/booking/confirmation',
            params: { 
              bookingId: response.data._id,
              type: 'hotel'
            }
          });
        } else {
          Alert.alert('Lỗi', response.message || 'Đã xảy ra lỗi khi đặt phòng');
        }
      } catch (error) {
        console.error('Lỗi khi đặt phòng:', error);
        Alert.alert('Lỗi', 'Đã xảy ra lỗi khi xử lý đặt phòng. Vui lòng thử lại sau.');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Format ngày
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: vi });
  };

  // Tính số đêm
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return differenceInDays(end, start) || 1;
  };

  // Tính tổng tiền
  const calculateTotalPrice = () => {
    if (!room) return 0;
    const nights = calculateNights();
    const roomPrice = parseFloat(price || room.pricePerNight?.toString() || '0');
    const totalRoomPrice = roomPrice * nights * roomCount;
    const serviceFee = totalRoomPrice * 0.05; // Phí dịch vụ 5%
    
    return totalRoomPrice + serviceFee;
  };

  // Tăng số lượng phòng
  const increaseRoomCount = () => {
    if (room && roomCount < (room.quantity || 5)) {
      setRoomCount(prev => prev + 1);
    } else {
      Alert.alert('Thông báo', 'Đã đạt số lượng phòng tối đa có thể đặt');
    }
  };

  // Giảm số lượng phòng
  const decreaseRoomCount = () => {
    if (roomCount > 1) {
      setRoomCount(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (isInvalidAccess || !hotel) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy thông tin khách sạn hoặc phòng</Text>
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
          title: 'Đặt phòng khách sạn',
          headerShown: true,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Thông tin khách sạn và phòng */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Thông tin đặt phòng</Text>
            
            <View style={styles.hotelInfo}>
              <Text style={[styles.hotelName, { color: colors.text }]}>{hotel.name}</Text>
              <Text style={[styles.hotelAddress, { color: colors.textSecondary }]}>
                {hotel.address}, {hotel.city}
              </Text>
              
              <View style={styles.divider} />
              
              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{roomName || room.name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nhận phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(checkIn)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Trả phòng:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(checkOut)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Số đêm:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{calculateNights()} đêm</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Số người:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{guests || 2} người</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Số lượng phòng */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Số lượng phòng</Text>
            
            <View style={styles.roomCountContainer}>
              <TouchableOpacity 
                style={[styles.countButton, { backgroundColor: colors.tint + '20' }]}
                onPress={decreaseRoomCount}
              >
                <IconSymbol name="minus" size={20} color={colors.tint} />
              </TouchableOpacity>
              
              <Text style={[styles.roomCount, { color: colors.text }]}>{roomCount}</Text>
              
              <TouchableOpacity 
                style={[styles.countButton, { backgroundColor: colors.tint + '20' }]}
                onPress={increaseRoomCount}
              >
                <IconSymbol name="plus" size={20} color={colors.tint} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Thông tin liên hệ */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Thông tin liên hệ</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Họ tên</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.errors.fullName && formik.touched.fullName 
                      ? colors.error 
                      : colors.border
                  }
                ]}
                placeholder="Nhập họ tên"
                placeholderTextColor={colors.textSecondary}
                value={formik.values.fullName}
                onChangeText={formik.handleChange('fullName')}
                onBlur={formik.handleBlur('fullName')}
              />
              {formik.errors.fullName && formik.touched.fullName && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formik.errors.fullName}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.errors.email && formik.touched.email 
                      ? colors.error 
                      : colors.border
                  }
                ]}
                placeholder="Nhập email"
                placeholderTextColor={colors.textSecondary}
                value={formik.values.email}
                onChangeText={formik.handleChange('email')}
                onBlur={formik.handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {formik.errors.email && formik.touched.email && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formik.errors.email}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Số điện thoại</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.errors.phone && formik.touched.phone 
                      ? colors.error 
                      : colors.border
                  }
                ]}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={colors.textSecondary}
                value={formik.values.phone}
                onChangeText={formik.handleChange('phone')}
                onBlur={formik.handleBlur('phone')}
                keyboardType="phone-pad"
              />
              {formik.errors.phone && formik.touched.phone && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formik.errors.phone}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>CCCD/CMND</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.errors.identification && formik.touched.identification 
                      ? colors.error 
                      : colors.border
                  }
                ]}
                placeholder="Nhập CCCD/CMND"
                placeholderTextColor={colors.textSecondary}
                value={formik.values.identification}
                onChangeText={formik.handleChange('identification')}
                onBlur={formik.handleBlur('identification')}
                keyboardType="number-pad"
              />
              {formik.errors.identification && formik.touched.identification && (
                <Text style={[styles.errorText, { color: colors.error }]}>{formik.errors.identification}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Yêu cầu đặc biệt (không bắt buộc)</Text>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                placeholder="Nhập yêu cầu đặc biệt (nếu có)"
                placeholderTextColor={colors.textSecondary}
                value={formik.values.specialRequests}
                onChangeText={formik.handleChange('specialRequests')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Tổng tiền */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Chi tiết giá</Text>
            
            <View style={styles.priceDetails}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                  Giá phòng ({calculateNights()} đêm x {roomCount} phòng)
                </Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>
                  {new Intl.NumberFormat('vi-VN').format(parseFloat(price || '0') * calculateNights() * roomCount)} ₫
                </Text>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Phí dịch vụ (5%)</Text>
                <Text style={[styles.priceValue, { color: colors.text }]}>
                  {new Intl.NumberFormat('vi-VN').format(parseFloat(price || '0') * calculateNights() * roomCount * 0.05)} ₫
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.priceRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Tổng tiền</Text>
                <Text style={[styles.totalValue, { color: colors.tint }]}>
                  {new Intl.NumberFormat('vi-VN').format(calculateTotalPrice())} ₫
                </Text>
              </View>
            </View>
          </View>
          
          {/* Chính sách khách sạn */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, marginBottom: 100 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Chính sách và điều khoản</Text>
            
            <View style={styles.policyContainer}>
              <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                • Nhận phòng từ 14:00, trả phòng trước 12:00
              </Text>
              <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                • Hủy đặt phòng miễn phí trước 3 ngày
              </Text>
              <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                • Yêu cầu CCCD/CMND khi nhận phòng
              </Text>
              <Text style={[styles.policyText, { color: colors.textSecondary }]}>
                • Có thể phát sinh phí dịch vụ tùy chọn tại khách sạn
              </Text>
            </View>
            
            <TouchableOpacity onPress={() => formik.handleSubmit()}>
              <View style={[styles.bookButton, { backgroundColor: colors.tint }]}>
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.bookButtonText}>Đặt phòng ngay</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  hotelInfo: {
    marginBottom: 8,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hotelAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  bookingDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  roomCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomCount: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  priceDetails: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  policyContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  policyText: {
    fontSize: 14,
    marginBottom: 6,
  },
  bookButton: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 