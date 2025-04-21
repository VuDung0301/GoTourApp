import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/hooks/useAuth';
import { hotelsApi } from '@/lib/api';
import MapView, { Marker } from 'react-native-maps';
import { format, parseISO, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function HotelDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = Dimensions.get('window');
  const { isAuthenticated, user } = useAuth();
  
  // State
  const [hotel, setHotel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Thiết lập ngày mặc định cho đặt phòng
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const [bookingDates, setBookingDates] = useState({
    checkIn: format(today, 'yyyy-MM-dd'),
    checkOut: format(tomorrow, 'yyyy-MM-dd'),
    guests: 2
  });
  
  // Tải dữ liệu khách sạn
  useEffect(() => {
    fetchHotelDetails();
  }, [id]);
  
  const fetchHotelDetails = async () => {
    setIsLoading(true);
    try {
      const response = await hotelsApi.getById(id as string);
      
      if (response.success && response.data) {
        setHotel(response.data);
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin khách sạn');
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin khách sạn:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải thông tin khách sạn');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Xử lý khi đặt phòng
  const handleBookNow = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Thông báo',
        'Vui lòng đăng nhập để đặt phòng',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }
    
    // Chuyển trực tiếp đến trang đặt phòng với thông tin cơ bản của khách sạn
    router.push({
      pathname: '/booking/hotel',
      params: {
        hotelId: hotel._id,
        roomId: 'default',
        roomName: 'Phòng tiêu chuẩn',
        price: hotel.priceDiscount || hotel.pricePerNight,
        checkIn: bookingDates.checkIn,
        checkOut: bookingDates.checkOut,
        guests: bookingDates.guests.toString(),
        skipRoomSelection: 'true' // Đánh dấu rằng người dùng đã bỏ qua bước chọn phòng
      }
    });
  };
  
  // Render ảnh khách sạn
  const renderHotelImage = ({ item, index }: { item: string, index: number }) => (
    <Image 
      source={{ uri: item }} 
      style={{ width, height: 250 }}
      resizeMode="cover"
    />
  );
  
  // Render tiện nghi
  const renderFacilityItem = ({ item, index }: { item: string, index: number }) => (
    <View style={styles.facilityItem}>
      <IconSymbol name={getIconForAmenity(item)} size={24} color={colors.tint} />
      <Text style={[styles.facilityName, { color: colors.text }]}>{item}</Text>
    </View>
  );
  
  // Lấy biểu tượng phù hợp cho tiện nghi
  const getIconForAmenity = (amenity: string) => {
    const amenityIcons = {
      'wifi': 'wifi',
      'hồ bơi': 'water.waves',
      'đậu xe': 'car',
      'ăn sáng': 'fork.knife',
      'phòng tập': 'dumbbell',
      'nhà hàng': 'fork.knife',
      'spa': 'drop',
      'điều hòa': 'thermometer',
      'minibar': 'wineglass',
      'tv': 'tv',
      'bồn tắm': 'drop.fill',
      'ban công': 'door.left.hand.open',
      'bãi biển': 'beach.umbrella',
      'đưa đón': 'car',
      'dịch vụ phòng': 'person.fill',
      'máy giặt': 'washer'
    };
    
    const lowerCaseAmenity = amenity.toLowerCase();
    
    for (const [key, icon] of Object.entries(amenityIcons)) {
      if (lowerCaseAmenity.includes(key)) {
        return icon;
      }
    }
    
    return 'star';  // Biểu tượng mặc định
  };
  
  // Hiển thị giá theo định dạng tiền tệ Việt Nam
  const formatCurrency = (price: number) => {
    return price.toLocaleString('vi-VN') + 'đ';
  };
  
  // Tính giá hiển thị
  const getDisplayPrice = () => {
    if (!hotel) return '0';
    
    if (hotel.priceDiscount) {
      return formatCurrency(hotel.priceDiscount);
    }
    
    return formatCurrency(hotel.pricePerNight);
  };
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Đang tải thông tin khách sạn...</Text>
      </View>
    );
  }
  
  if (!hotel) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Không thể tải thông tin khách sạn. Vui lòng thử lại sau.
        </Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{
          headerTitle: hotel.name,
          headerBackTitle: 'Quay lại',
        }}
      />
      
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <ScrollView>
        {/* Hình ảnh khách sạn */}
        <FlatList
          data={hotel.images.length > 0 ? hotel.images : [hotel.coverImage]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderHotelImage}
          keyExtractor={(item, index) => `image_${index}`}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveImageIndex(slideIndex);
          }}
        />
        
        {/* Thanh chỉ báo trang của slideshow */}
        <View style={styles.paginationContainer}>
          {(hotel.images || [hotel.coverImage]).map((_: any, index: number) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === activeImageIndex ? colors.tint : colors.tabIconDefault,
                  width: index === activeImageIndex ? 12 : 8,
                }
              ]}
            />
          ))}
        </View>
        
        <View style={styles.contentContainer}>
          {/* Thông tin cơ bản */}
          <View style={styles.headerContainer}>
            <Text style={[styles.hotelName, { color: colors.text }]}>{hotel.name}</Text>
            <View style={styles.ratingContainer}>
              <IconSymbol name="star.fill" size={16} color="#FFD700" />
              <Text style={[styles.ratingText, { color: colors.text }]}>{hotel.ratingsAverage || 4.5}</Text>
              <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>
                ({hotel.ratingsQuantity || 0} đánh giá)
              </Text>
            </View>
            
            <View style={styles.locationContainer}>
              <IconSymbol name="location.fill" size={16} color={colors.tint} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {hotel.address}, {hotel.city}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            {hotel.priceDiscount && (
              <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
                {hotel.pricePerNight.toLocaleString('vi-VN')}đ
              </Text>
            )}
            <Text style={[styles.price, { color: colors.tint }]}>
              {(hotel.priceDiscount || hotel.pricePerNight).toLocaleString('vi-VN')}đ
            </Text>
            <Text style={[styles.perNight, { color: colors.textSecondary }]}>/đêm</Text>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mô tả</Text>
            <Text 
              style={[styles.description, { color: colors.text }]}
              numberOfLines={showFullDescription ? undefined : 3}
            >
              {hotel.description}
            </Text>
            {hotel.description.length > 150 && (
              <TouchableOpacity 
                style={styles.showMoreButton}
                onPress={() => setShowFullDescription(!showFullDescription)}
              >
                <Text style={[styles.showMoreText, { color: colors.tint }]}>
                  {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tiện nghi</Text>
            <FlatList
              data={hotel.amenities || []}
              renderItem={renderFacilityItem}
              keyExtractor={(item, index) => `${item}_${index}`}
              numColumns={3}
              scrollEnabled={false}
            />
          </View>
          
          {/* Vị trí */}
          {hotel.location && hotel.location.coordinates && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vị trí</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: hotel.location.coordinates[1] || 10.762622,
                    longitude: hotel.location.coordinates[0] || 106.660172,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: hotel.location.coordinates[1] || 10.762622,
                      longitude: hotel.location.coordinates[0] || 106.660172,
                    }}
                    title={hotel.name}
                  />
                </MapView>
              </View>
            </View>
          )}
          
          {/* Thông tin khách sạn */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin khách sạn</Text>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Giờ nhận phòng:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {hotel.policies?.checkIn || '14:00'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Giờ trả phòng:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {hotel.policies?.checkOut || '12:00'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Chính sách hủy:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {hotel.policies?.cancellation || 'Miễn phí hủy trước 24 giờ. Sau đó, phí hủy là 100% giá trị đặt phòng.'}
              </Text>
            </View>
          </View>
          
          {/* Thêm một số phần thông tin khác nếu có sẵn */}
          {hotel.nearbyAttractions && hotel.nearbyAttractions.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Điểm tham quan lân cận</Text>
              {hotel.nearbyAttractions.map((attraction: any, index: number) => (
                <View key={index} style={styles.attractionItem}>
                  {attraction.image && (
                    <Image source={{ uri: attraction.image }} style={styles.attractionImage} />
                  )}
                  <View style={styles.attractionInfo}>
                    <Text style={[styles.attractionName, { color: colors.text }]}>{attraction.name}</Text>
                    <Text style={[styles.attractionDistance, { color: colors.textSecondary }]}>
                      {attraction.distance || 'Gần đó'}
                    </Text>
                    <Text style={[styles.attractionDescription, { color: colors.text }]}>
                      {attraction.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Thanh đặt phòng cố định ở dưới */}
      <View style={[styles.bookingBar, { borderTopColor: colors.border, backgroundColor: colors.cardBackground }]}>
        <View style={styles.bookingPrice}>
          <Text style={[styles.bookingPriceLabel, { color: colors.textSecondary }]}>Giá từ</Text>
          <Text style={[styles.bookingPriceValue, { color: colors.tint }]}>
            {getDisplayPrice()}
          </Text>
          <Text style={[styles.bookingPerNight, { color: colors.textSecondary }]}>/ đêm</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: colors.tint }]}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>Đặt ngay</Text>
        </TouchableOpacity>
      </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  hotelName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  ratingCount: {
    marginLeft: 4,
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  oldPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  perNight: {
    fontSize: 14,
    marginLeft: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  showMoreButton: {
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  facilityItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
    width: '33%',
  },
  facilityName: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 140,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  attractionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attractionImage: {
    width: 80,
    height: 80,
  },
  attractionInfo: {
    flex: 1,
    padding: 10,
  },
  attractionName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  attractionDistance: {
    fontSize: 12,
    marginBottom: 4,
  },
  attractionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  bookingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bookingPrice: {
    flex: 1,
  },
  bookingPriceLabel: {
    fontSize: 12,
  },
  bookingPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingPerNight: {
    fontSize: 12,
  },
  bookButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardBackground: {
    backgroundColor: '#ffffff',
  },
  roomPriceUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
}); 