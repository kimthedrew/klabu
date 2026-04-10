import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface Stall {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  averageRating: number;
  reviewCount: number;
  menuItems: MenuItem[];
}

interface StallOwnerEntry {
  id: string;
  fullName: string;
  stall: Stall;
}

export default function StallsScreen() {
  const router = useRouter();
  const [stalls, setStalls] = useState<StallOwnerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchStalls = async (query?: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      const res = await api.get('/stalls', { params });
      setStalls(res.data.stalls);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStalls();
  }, []);

  const handleSearch = () => fetchStalls(search.trim() || undefined);

  const renderStall = ({ item }: { item: StallOwnerEntry }) => {
    const { stall } = item;
    const availableCount = stall.menuItems.filter((m) => m.isAvailable).length;
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/stalls/${stall.id}`)}>
        <View style={styles.cardHeader}>
          <Text style={styles.stallName}>{stall.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Open</Text>
          </View>
        </View>
        {stall.description ? (
          <Text style={styles.description} numberOfLines={2}>{stall.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>⭐ {stall.averageRating.toFixed(1)} ({stall.reviewCount})</Text>
          <Text style={styles.meta}>{availableCount} items</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>Food Stalls</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={styles.staffLogin}>Staff Login</Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stalls or food..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Go</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#f97316" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={stalls}
          keyExtractor={(item) => item.id}
          renderItem={renderStall}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>No stalls found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingTop: 56 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: '#111827' },
  staffLogin: { fontSize: 13, color: '#f97316', fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stallName: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  description: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: '#9ca3af' },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
