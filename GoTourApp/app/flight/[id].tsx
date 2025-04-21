import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions,
  SafeAreaView,
  Alert
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { Flight } from '@/types';
import { flightsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function FlightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated } = useAuth();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<'economy' | 'business' | 'firstClass'>('economy');

  useEffect(() => {
    fetchFlightData();
  }, [id]);

  const fetchFlightData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const response = await flightsApi.getById(id);
      if (response.success && response.data) {
        setFlight(response.data);
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin chuyến bay');
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu chuyến bay:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Chưa đăng nhập',
        'Bạn cần đăng nhập để đặt vé',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đăng nhập',
            onPress: () => router.push('/(auth)/login'),
          },
        ]
      );
      return;
    }

    if (!flight) {
      Alert.alert('Lỗi', 'Không thể tải thông tin chuyến bay');
      return;
    }

    // Kiểm tra số lượng ghế trống
    const availableSeats = flight.seatsAvailable[selectedClass];
    if (!availableSeats || availableSeats <= 0) {
      Alert.alert('Thông báo', `Không còn ghế trống cho hạng ${selectedClass}`);
      return;
    }

    // Chuyển hướng đến trang đặt vé với đầy đủ thông tin
    console.log('Chuyển hướng đến đặt vé với FlightID:', flight._id);
    router.push({
      pathname: '/booking/flight',
      params: { 
        flightId: flight._id,
        class: selectedClass
      }
    });
  };

  // Format ngày giờ
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: vi });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
  };

  // Tính thời gian bay định dạng hh:mm
  const durationFormatted = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  // Lấy màu theo trạng thái chuyến bay
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đúng giờ':
        return '#4CAF50';
      case 'Trễ':
        return '#FF9800';
      case 'Hủy':
        return '#F44336';
      case 'Đã bay':
        return '#2196F3';
      default:
        return '#4CAF50';
    }
  };

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen 
        options={{
          title: `${flight.departureCity} - ${flight.arrivalCity}`,
          headerShown: true,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with airline info */}
        <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.airlineInfo}>
            <Image source={{ uri: flight.image }} style={styles.airlineLogo} />
            <View>
              <Text style={[styles.airlineName, { color: colors.text }]}>{flight.airline}</Text>
              <Text style={[styles.flightNumber, { color: colors.tabIconDefault }]}>
                Chuyến bay: {flight.flightNumber}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(flight.status) }]}>
            <Text style={styles.statusText}>{flight.status}</Text>
          </View>
        </View>

        {/* Flight Route Information */}
        <View style={[styles.routeCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.routeHeader}>
            <Text style={[styles.routeTitle, { color: colors.text }]}>Thông tin chuyến bay</Text>
          </View>
          
          <View style={styles.routeContent}>
            <View style={styles.locationContainer}>
              <Text style={[styles.time, { color: colors.text }]}>
                {formatDateTime(flight.departureTime)}
              </Text>
              <Text style={[styles.city, { color: colors.text }]}>{flight.departureCity}</Text>
              <Text style={[styles.date, { color: colors.tabIconDefault }]}>
                {formatDate(flight.departureTime)}
              </Text>
            </View>

            <View style={styles.durationContainer}>
              <Text style={[styles.duration, { color: colors.tabIconDefault }]}>
                {durationFormatted(flight.duration)}
              </Text>
              <View style={styles.flightPathContainer}>
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                <View style={[styles.line, { backgroundColor: colors.tabIconDefault }]} />
                <View style={[styles.dot, { backgroundColor: colors.tint }]} />
              </View>
              <IconSymbol name="airplane" size={16} color={colors.tabIconDefault} />
            </View>

            <View style={styles.locationContainer}>
              <Text style={[styles.time, { color: colors.text }]}>
                {formatDateTime(flight.arrivalTime)}
              </Text>
              <Text style={[styles.city, { color: colors.text }]}>{flight.arrivalCity}</Text>
              <Text style={[styles.date, { color: colors.tabIconDefault }]}>
                {formatDate(flight.arrivalTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Flight Features */}
        <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Tiện ích trên chuyến bay</Text>
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <IconSymbol 
                name="wifi" 
                size={24} 
                color={flight.features.wifi ? colors.tint : colors.tabIconDefault + '50'} 
              />
              <Text style={{ 
                color: flight.features.wifi ? colors.text : colors.tabIconDefault + '50',
                marginTop: 4 
              }}>
                WiFi
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol 
                name="fork.knife" 
                size={24} 
                color={flight.features.meals ? colors.tint : colors.tabIconDefault + '50'} 
              />
              <Text style={{ 
                color: flight.features.meals ? colors.text : colors.tabIconDefault + '50',
                marginTop: 4 
              }}>
                Bữa ăn
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol 
                name="tv" 
                size={24} 
                color={flight.features.entertainment ? colors.tint : colors.tabIconDefault + '50'} 
              />
              <Text style={{ 
                color: flight.features.entertainment ? colors.text : colors.tabIconDefault + '50',
                marginTop: 4 
              }}>
                Giải trí
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol 
                name="powerplug" 
                size={24} 
                color={flight.features.powerOutlets ? colors.tint : colors.tabIconDefault + '50'} 
              />
              <Text style={{ 
                color: flight.features.powerOutlets ? colors.text : colors.tabIconDefault + '50',
                marginTop: 4
              }}>
                Ổ điện
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <IconSymbol 
                name="usb.port.c" 
                size={24} 
                color={flight.features.usb ? colors.tint : colors.tabIconDefault + '50'} 
              />
              <Text style={{ 
                color: flight.features.usb ? colors.text : colors.tabIconDefault + '50',
                marginTop: 4
              }}>
                Cổng USB
              </Text>
            </View>
          </View>
        </View>

        {/* Seat Class Selection */}
        <View style={[styles.seatCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.seatTitle, { color: colors.text }]}>Hạng ghế</Text>
          
          <View style={styles.seatOptions}>
            {flight.seatsAvailable.economy > 0 && (
              <TouchableOpacity 
                style={[
                  styles.seatOption, 
                  selectedClass === 'economy' && [styles.selectedSeat, { borderColor: colors.tint }]
                ]}
                onPress={() => setSelectedClass('economy')}
              >
                <Text style={[
                  styles.seatClass, 
                  { color: selectedClass === 'economy' ? colors.tint : colors.text }
                ]}>
                  Phổ thông
                </Text>
                <Text style={[
                  styles.seatPrice, 
                  { color: selectedClass === 'economy' ? colors.tint : colors.text }
                ]}>
                  {flight.price.economy.toLocaleString('vi-VN')}đ
                </Text>
                <Text style={[styles.seatsLeft, { color: colors.tabIconDefault }]}>
                  Còn {flight.seatsAvailable.economy} chỗ
                </Text>
              </TouchableOpacity>
            )}
            
            {flight.seatsAvailable.business > 0 && (
              <TouchableOpacity 
                style={[
                  styles.seatOption, 
                  selectedClass === 'business' && [styles.selectedSeat, { borderColor: colors.tint }]
                ]}
                onPress={() => setSelectedClass('business')}
              >
                <Text style={[
                  styles.seatClass, 
                  { color: selectedClass === 'business' ? colors.tint : colors.text }
                ]}>
                  Thương gia
                </Text>
                <Text style={[
                  styles.seatPrice, 
                  { color: selectedClass === 'business' ? colors.tint : colors.text }
                ]}>
                  {flight.price.business.toLocaleString('vi-VN')}đ
                </Text>
                <Text style={[styles.seatsLeft, { color: colors.tabIconDefault }]}>
                  Còn {flight.seatsAvailable.business} chỗ
                </Text>
              </TouchableOpacity>
            )}
            
            {flight.seatsAvailable.firstClass > 0 && (
              <TouchableOpacity 
                style={[
                  styles.seatOption, 
                  selectedClass === 'firstClass' && [styles.selectedSeat, { borderColor: colors.tint }]
                ]}
                onPress={() => setSelectedClass('firstClass')}
              >
                <Text style={[
                  styles.seatClass, 
                  { color: selectedClass === 'firstClass' ? colors.tint : colors.text }
                ]}>
                  Hạng nhất
                </Text>
                <Text style={[
                  styles.seatPrice, 
                  { color: selectedClass === 'firstClass' ? colors.tint : colors.text }
                ]}>
                  {flight.price.firstClass.toLocaleString('vi-VN')}đ
                </Text>
                <Text style={[styles.seatsLeft, { color: colors.tabIconDefault }]}>
                  Còn {flight.seatsAvailable.firstClass} chỗ
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar with Price and Book Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: colors.tabIconDefault }]}>Tổng giá</Text>
          <Text style={[styles.price, { color: colors.tint }]}>
            {flight.price[selectedClass].toLocaleString('vi-VN')}đ
          </Text>
          <Text style={[styles.personText, { color: colors.tabIconDefault }]}>/ người</Text>
        </View>
        
        <Button
          title="Đặt vé"
          onPress={handleBookNow}
          size="medium"
          style={styles.bookButton}
          disabled={flight.status === 'Hủy' || flight.status === 'Đã bay'}
        />
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
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  airlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airlineLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  airlineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  flightNumber: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  routeHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  locationContainer: {
    alignItems: 'center',
    flex: 1,
  },
  time: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  city: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  date: {
    fontSize: 12,
    textAlign: 'center',
  },
  durationContainer: {
    alignItems: 'center',
    flex: 1,
  },
  duration: {
    fontSize: 12,
    marginBottom: 4,
  },
  flightPathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  featureCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  seatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  seatOptions: {
    flexDirection: 'column',
  },
  seatOption: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectedSeat: {
    borderWidth: 2,
  },
  seatClass: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seatPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seatsLeft: {
    fontSize: 12,
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
  priceLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  personText: {
    fontSize: 12,
  },
  bookButton: {
    width: 120,
  },
}); 