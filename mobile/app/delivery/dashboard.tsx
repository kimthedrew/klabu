import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../lib/config';

interface DeliveryOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  roomNumber?: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryTier: string;
  status: string;
  stall: { name: string };
  items: { menuItem: { name: string }; quantity: number }[];
}

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/deliveries/my-deliveries');
      setOrders(res.data.deliveries ?? res.data.orders ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    const dpId = user?.profile?.id;
    if (dpId) {
      socket.emit('join-delivery', dpId);
      socket.on('delivery-assigned', () => fetchOrders());
      socket.on('order-status-updated', () => fetchOrders());
    }

    return () => { socket.disconnect(); };
  }, []);

  const markDelivered = async (orderId: string) => {
    try {
      await api.post(`/deliveries/${orderId}/complete`);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const renderOrder = ({ item }: { item: DeliveryOrder }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.stallName}>{item.stall.name}</Text>
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, item.deliveryTier === 'FAST' ? styles.tierFast : styles.tierSlow]}>
            <Text style={styles.tierText}>{item.deliveryTier === 'FAST' ? '⚡ Fast' : '📦 Standard'}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.customerName}>{item.customerName} · {item.customerPhone}</Text>
      <Text style={styles.location}>📍 {item.deliveryLocation}{item.roomNumber ? ` · Room ${item.roomNumber}` : ''}</Text>

      {item.items.map((i, idx) => (
        <Text key={idx} style={styles.orderItem}>{i.menuItem.name} × {i.quantity}</Text>
      ))}

      <Text style={styles.total}>KES {item.totalAmount + item.deliveryFee}</Text>

      {item.status === 'OUT_FOR_DELIVERY' && (
        <Pressable style={styles.deliverBtn} onPress={() => markDelivered(item.id)}>
          <Text style={styles.deliverBtnText}>Mark as Delivered</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Deliveries</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>No deliveries assigned.</Text>}
          onRefresh={fetchOrders}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '800', color: '#111827' },
  logoutText: { color: '#ef4444', fontWeight: '600' },
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  stallName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  tierRow: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  tierBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tierFast: { backgroundColor: '#fffbeb' },
  tierSlow: { backgroundColor: '#eff6ff' },
  tierText: { fontSize: 11, fontWeight: '700' },
  badge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#d97706', fontWeight: '700' },
  customerName: { fontSize: 13, color: '#374151', marginBottom: 2 },
  location: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  orderItem: { fontSize: 13, color: '#374151', marginBottom: 2 },
  total: { fontSize: 15, fontWeight: '700', color: '#f97316', marginTop: 8 },
  deliverBtn: { backgroundColor: '#10b981', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  deliverBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
