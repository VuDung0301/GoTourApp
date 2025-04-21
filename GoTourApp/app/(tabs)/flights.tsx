import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { flightsApi } from '@/lib/api';
import { Flight } from '@/types';
import { FlightCard } from '@/components/FlightCard';

export default function FlightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  // Lọc theo thành phố đi/đến
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');

  useEffect(() => {
    fetchFlights();
  }, []);

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const response = await flightsApi.getAll({ limit: 20 });
      if (response.success && response.data) {
        setFlights(response.data.flights || []);
        console.log('Đã tải được', response.data.flights.length, 'chuyến bay');
      } else {
        console.error('Lỗi khi tải danh sách chuyến bay:', response.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách chuyến bay:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchFlights = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (departureCity) params.departureCity = departureCity;
      if (arrivalCity) params.arrivalCity = arrivalCity;
      
      const response = await flightsApi.searchFlights(params);
      
      if (response.success && response.data) {
        setFlights(response.data);
      } else {
        console.error('Lỗi khi tìm kiếm chuyến bay:', response.message);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm chuyến bay:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFlights = searchQuery.length > 0
    ? flights.filter(flight => {
        const query = searchQuery.toLowerCase();
        return (
          flight.departureCity.toLowerCase().includes(query) ||
          flight.arrivalCity.toLowerCase().includes(query) ||
          flight.airline.toLowerCase().includes(query) ||
          flight.flightNumber.toLowerCase().includes(query)
        );
      })
    : flights;

  const renderFlightItem = ({ item }: { item: Flight }) => (
    <FlightCard
      flight={item}
      style={{ marginBottom: 12 }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          title: 'Chuyến bay',
          headerShown: true,
        }}
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="search" size={20} color={colors.tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm chuyến bay..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setFilterVisible(!filterVisible)}>
            <Ionicons 
              name="options" 
              size={20} 
              color={filterVisible ? colors.tint : colors.tabIconDefault} 
            />
          </TouchableOpacity>
        </View>

        {filterVisible && (
          <View style={[styles.filterContainer, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Điểm đi</Text>
              <TextInput
                style={[styles.filterInput, { color: colors.text, backgroundColor: colors.background }]}
                placeholder="Nhập thành phố..."
                placeholderTextColor={colors.tabIconDefault}
                value={departureCity}
                onChangeText={setDepartureCity}
              />
            </View>
            
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Điểm đến</Text>
              <TextInput
                style={[styles.filterInput, { color: colors.text, backgroundColor: colors.background }]}
                placeholder="Nhập thành phố..."
                placeholderTextColor={colors.tabIconDefault}
                value={arrivalCity}
                onChangeText={setArrivalCity}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: colors.tint }]}
              onPress={searchFlights}
            >
              <Text style={styles.searchButtonText}>Tìm kiếm</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : filteredFlights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="airplane-outline" size={64} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Không tìm thấy chuyến bay nào phù hợp
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFlights}
          renderItem={renderFlightItem}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={styles.flightsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  filterInput: {
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  searchButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  flightsList: {
    padding: 16,
  },
}); 