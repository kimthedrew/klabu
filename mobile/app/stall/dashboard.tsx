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

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#fbbf24',
  CONFIRMED: '#3b82f6',
  PREPARING: '#8b5cf6',
  READY_FOR_DELIVERY: '#10b981',
  DELIVERED: '#6b7280',
  CANCELLED: '#ef4444',
};

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY_FOR_DELIVERY',
};

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  totalAmount: number;
  deliveryFee: number;
  status: string;
  paymentStatus: string;
  mpesaPayerName?: string;
  createdAt: string;
  items: { menuItem: { name: string }; quantity: number; price: number }[];
}

export default function StallDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/stall/my-orders?limit=20');
      setOrders(res.data.orders);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const stallId = user?.profile?.stall?.id;
    if (!stallId) return;

    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join-stall', stallId);
    socket.on('new-order', () => fetchOrders());
    socket.on('payment-confirmed', () => fetchOrders());

    return () => { socket.disconnect(); };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const confirmPayment = async (orderId: string) => {
    Alert.prompt('Confirm Payment', 'Enter M-Pesa payer name', async (name) => {
      if (!name) return;
      try {
        await api.post(`/orders/${orderId}/confirm-payment`, { mpesaPayerName: name });
        fetchOrders();
      } catch (err: any) {
        Alert.alert('Error', err.message);
      }
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const total = item.totalAmount + item.deliveryFee;
    const nextStatus = NEXT_STATUS[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <Text style={styles.meta}>{item.deliveryLocation}</Text>
        <Text style={styles.meta}>{item.customerPhone}</Text>

        {item.items.map((i, idx) => (
          <Text key={idx} style={styles.orderItem}>{i.menuItem.name} × {i.quantity}</Text>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>KES {total}</Text>
        </View>

        <View style={styles.actions}>
          {item.paymentStatus === 'PENDING' && (
            <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => confirmPayment(item.id)}>
              <Text style={styles.actionBtnText}>Confirm Payment</Text>
            </Pressable>
          )}
          {nextStatus && item.paymentStatus === 'CONFIRMED' && (
            <Pressable style={[styles.actionBtn, { backgroundColor: '#f97316' }]} onPress={() => updateStatus(item.id, nextStatus)}>
              <Text style={styles.actionBtnText}>Mark {nextStatus.replace('_', ' ')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Orders</Text>
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
          ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  orderItem: { fontSize: 13, color: '#374151', marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
