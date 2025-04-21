import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Hotel } from '../types';
import { theme } from '../theme';
import { formatCurrency } from '../utils/formatters';

interface HotelCardProps {
  hotel: Hotel;
  onPress: () => void;
}

const { width } = Dimensions.get('window');

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onPress }) => {
  // Lấy ảnh đại diện từ gallery (ảnh đầu tiên)
  const thumbnailImage = hotel.gallery && hotel.gallery.length > 0 
    ? hotel.gallery[0] 
    : 'https://via.placeholder.com/300x200/eee?text=No+Image';

  // Tạo chuỗi hiển thị cho tiện ích
  const amenities = hotel.amenities?.slice(0, 3).join(' • ');
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.card}>
        <Image 
          source={{ uri: thumbnailImage }} 
          style={styles.image}
          resizeMode="cover"
        />
        
        {hotel.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{hotel.category}</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={theme.colors.warning} />
              <Text style={styles.rating}>
                {hotel.rating ? hotel.rating.toFixed(1) : '0'} 
                {hotel.reviewCount ? ` (${hotel.reviewCount})` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color={theme.colors.grey} />
            <Text style={styles.location} numberOfLines={1}>
              {hotel.address}, {hotel.city}
            </Text>
          </View>

          {amenities && (
            <View style={styles.amenitiesRow}>
              <Text style={styles.amenitiesText} numberOfLines={1}>
                {amenities}
              </Text>
            </View>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.price}>
              {formatCurrency(hotel.pricePerNight)} <Text style={styles.night}>/đêm</Text>
            </Text>
            {hotel.discount && hotel.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>Giảm {hotel.discount}%</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.grey,
    flex: 1,
  },
  amenitiesRow: {
    marginBottom: 8,
  },
  amenitiesText: {
    fontSize: 14,
    color: theme.colors.grey,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  night: {
    fontSize: 14,
    fontWeight: 'normal',
    color: theme.colors.grey,
  },
  discountBadge: {
    backgroundColor: theme.colors.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HotelCard; 