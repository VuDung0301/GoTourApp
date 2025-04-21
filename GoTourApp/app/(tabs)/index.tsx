import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Alert
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TextInput } from '@/components/ui/TextInput'; // Đảm bảo import TextInput
import { Colors, CategoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TourCard } from '@/components/TourCard';
import { HotelCard } from '@/components/HotelCard'; // *** THÊM IMPORT HOTEL CARD ***
import { useAuth } from '@/hooks/useAuth';
import { toursApi, hotelsApi } from '@/lib/api'; // *** THÊM hotelsApi ***
import { Tour, Hotel } from '@/types'; // *** THÊM Hotel type ***
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

// Dữ liệu cho danh mục khám phá
const exploreCategories = [
  { id: '1', title: 'Tour', icon: 'map', route: '/explore', color: CategoryColors.tour },
  { id: '2', title: 'Chuyến bay', icon: 'airplane', route: '/(tabs)/flights', color: CategoryColors.flight }, // Sửa lại route nếu cần
  { id: '3', title: 'Khách sạn', icon: 'house', route: '/hotels', color: CategoryColors.hotel },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width } = useWindowDimensions();
  const { user } = useAuth(); // Bỏ isAuthenticated vì chỉ dùng user
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [suggestedHotels, setSuggestedHotels] = useState<Hotel[]>([]); // *** THÊM STATE KHÁCH SẠN ***
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true); // *** THÊM STATE LOADING KHÁCH SẠN ***
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoadingTours(true);
    setIsLoadingHotels(true); // *** BẮT ĐẦU LOADING KHÁCH SẠN ***

    try {
      // Sử dụng Promise.all để tải song song
      const [toursResponse, hotelsResponse] = await Promise.all([
        toursApi.getFeaturedTours({ limit: 5 }), // Lấy tour nổi bật
        hotelsApi.getFeaturedHotels({ limit: 5 }) // *** LẤY KHÁCH SẠN ĐỀ XUẤT ***
      ]);

      // Xử lý tours
      if (toursResponse.success && toursResponse.data?.tours) {
        setFeaturedTours(toursResponse.data.tours);
      } else {
        console.error('Lỗi khi tải dữ liệu tour:', toursResponse.message);
        setFeaturedTours([]);
      }

      // *** XỬ LÝ KHÁCH SẠN ***
      if (hotelsResponse.success && hotelsResponse.data) {
        // Kiểm tra xem hotelsResponse.data có phải là mảng không
        if (Array.isArray(hotelsResponse.data)) {
          setSuggestedHotels(hotelsResponse.data);
        } else if (hotelsResponse.data.hotels && Array.isArray(hotelsResponse.data.hotels)) {
          // Nếu dữ liệu nằm trong thuộc tính 'hotels'
          setSuggestedHotels(hotelsResponse.data.hotels);
        } else {
          console.error('Dữ liệu khách sạn không đúng định dạng:', hotelsResponse.data);
          setSuggestedHotels([]);
        }
      } else {
        console.error('Lỗi khi tải dữ liệu khách sạn:', hotelsResponse.message);
        setSuggestedHotels([]);
      }


    } catch (error) {
      console.error('Lỗi khi tải dữ liệu ban đầu:', error);
      setFeaturedTours([]);
      setSuggestedHotels([]); // *** Đặt lại khách sạn nếu lỗi ***
    } finally {
      setIsLoadingTours(false);
      setIsLoadingHotels(false); // *** KẾT THÚC LOADING KHÁCH SẠN ***
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  };

  // Xử lý tìm kiếm
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Chuyển sang trang Explore với tham số tìm kiếm
      // (Giả sử trang Explore xử lý được cả tìm kiếm tour, khách sạn,...)
      router.push({
        pathname: '/explore', // Hoặc một trang tìm kiếm chung nếu có
        params: { search: searchQuery }
      });
    }
  };

  // Xử lý khi nhấn vào danh mục khám phá
  const handleCategoryPress = (route: string) => {
    if (route) {
      router.push(route);
    }
  };

  // Xử lý khi nhấn vào "Xem tất cả" tours
  const handleViewAllTours = () => {
    router.push('/explore'); // Chuyển đến trang khám phá tour
  };

  // *** Xử lý khi nhấn vào "Xem tất cả" hotels ***
  const handleViewAllHotels = () => {
    router.push('/hotels'); // Chuyển đến trang danh sách khách sạn
  };


  // Xử lý khi nhấn vào avatar hoặc thông tin người dùng
  const handleProfilePress = () => {
    router.push('/(tabs)/account'); // Chuyển đến tab Tài khoản
  };

  // Render các mục khám phá
  const renderExploreItem = ({ item }: { item: typeof exploreCategories[0] }) => (
    <TouchableOpacity
      style={styles.exploreItem}
      onPress={() => handleCategoryPress(item.route)}
    >
      <View style={[styles.exploreIconContainer, { backgroundColor: item.color + '20' }]}>
        <IconSymbol name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={[styles.exploreTitle, { color: colors.text }]}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Render tour card
  const renderTourItem = ({ item }: { item: Tour }) => (
    <TourCard tour={item} style={{ marginRight: 16 }} /> // Thêm marginRight
  );

  // *** Render hotel card ***
  const renderHotelItem = ({ item }: { item: Hotel }) => (
    <HotelCard hotel={item} style={{ marginRight: 16 }} /> // Thêm marginRight
  );


  // Render loading skeleton chung
  const renderSkeletonCard = (isHotel = false) => (
    <View style={[styles.skeletonCard, { backgroundColor: colors.cardBackground, marginRight: 16 }]}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.tabIconDefault + '30' }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonTitle, { backgroundColor: colors.tabIconDefault + '30' }]} />
        <View style={[styles.skeletonText, { backgroundColor: colors.tabIconDefault + '30' }]} />
        <View style={[styles.skeletonText, { backgroundColor: colors.tabIconDefault + '30', width: '60%' }]} />
      </View>
    </View>
  );


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header với thông tin user và tìm kiếm */}
        <View style={styles.header}>
          <View style={styles.userInfoContainer}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {user ? `Xin chào, ${user.name.split(' ')[0]}!` : 'Xin chào!'}
            </Text>
            <Text style={[styles.subgreeting, { color: colors.tabIconDefault }]}>
              Khám phá chuyến đi mơ ước của bạn
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.tabIconDefault} style={styles.searchIcon} />
            <TextInput
              placeholder="Tìm kiếm tour, khách sạn,..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]} // Thêm style color
              placeholderTextColor={colors.tabIconDefault} // Thêm placeholderTextColor
              onSubmitEditing={handleSearch} // Thêm onSubmitEditing
              returnKeyType="search" // Thêm returnKeyType
            />
            {searchQuery.length > 0 && ( // Nút xóa tìm kiếm
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.tabIconDefault} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* *** THÊM ẢNH HEADER *** */}
        <View style={styles.headerImageContainer}>
          <Image
            source={{ uri: "https://placehold.co/600x200/0366d6/FFF?text=Ảnh+Header+Du+Lịch" }} // Thay bằng ảnh của bạn
            style={styles.headerImage}
            resizeMode="cover"
          />
          {/* Có thể thêm text hoặc overlay lên ảnh nếu muốn */}
        </View>


        {/* Các mục khám phá nhanh */}
        <View style={styles.exploreSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16 }]}>Danh Mục</Text>
          <FlatList
            data={exploreCategories}
            renderItem={renderExploreItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exploreCategoriesContainer}
          />
        </View>

        {/* Tour nổi bật */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tour nổi bật</Text>
            <TouchableOpacity onPress={handleViewAllTours}>
              <Text style={[styles.viewAll, { color: colors.tint }]}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {isLoadingTours ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toursContainer}>
              {[1, 2].map((i) => renderSkeletonCard(false))}
            </ScrollView>
          ) : featuredTours.length > 0 ? (
            <FlatList
              data={featuredTours}
              renderItem={renderTourItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toursContainer}
              // snapToInterval={width * 0.85 + 16} // Điều chỉnh snap nếu cần
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.tabIconDefault }}>
                Không có tour nào khả dụng
              </Text>
            </View>
          )}
        </View>

        {/* *** KHÁCH SẠN ĐỀ XUẤT *** */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Khách Sạn Đề Xuất</Text>
            <TouchableOpacity onPress={handleViewAllHotels}>
              <Text style={[styles.viewAll, { color: colors.tint }]}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {isLoadingHotels ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toursContainer}>
              {[1, 2].map((i) => renderSkeletonCard(true))}
            </ScrollView>
          ) : suggestedHotels.length > 0 ? (
            <FlatList
              data={suggestedHotels}
              renderItem={renderHotelItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.toursContainer} // Sử dụng lại style tương tự tour
              // snapToInterval={width * 0.85 + 16} // Điều chỉnh snap nếu cần
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.tabIconDefault }}>
                Không có khách sạn nào khả dụng
              </Text>
            </View>
          )}
        </View>


        {/* --- PHẦN CHUYẾN BAY ĐÃ BỊ XÓA --- */}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30, // Tăng padding dưới để tránh bị che khuất
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20, // Giảm paddingTop nếu không cần Safe Area View
    marginBottom: 10, // Giảm marginBottom
  },
  userInfoContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 22, // Giảm kích thước chữ
    fontWeight: 'bold',
    marginBottom: 2, // Giảm marginBottom
  },
  subgreeting: {
    fontSize: 14, // Giảm kích thước chữ
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 12, // Thêm marginLeft
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16, // Giảm marginBottom
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25, // Bo tròn nhiều hơn
    paddingHorizontal: 15, // Tăng padding ngang
    height: 50, // Tăng chiều cao
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14, // Giảm kích thước chữ
    height: '100%', // Đảm bảo input chiếm hết chiều cao
  },
  clearButton: {
    paddingLeft: 10,
  },
  headerImageContainer: {
    marginHorizontal: 16,
    marginBottom: 20, // Tăng khoảng cách dưới ảnh
    borderRadius: 12, // Bo góc ảnh
    overflow: 'hidden', // Đảm bảo bo góc được áp dụng
  },
  headerImage: {
    width: '100%',
    height: 180, // Điều chỉnh chiều cao ảnh nếu cần
  },
  exploreSection: {
    marginBottom: 20, // Tăng khoảng cách
  },
  exploreCategoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10, // Thêm padding dọc
  },
  exploreItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 75, // Tăng chiều rộng một chút
  },
  exploreIconContainer: {
    width: 55, // Tăng kích thước icon container
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  exploreTitle: {
    fontSize: 13, // Giảm kích thước chữ
    textAlign: 'center',
    marginTop: 4, // Thêm marginTop
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12, // Giảm marginBottom
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500', // Đậm hơn một chút
  },
  toursContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    height: 250, // Chiều cao cố định khi loading
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    width: width * 0.85, // Chiều rộng bằng TourCard
    height: 350, // Chiều cao tương đối
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  skeletonImage: {
    height: 180,
    width: '100%',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    height: 20,
    borderRadius: 4,
    marginBottom: 12,
    width: '80%', // Rút ngắn chiều rộng
  },
  skeletonText: {
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
    width: '90%', // Rút ngắn chiều rộng
  },
});

