import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Tour } from '@/types';
import { toursApi, bookingsApi } from '@/lib/api';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function BookTourScreen() {
  const { tourId } = useLocalSearchParams<{ tourId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, token } = useAuth();

  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Thông tin đặt tour
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [numberOfPeople, setNumberOfPeople] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Lỗi validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTourData();
    
    // Điền thông tin người dùng nếu đã đăng nhập
    if (user) {
      setContactName(user.name || '');
      setContactEmail(user.email || '');
      setContactPhone(user.phone || '');
    }
  }, [tourId, user]);

  const fetchTourData = async () => {
    if (!tourId) return;

    setIsLoading(true);
    try {
      const response = await toursApi.getById(tourId);
      if (response.success && response.data) {
        setTour(response.data);
        
        // Đặt ngày khởi hành mặc định là ngày đầu tiên trong danh sách
        if (response.data.startDates && response.data.startDates.length > 0) {
          setSelectedDate(new Date(response.data.startDates[0]));
        }
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin tour');
        router.back();
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu tour:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải dữ liệu');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      setErrors({ ...errors, selectedDate: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedDate) {
      newErrors.selectedDate = 'Vui lòng chọn ngày khởi hành';
    }
    
    const peopleCount = parseInt(numberOfPeople);
    if (isNaN(peopleCount) || peopleCount < 1) {
      newErrors.numberOfPeople = 'Số người phải lớn hơn 0';
    } else if (tour && peopleCount > tour.maxGroupSize) {
      newErrors.numberOfPeople = `Số người tối đa là ${tour.maxGroupSize}`;
    }
    
    if (!contactName.trim()) {
      newErrors.contactName = 'Vui lòng nhập tên liên hệ';
    }
    
    if (!contactPhone.trim()) {
      newErrors.contactPhone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10}$/.test(contactPhone.trim())) {
      newErrors.contactPhone = 'Số điện thoại không hợp lệ (cần 10 chữ số)';
    }
    
    if (!contactEmail.trim()) {
      newErrors.contactEmail = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(contactEmail.trim())) {
      newErrors.contactEmail = 'Email không hợp lệ';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBookTour = async () => {
    if (!validateForm() || !tour || !selectedDate) return;
    
    setIsSubmitting(true);
    try {
      const bookingData = {
        tourId: tourId,
        startDate: selectedDate.toISOString(),
        numOfPeople: parseInt(numberOfPeople),
        contactName,
        contactEmail,
        contactPhone,
        specialRequests,
        totalPrice: calculateTotalPrice(),
        status: 'pending',
      };
      
      // Kiểm tra token trước khi gọi API
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để đặt tour');
        router.push('/(auth)/login');
        return;
      }
      
      console.log('Gửi yêu cầu đặt tour:', JSON.stringify(bookingData));
      
      // Trước tiên kiểm tra khả dụng của tour
      const testResponse = await bookingsApi.testTourBooking(
        tourId,
        selectedDate,
        parseInt(numberOfPeople)
      );
      
      if (!testResponse.success) {
        Alert.alert('Không thể đặt tour', testResponse.message || 'Vui lòng kiểm tra lại thông tin đặt tour');
        return;
      }
      
      // Tiếp tục đặt tour nếu kiểm tra thành công
      const response = await bookingsApi.create(bookingData, token);
      
      if (response.success) {
        router.push({
          pathname: '/booking/confirmation',
          params: { 
            bookingId: response.data._id,
            type: 'tour'
          }
        });
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể đặt tour. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Lỗi khi đặt tour:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đặt tour. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!tour) return 0;
    const price = tour.priceDiscount || tour.price;
    return price * parseInt(numberOfPeople || '1');
  };

  const formatDate = (date: Date) => {
    return format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
  };

  // Tour Info Summary
  const renderTourSummary = () => {
    return (
      <View style={[styles.tourCard, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.tourHeader}>
          <Text style={[styles.tourName, { color: colors.text }]}>{tour.name}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(tour.difficulty) }]}>
            <Text style={styles.difficultyText}>{tour.difficulty}</Text>
          </View>
        </View>
        
        {tour.imageCover && (
          <Image 
            source={{ uri: tour.imageCover }} 
            style={styles.tourImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.tourHighlights}>
          <View style={styles.highlightItem}>
            <Ionicons name="location-outline" size={18} color={colors.tint} />
            <Text style={[styles.highlightText, { color: colors.text }]}>
              {tour.locations && tour.locations.length > 0 ? 
                `${tour.locations.length} điểm tham quan` : 
                tour.startLocation?.description || "Điểm khởi hành"}
            </Text>
          </View>
          
          <View style={styles.highlightItem}>
            <Ionicons name="time-outline" size={18} color={colors.tint} />
            <Text style={[styles.highlightText, { color: colors.text }]}>
              {tour.duration} ngày {tour.duration > 1 ? `(${tour.duration - 1} đêm)` : ''}
            </Text>
          </View>
          
          <View style={styles.highlightItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.tint} />
            <Text style={[styles.highlightText, { color: colors.text }]}>
              {tour.startDates && tour.startDates.length} lịch khởi hành
            </Text>
          </View>
          
          <View style={styles.highlightItem}>
            <Ionicons name="people-outline" size={18} color={colors.tint} />
            <Text style={[styles.highlightText, { color: colors.text }]}>
              Tối đa {tour.maxGroupSize} người/nhóm
            </Text>
          </View>
        </View>
        
        <View style={[styles.tourInfoDivider, { backgroundColor: colors.border }]} />
        
        <View style={styles.tourPriceInfo}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Giá gốc:</Text>
            <Text style={[styles.priceValue, { color: colors.text, textDecorationLine: tour.priceDiscount ? 'line-through' : 'none' }]}>
              {tour.price.toLocaleString('vi-VN')}đ/người
            </Text>
          </View>
          
          {tour.priceDiscount && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Giá ưu đãi:</Text>
              <Text style={[styles.discountPrice, { color: colors.tint }]}>
                {tour.priceDiscount.toLocaleString('vi-VN')}đ/người
              </Text>
            </View>
          )}
          
          {tour.priceDiscount && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Tiết kiệm:</Text>
              <Text style={[styles.savingPrice, { color: '#4CAF50' }]}>
                {(tour.price - tour.priceDiscount).toLocaleString('vi-VN')}đ/người ({Math.round((tour.price - tour.priceDiscount) / tour.price * 100)}%)
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  if (!tour) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy thông tin tour</Text>
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
          title: 'Đặt tour du lịch',
          headerShown: true,
        }}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Tour Summary */}
          {!isLoading && tour && renderTourSummary()}

          <View style={styles.formContainer}>
            {/* Chọn ngày khởi hành */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn ngày khởi hành</Text>
              
              <TouchableOpacity
                style={[styles.datePickerButton, { borderColor: errors.selectedDate ? colors.error : colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: selectedDate ? colors.text : colors.tabIconDefault }}>
                  {selectedDate ? formatDate(selectedDate) : 'Chọn ngày khởi hành'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.tabIconDefault} />
              </TouchableOpacity>
              
              {errors.selectedDate ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.selectedDate}</Text>
              ) : null}
              
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
              
              <Text style={[styles.helpText, { color: colors.tabIconDefault }]}>
                Các ngày khởi hành có sẵn:
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.availableDatesContainer}
              >
                {tour.startDates.map((date, index) => {
                  const startDate = new Date(date);
                  const isSelected = selectedDate && 
                                     startDate.getDate() === selectedDate.getDate() &&
                                     startDate.getMonth() === selectedDate.getMonth() &&
                                     startDate.getFullYear() === selectedDate.getFullYear();
                  
                  return (
                    <TouchableOpacity
                      key={`date-${index}`}
                      style={[
                        styles.availableDateItem,
                        { borderColor: colors.border },
                        isSelected && { borderColor: colors.tint, backgroundColor: colors.tint + '20' }
                      ]}
                      onPress={() => {
                        setSelectedDate(startDate);
                        setErrors({ ...errors, selectedDate: '' });
                      }}
                    >
                      <Text 
                        style={{ 
                          color: isSelected ? colors.tint : colors.text,
                          fontWeight: isSelected ? 'bold' : 'normal'
                        }}
                      >
                        {format(startDate, 'dd/MM/yyyy', { locale: vi })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Số lượng người */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Số lượng người</Text>
              
              <View style={styles.peopleCountContainer}>
                <TouchableOpacity
                  style={[styles.countButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const current = parseInt(numberOfPeople);
                    if (current > 1) {
                      setNumberOfPeople((current - 1).toString());
                      setErrors({ ...errors, numberOfPeople: '' });
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.tabIconDefault} />
                </TouchableOpacity>
                
                <TextInput
                  style={[
                    styles.peopleCountInput,
                    { 
                      borderColor: errors.numberOfPeople ? colors.error : colors.border,
                      color: colors.text,
                      backgroundColor: colors.cardBackground
                    }
                  ]}
                  value={numberOfPeople}
                  onChangeText={(text) => {
                    // Chỉ cho phép nhập số
                    if (/^\d*$/.test(text)) {
                      setNumberOfPeople(text);
                      setErrors({ ...errors, numberOfPeople: '' });
                    }
                  }}
                  keyboardType="number-pad"
                />
                
                <TouchableOpacity
                  style={[styles.countButton, { borderColor: colors.border }]}
                  onPress={() => {
                    const current = parseInt(numberOfPeople);
                    if (current < (tour?.maxGroupSize || 10)) {
                      setNumberOfPeople((current + 1).toString());
                      setErrors({ ...errors, numberOfPeople: '' });
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.tabIconDefault} />
                </TouchableOpacity>
              </View>
              
              {errors.numberOfPeople ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.numberOfPeople}</Text>
              ) : (
                <Text style={[styles.helpText, { color: colors.tabIconDefault }]}>
                  Tối đa {tour.maxGroupSize} người
                </Text>
              )}
            </View>

            {/* Thông tin liên hệ */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin liên hệ</Text>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Họ và tên</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      borderColor: errors.contactName ? colors.error : colors.border,
                      color: colors.text,
                      backgroundColor: colors.cardBackground
                    }
                  ]}
                  value={contactName}
                  onChangeText={(text) => {
                    setContactName(text);
                    setErrors({ ...errors, contactName: '' });
                  }}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor={colors.tabIconDefault}
                />
                {errors.contactName ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.contactName}</Text>
                ) : null}
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Số điện thoại</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      borderColor: errors.contactPhone ? colors.error : colors.border,
                      color: colors.text,
                      backgroundColor: colors.cardBackground
                    }
                  ]}
                  value={contactPhone}
                  onChangeText={(text) => {
                    setContactPhone(text);
                    setErrors({ ...errors, contactPhone: '' });
                  }}
                  keyboardType="phone-pad"
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={colors.tabIconDefault}
                />
                {errors.contactPhone ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.contactPhone}</Text>
                ) : null}
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { 
                      borderColor: errors.contactEmail ? colors.error : colors.border,
                      color: colors.text,
                      backgroundColor: colors.cardBackground
                    }
                  ]}
                  value={contactEmail}
                  onChangeText={(text) => {
                    setContactEmail(text);
                    setErrors({ ...errors, contactEmail: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Nhập email"
                  placeholderTextColor={colors.tabIconDefault}
                />
                {errors.contactEmail ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.contactEmail}</Text>
                ) : null}
              </View>
            </View>

            {/* Yêu cầu đặc biệt */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Yêu cầu đặc biệt (nếu có)</Text>
              
              <TextInput
                style={[
                  styles.specialRequestsInput,
                  { 
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.cardBackground
                  }
                ]}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                multiline
                numberOfLines={4}
                placeholder="Nhập yêu cầu đặc biệt của bạn (nếu có)..."
                placeholderTextColor={colors.tabIconDefault}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar with Total Price and Book Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.totalPriceLabel, { color: colors.tabIconDefault }]}>Tổng cộng</Text>
          <Text style={[styles.totalPrice, { color: colors.tint }]}>
            {calculateTotalPrice().toLocaleString('vi-VN')}đ
          </Text>
          <Text style={[styles.priceDetails, { color: colors.tabIconDefault }]}>
            {(tour.priceDiscount || tour.price).toLocaleString('vi-VN')}đ x {numberOfPeople} người
          </Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#f0ad4e' }]}
              onPress={async () => {
                if (!tour || !selectedDate) {
                  Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày khởi hành');
                  return;
                }
                
                try {
                  const testResponse = await bookingsApi.testTourBooking(
                    tourId, 
                    selectedDate, 
                    parseInt(numberOfPeople)
                  );
                  
                  console.log('Kết quả kiểm tra tour:', testResponse);
                  
                  if (testResponse.success) {
                    Alert.alert(
                      'Kiểm tra thành công', 
                      'Tour khả dụng và có thể đặt cho ngày đã chọn'
                    );
                  } else {
                    Alert.alert('Không thể đặt tour', testResponse.message || 'Vui lòng kiểm tra lại thông tin');
                  }
                } catch (error) {
                  console.error('Lỗi khi test tour:', error);
                  Alert.alert('Lỗi kiểm tra', 'Có lỗi xảy ra khi kiểm tra khả dụng của tour');
                }
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                Kiểm tra
              </Text>
            </TouchableOpacity>
          )}
          
          <Button
            title="Xác nhận đặt tour"
            onPress={handleBookTour}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            size="medium"
            style={styles.bookButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// Hàm lấy màu dựa vào độ khó
const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'dễ':
      return '#4CAF50';
    case 'trung bình':
      return '#FF9800';
    case 'khó':
      return '#F44336';
    default:
      return '#4CAF50';
  }
};

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
  tourCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tourHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tourName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  tourImage: {
    width: '100%',
    height: 180,
  },
  tourHighlights: {
    padding: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightText: {
    marginLeft: 8,
    fontSize: 14,
  },
  tourInfoDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  tourPriceInfo: {
    padding: 16,
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
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  savingPrice: {
    fontSize: 14,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  availableDatesContainer: {
    marginTop: 8,
  },
  availableDateItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  peopleCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleCountInput: {
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  specialRequestsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  priceContainer: {
    flex: 1,
  },
  totalPriceLabel: {
    fontSize: 12,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  priceDetails: {
    fontSize: 12,
  },
  bookButton: {
    width: 160,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testButton: {
    padding: 12,
    borderRadius: 8,
  },
}); 