import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput as RNTextInput,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hotelsApi } from '@/lib/api';
import { Hotel } from '@/types';

export default function HotelsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<any[]>([]);
  const [featuredHotels, setFeaturedHotels] = useState<any[]>([]);
  const [popularCities, setPopularCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tải dữ liệu khi màn hình được hiển thị
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Tải dữ liệu khi thay đổi bộ lọc
  useEffect(() => {
    if (selectedCity) {
      fetchHotelsByCity(selectedCity);
    } else if (selectedCategory) {
      fetchHotelsByCategory(selectedCategory);
    } else {
      fetchFeaturedHotels();
    }
  }, [selectedCity, selectedCategory]);

  // Hàm tải dữ liệu ban đầu
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchFeaturedHotels(),
        fetchPopularCities(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tải khách sạn nổi bật
  const fetchFeaturedHotels = async () => {
    try {
      const response = await hotelsApi.getFeaturedHotels();
      if (response.success && response.data) {
        setFeaturedHotels(response.data);
        setHotels(response.data);
      }
    } catch (error) {
      console.error('Error fetching featured hotels:', error);
    }
  };

  // Tải danh sách thành phố phổ biến
  const fetchPopularCities = async () => {
    try {
      const response = await hotelsApi.getPopularCities();
      if (response.success && response.data) {
        setPopularCities(response.data);
      }
    } catch (error) {
      console.error('Error fetching popular cities:', error);
    }
  };

  // Tải danh mục khách sạn
  const fetchCategories = async () => {
    try {
      const response = await hotelsApi.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching hotel categories:', error);
    }
  };

  // Tải khách sạn theo thành phố
  const fetchHotelsByCity = async (city: string) => {
    setIsLoading(true);
    try {
      const response = await hotelsApi.getHotelsByCity(city);
      if (response.success && response.data) {
        setHotels(response.data);
      }
    } catch (error) {
      console.error(`Error fetching hotels by city ${city}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tải khách sạn theo danh mục
  const fetchHotelsByCategory = async (category: string) => {
    setIsLoading(true);
    try {
      const response = await hotelsApi.getHotelsByCategory(category);
      if (response.success && response.data) {
        setHotels(response.data);
      }
    } catch (error) {
      console.error(`Error fetching hotels by category ${category}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tìm kiếm khách sạn
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchFeaturedHotels();
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await hotelsApi.searchHotels(searchQuery);
      if (response.success && response.data) {
        setHotels(response.data);
        // Reset các bộ lọc
        setSelectedCity(null);
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
    // Reset các bộ lọc
    setSelectedCity(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  // Chọn thành phố
  const handleCitySelect = (city: string) => {
    if (selectedCity === city) {
      setSelectedCity(null);
    } else {
      setSelectedCity(city);
      setSelectedCategory(null);
    }
  };

  // Chọn danh mục
  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      setSelectedCity(null);
    }
  };

  // Mở chi tiết khách sạn
  const handleHotelPress = (hotelId: string) => {
    router.push(`/hotel/${hotelId}`);
  };

  // Render mục thành phố
  const renderCityItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.cityItem,
        selectedCity === item.city && { borderColor: colors.tint, borderWidth: 2 }
      ]}
      onPress={() => handleCitySelect(item.city)}
    >
      <Image source={{ uri: item.image }} style={styles.cityImage} />
      <View style={styles.cityOverlay}>
        <Text style={styles.cityName}>{item.city}</Text>
        <Text style={styles.hotelCount}>{item.count} khách sạn</Text>
      </View>
    </TouchableOpacity>
  );

  // Render mục danh mục
  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.name && { backgroundColor: colors.tint }
      ]}
      onPress={() => handleCategorySelect(item.name)}
    >
      <Text
        style={[
          styles.categoryName,
          selectedCategory === item.name && { color: 'white' }
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Render mục khách sạn
  const renderHotelItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.hotelCard, { backgroundColor: colors.card }]}
      onPress={() => handleHotelPress(item._id)}
    >
      <Image
        source={{ uri: item.coverImage || item.images?.[0] }}
        style={styles.hotelImage}
      />
      <View style={styles.hotelInfo}>
        <Text style={[styles.hotelName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        
        <View style={styles.locationRow}>
          <IconSymbol name="location" size={14} color={colors.tint} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.address}, {item.city}
          </Text>
        </View>
        
        <View style={styles.starsRow}>
          {Array(Math.floor(item.stars || 0)).fill(0).map((_, i) => (
            <IconSymbol key={i} name="star.fill" size={14} color="#FFD700" />
          ))}
        </View>
        
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.tint }]}>
            {item.pricePerNight?.toLocaleString('vi-VN')}đ
          </Text>
          <Text style={[styles.perNight, { color: colors.textSecondary }]}>
            /đêm
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Khách sạn',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Đang tải dữ liệu...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          title: 'Khách sạn',
          headerShown: true,
        }}
      />
      
      <FlatList
        data={hotels}
        renderItem={renderHotelItem}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Ô tìm kiếm */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
              <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground }]}>
                <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                <RNTextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Tìm kiếm khách sạn..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Thành phố phổ biến */}
            {popularCities.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Thành phố phổ biến
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.citiesContainer}
                >
                  {popularCities.map((city, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.cityItem,
                        selectedCity === city.city && { borderColor: colors.tint, borderWidth: 2 }
                      ]}
                      onPress={() => handleCitySelect(city.city)}
                    >
                      <Image source={{ uri: city.image }} style={styles.cityImage} />
                      <View style={styles.cityOverlay}>
                        <Text style={styles.cityName}>{city.city}</Text>
                        <Text style={styles.hotelCount}>{city.count} khách sạn</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Danh mục khách sạn */}
            {categories.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Loại khách sạn
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  {categories.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.categoryItem,
                        selectedCategory === category.name && { backgroundColor: colors.tint }
                      ]}
                      onPress={() => handleCategorySelect(category.name)}
                    >
                      <Text
                        style={[
                          styles.categoryName,
                          selectedCategory === category.name && { color: 'white' }
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Tiêu đề danh sách */}
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                {selectedCity
                  ? `Khách sạn tại ${selectedCity}`
                  : selectedCategory
                  ? `Khách sạn ${selectedCategory}`
                  : 'Khách sạn nổi bật'}
              </Text>
              <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                {hotels.length} kết quả
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="bed.double" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Không tìm thấy khách sạn nào
            </Text>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.tint }]}
              onPress={handleRefresh}
            >
              <Text style={styles.resetButtonText}>Làm mới</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  searchContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 16,
    paddingVertical: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  citiesContainer: {
    paddingRight: 16,
  },
  cityItem: {
    width: 150,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  cityName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hotelCount: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsCount: {
    fontSize: 14,
  },
  hotelCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hotelImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  hotelInfo: {
    padding: 12,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  perNight: {
    fontSize: 14,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '500',
  },
}); 