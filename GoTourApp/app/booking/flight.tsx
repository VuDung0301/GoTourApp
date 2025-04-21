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
import { Flight } from '@/types';
import { flightsApi, bookingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';

// Form cho thông tin hành khách
const PassengerInfoSchema = Yup.object().shape({
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
  gender: Yup.string()
    .oneOf(['Nam', 'Nữ', 'Khác'], 'Vui lòng chọn giới tính')
    .required('Vui lòng chọn giới tính'),
  dob: Yup.date()
    .required('Vui lòng nhập ngày sinh')
    .max(new Date(), 'Ngày sinh không hợp lệ'),
});

export default function FlightBookingScreen() {
  const { flightId, class: flightClass } = useLocalSearchParams<{ flightId: string, class: string }>();
  const selectedClass = flightClass as 'economy' | 'business' | 'firstClass';
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token, isAuthenticated } = useAuth();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passengerCount, setPassengerCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có flightId hay không
    if (!flightId) {
      setIsInvalidAccess(true);
      Alert.alert(
        'Thông tin không hợp lệ',
        'Không tìm thấy thông tin chuyến bay. Vui lòng quay lại trang chủ và chọn chuyến bay.',
        [
          {
            text: 'Quay lại',
            onPress: () => router.back()
          }
        ]
      );
      return;
    }
    
    fetchFlightData();
  }, [flightId]);

  const fetchFlightData = async () => {
    if (!flightId) return;

    setIsLoading(true);
    try {
      console.log('Tìm chuyến bay với ID:', flightId);
      const response = await flightsApi.getById(flightId);
      if (response.success && response.data) {
        console.log('Tìm thấy chuyến bay:', response.data._id);
        setFlight(response.data);
      } else {
        console.error('Không tìm thấy chuyến bay:', response);
        Alert.alert('Lỗi', 'Không thể tải thông tin chuyến bay');
        router.back();
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu chuyến bay:', error);
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
      gender: 'Nam',
      dob: new Date(1990, 0, 1),
      additionalRequests: '',
    },
    validationSchema: PassengerInfoSchema,
    onSubmit: async (values) => {
      if (!flight) return;
      console.log('Flight ID khi đặt vé:', flight._id);
      console.log('Loại dữ liệu của Flight ID:', typeof flight._id);

      // Kiểm tra người dùng đã đăng nhập chưa
      if (!isAuthenticated || !token) {
        Alert.alert(
          'Cần đăng nhập', 
          'Bạn cần đăng nhập để đặt vé', 
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
          flightId: flight._id,
          passengers: passengerCount,
          class: selectedClass,
          contactInfo: {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            identification: values.identification,
          },
          passengersDetails: [{
            name: values.fullName,
            idNumber: values.identification,
            dob: values.dob,
            gender: values.gender,
          }],
          additionalRequests: values.additionalRequests,
          totalPrice: flight.price[selectedClass] * passengerCount,
        };

        console.log('Gửi yêu cầu đặt vé:', JSON.stringify(bookingData));
        const response = await bookingsApi.bookFlight(bookingData, token);
        
        console.log('Kết quả đặt vé:', response);
        if (response.success) {
          router.push({
            pathname: '/booking/confirmation',
            params: { 
              bookingId: response.data._id,
              type: 'flight'
            }
          });
        } else {
          Alert.alert('Lỗi', response.message || 'Đã xảy ra lỗi khi đặt vé');
        }
      } catch (error) {
        console.error('Lỗi khi đặt vé:', error);
        Alert.alert('Lỗi', 'Đã xảy ra lỗi khi xử lý đặt vé. Vui lòng thử lại sau.');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Format ngày giờ
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: vi });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: vi });
  };

  // Tính thời gian bay
  const calculateDuration = (departureTime: string, arrivalTime: string) => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const durationMinutes = differenceInMinutes(arrival, departure);
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return `${hours}h ${minutes}p`;
  };

  // Lấy tên hiển thị của hạng ghế
  const getClassName = (seatClass: string) => {
    switch (seatClass) {
      case 'economy': return 'Phổ thông';
      case 'business': return 'Thương gia';
      case 'firstClass': return 'Hạng nhất';
      default: return 'Phổ thông';
    }
  };

  if (isInvalidAccess) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy thông tin chuyến bay</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.tint }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!flight) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy thông tin chuyến bay</Text>
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen 
          options={{
            title: 'Đặt vé máy bay',
            headerShown: true,
          }}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Flight Summary */}
          <View style={[styles.flightCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.flightHeader}>
              <View style={styles.airlineInfo}>
                <Text style={[styles.airlineName, { color: colors.text }]}>{flight.airline}</Text>
                <Text style={[styles.flightNumber, { color: colors.tabIconDefault }]}>
                  {flight.flightNumber}
                </Text>
              </View>
              <Text style={[styles.classText, { color: colors.tint }]}>{getClassName(selectedClass)}</Text>
            </View>

            <View style={styles.flightDetails}>
              <View style={styles.locationTime}>
                <Text style={[styles.city, { color: colors.text }]}>{flight.departureCity}</Text>
                <Text style={[styles.time, { color: colors.text }]}>{formatDateTime(flight.departureTime)}</Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>{formatDate(flight.departureTime)}</Text>
                <Text style={[styles.airport, { color: colors.tabIconDefault }]}>{flight.departureAirport || "Sân bay quốc tế"}</Text>
              </View>

              <View style={styles.flightPathContainer}>
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                <View style={[styles.line, { backgroundColor: colors.tabIconDefault }]} />
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                <Text style={[styles.flightDuration, { color: colors.tabIconDefault }]}>
                  {flight.duration || calculateDuration(flight.departureTime, flight.arrivalTime)}
                </Text>
              </View>

              <View style={styles.locationTime}>
                <Text style={[styles.city, { color: colors.text }]}>{flight.arrivalCity}</Text>
                <Text style={[styles.time, { color: colors.text }]}>{formatDateTime(flight.arrivalTime)}</Text>
                <Text style={[styles.date, { color: colors.tabIconDefault }]}>{formatDate(flight.arrivalTime)}</Text>
                <Text style={[styles.airport, { color: colors.tabIconDefault }]}>{flight.arrivalAirport || "Sân bay quốc tế"}</Text>
              </View>
            </View>
            
            {/* Thông tin bổ sung */}
            <View style={[styles.flightInfoContainer, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 16, paddingTop: 12 }]}>
              <View style={styles.flightInfoItem}>
                <Text style={[styles.flightInfoLabel, { color: colors.tabIconDefault }]}>Loại máy bay:</Text>
                <Text style={[styles.flightInfoValue, { color: colors.text }]}>{flight.aircraft || "Không có thông tin"}</Text>
              </View>
              <View style={styles.flightInfoItem}>
                <Text style={[styles.flightInfoLabel, { color: colors.tabIconDefault }]}>Ghế trống:</Text>
                <Text style={[styles.flightInfoValue, { color: colors.text }]}>
                  {flight.seatsAvailable[selectedClass]} ghế {getClassName(selectedClass)}
                </Text>
              </View>
              <View style={styles.flightInfoItem}>
                <Text style={[styles.flightInfoLabel, { color: colors.tabIconDefault }]}>Hạng vé:</Text>
                <Text style={[styles.flightInfoValue, { color: colors.tint, fontWeight: '500' }]}>
                  {getClassName(selectedClass)}
                </Text>
              </View>
            </View>
          </View>

          {/* Passenger Count */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Số lượng hành khách</Text>
            
            <View style={styles.passengerCounter}>
              <TouchableOpacity 
                style={[styles.counterButton, { borderColor: colors.border }]}
                onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                disabled={passengerCount <= 1}
              >
                <IconSymbol 
                  name="minus" 
                  size={20} 
                  color={passengerCount <= 1 ? colors.tabIconDefault + '50' : colors.tabIconDefault} 
                />
              </TouchableOpacity>
              
              <Text style={[styles.passengerCount, { color: colors.text }]}>{passengerCount}</Text>
              
              <TouchableOpacity 
                style={[styles.counterButton, { borderColor: colors.border }]}
                onPress={() => {
                  const maxSeats = flight.seatsAvailable[selectedClass];
                  if (passengerCount < maxSeats) {
                    setPassengerCount(passengerCount + 1);
                  } else {
                    Alert.alert('Thông báo', `Chỉ còn ${maxSeats} chỗ ngồi hạng ${getClassName(selectedClass)}`);
                  }
                }}
                disabled={passengerCount >= flight.seatsAvailable[selectedClass]}
              >
                <IconSymbol 
                  name="plus" 
                  size={20} 
                  color={passengerCount >= flight.seatsAvailable[selectedClass] ? colors.tabIconDefault + '50' : colors.tabIconDefault} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Information */}
          <View style={[styles.formCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Thông tin liên hệ</Text>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Họ tên</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.touched.fullName && formik.errors.fullName ? '#ff6b6b' : colors.border 
                  }
                ]}
                placeholder="Nhập họ tên"
                placeholderTextColor={colors.tabIconDefault}
                value={formik.values.fullName}
                onChangeText={formik.handleChange('fullName')}
                onBlur={formik.handleBlur('fullName')}
              />
              {formik.touched.fullName && formik.errors.fullName && (
                <Text style={styles.errorText}>{formik.errors.fullName}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.touched.email && formik.errors.email ? '#ff6b6b' : colors.border 
                  }
                ]}
                placeholder="Nhập email"
                placeholderTextColor={colors.tabIconDefault}
                value={formik.values.email}
                onChangeText={formik.handleChange('email')}
                onBlur={formik.handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {formik.touched.email && formik.errors.email && (
                <Text style={styles.errorText}>{formik.errors.email}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Số điện thoại</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.touched.phone && formik.errors.phone ? '#ff6b6b' : colors.border 
                  }
                ]}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={colors.tabIconDefault}
                value={formik.values.phone}
                onChangeText={formik.handleChange('phone')}
                onBlur={formik.handleBlur('phone')}
                keyboardType="phone-pad"
              />
              {formik.touched.phone && formik.errors.phone && (
                <Text style={styles.errorText}>{formik.errors.phone}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>CCCD/CMND</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.touched.identification && formik.errors.identification ? '#ff6b6b' : colors.border 
                  }
                ]}
                placeholder="Nhập CCCD hoặc CMND"
                placeholderTextColor={colors.tabIconDefault}
                value={formik.values.identification}
                onChangeText={formik.handleChange('identification')}
                onBlur={formik.handleBlur('identification')}
                keyboardType="number-pad"
              />
              {formik.touched.identification && formik.errors.identification && (
                <Text style={styles.errorText}>{formik.errors.identification}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Giới tính</Text>
              <View style={styles.radioGroup}>
                {['Nam', 'Nữ', 'Khác'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.radioButton,
                      { borderColor: colors.border },
                      formik.values.gender === option && { 
                        backgroundColor: colors.tint + '20',
                        borderColor: colors.tint 
                      }
                    ]}
                    onPress={() => formik.setFieldValue('gender', option)}
                  >
                    <View style={[
                      styles.radioInner,
                      formik.values.gender === option && { 
                        backgroundColor: colors.tint,
                        borderColor: colors.tint 
                      }
                    ]} />
                    <Text style={[
                      styles.radioLabel,
                      { color: formik.values.gender === option ? colors.tint : colors.text }
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formik.touched.gender && formik.errors.gender && (
                <Text style={styles.errorText}>{formik.errors.gender}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Ngày sinh</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: formik.touched.dob && formik.errors.dob ? '#ff6b6b' : colors.border 
                  }
                ]}
                onPress={() => {
                  // Thực tế nên sử dụng DateTimePicker ở đây
                  // Nhưng hiện tại chỉ hiển thị ngày đã chọn
                  Alert.alert(
                    'Chọn ngày sinh',
                    'Trong ứng dụng thực tế, nút này sẽ hiển thị date picker.',
                    [
                      { 
                        text: 'OK', 
                        onPress: () => console.log('OK Pressed') 
                      }
                    ]
                  );
                }}
              >
                <Text style={{ color: colors.text }}>
                  {format(formik.values.dob, 'dd/MM/yyyy', { locale: vi })}
                </Text>
              </TouchableOpacity>
              {formik.touched.dob && formik.errors.dob && (
                <Text style={styles.errorText}>{String(formik.errors.dob)}</Text>
              )}
            </View>
            
            <View style={styles.formItem}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Yêu cầu đặc biệt (nếu có)</Text>
              <TextInput
                style={[
                  styles.textarea, 
                  { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border 
                  }
                ]}
                placeholder="Ví dụ: Bữa ăn đặc biệt, hỗ trợ xe lăn..."
                placeholderTextColor={colors.tabIconDefault}
                value={formik.values.additionalRequests}
                onChangeText={formik.handleChange('additionalRequests')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Price Summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: colors.text }]}>Giá vé x {passengerCount}</Text>
              <Text style={[styles.summaryPrice, { color: colors.text }]}>
                {(flight.price[selectedClass] * passengerCount).toLocaleString('vi-VN')}đ
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.summaryRow}>
              <Text style={[styles.totalText, { color: colors.text }]}>Tổng cộng</Text>
              <Text style={[styles.totalPrice, { color: colors.tint }]}>
                {(flight.price[selectedClass] * passengerCount).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button 
              title={isSubmitting ? "Đang xử lý..." : "Tiếp tục để thanh toán"}
              onPress={() => formik.handleSubmit()}
              size="large"
              disabled={isSubmitting}
              style={styles.submitButton}
            />

            {__DEV__ && (
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: '#f0ad4e', marginTop: 10 }]}
                onPress={async () => {
                  if (!flight) return;
                  
                  try {
                    console.log('Test với Flight ID:', flight._id);
                    const testResponse = await bookingsApi.testFlightBooking(flight._id);
                    console.log('Kết quả test:', testResponse);
                    
                    if (testResponse.success) {
                      Alert.alert('Test thành công', 'Chuyến bay tồn tại và có thể đặt vé');
                    } else {
                      Alert.alert('Test thất bại', testResponse.message || 'Không thể kiểm tra chuyến bay');
                    }
                  } catch (error) {
                    console.error('Lỗi khi test:', error);
                    Alert.alert('Lỗi test', 'Có lỗi xảy ra khi kiểm tra chuyến bay');
                  }
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                  Kiểm tra API
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  flightCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  airlineInfo: {
    flexDirection: 'column',
  },
  airlineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  flightNumber: {
    fontSize: 14,
  },
  classText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTime: {
    alignItems: 'center',
    flex: 1,
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
  airport: {
    fontSize: 12,
  },
  flightPathContainer: {
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
  flightDuration: {
    fontSize: 12,
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  passengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
  },
  passengerCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 24,
  },
  formItem: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textarea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  summaryText: {
    fontSize: 16,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  submitContainer: {
    padding: 16,
    marginBottom: 24,
  },
  submitButton: {
    width: '100%',
  },
  testButton: {
    padding: 12,
    borderRadius: 8,
  },
  flightInfoContainer: {
    padding: 12,
  },
  flightInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flightInfoLabel: {
    fontSize: 14,
  },
  flightInfoValue: {
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
  },
  radioInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    justifyContent: 'center',
  },
}); 