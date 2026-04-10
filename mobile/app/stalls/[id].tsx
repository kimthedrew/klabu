import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../lib/api';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
}

interface StallDetail {
  id: string;
  name: string;
  description?: string;
  averageRating: number;
  reviewCount: number;
  menuItems: MenuItem[];
  stallOwner: { fullName: string; mpesaNumber?: string };
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function StallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [stall, setStall] = useState<StallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryLocation: '',
    roomNumber: '',
    mpesaPayerName: '',
  });
  const [deliveryFee, setDeliveryFee] = useState(50);

  useEffect(() => {
    const fetchStall = async () => {
      try {
        const [stallRes, feeRes] = await Promise.all([
          api.get(`/stalls/${id}`),
          api.get('/orders/delivery-config'),
        ]);
        setStall(stallRes.data);
        setDeliveryFee(feeRes.data.deliveryFee);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStall();
  }, [id]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.menuItem.id !== itemId);
      return prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    const { customerName, customerPhone, deliveryLocation, mpesaPayerName } = form;
    if (!customerName || !customerPhone || !deliveryLocation || !mpesaPayerName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/orders', {
        stallId: id,
        customerName,
        customerPhone,
        deliveryLocation,
        roomNumber: form.roomNumber || undefined,
        mpesaPayerName,
        paymentMethod: 'MANUAL',
        items: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
      });
      Alert.alert('Order Placed!', `Your order has been sent to ${stall?.name}. Pay KES ${cartTotal + deliveryFee} via M-Pesa to confirm.`, [
        { text: 'OK', onPress: () => { setCheckoutVisible(false); setCart([]); router.back(); } },
      ]);
    } catch (err: any) {
      Alert.alert('Order Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />;
  if (!stall) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Stall not found</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.stallName}>{stall.name}</Text>
        {stall.description ? <Text style={styles.description}>{stall.description}</Text> : null}
        <Text style={styles.rating}>⭐ {stall.averageRating.toFixed(1)} · {stall.reviewCount} reviews</Text>

        {/* Menu */}
        <Text style={styles.sectionTitle}>Menu</Text>
        {stall.menuItems.map((item) => {
          const inCart = cart.find((c) => c.menuItem.id === item.id);
          return (
            <View key={item.id} style={styles.menuItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                {item.description ? <Text style={styles.menuItemDesc}>{item.description}</Text> : null}
                <Text style={styles.menuItemPrice}>KES {item.price}</Text>
              </View>
              <View style={styles.qtyRow}>
                {inCart ? (
                  <>
                    <Pressable style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyNum}>{inCart.quantity}</Text>
                  </>
                ) : null}
                <Pressable style={styles.addBtn} onPress={() => addToCart(item)}>
                  <Text style={styles.addBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Cart Bar */}
      {cartCount > 0 && (
        <Pressable style={styles.cartBar} onPress={() => setCheckoutVisible(true)}>
          <Text style={styles.cartBarText}>{cartCount} item{cartCount > 1 ? 's' : ''} · KES {cartTotal + deliveryFee}</Text>
          <Text style={styles.cartBarCta}>Checkout →</Text>
        </Pressable>
      )}

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Complete Your Order</Text>

          {['customerName', 'customerPhone', 'deliveryLocation', 'roomNumber', 'mpesaPayerName'].map((field) => (
            <View key={field} style={{ marginBottom: 12 }}>
              <Text style={styles.label}>
                {field === 'customerName' ? 'Your Name *' :
                 field === 'customerPhone' ? 'Phone Number *' :
                 field === 'deliveryLocation' ? 'Delivery Location *' :
                 field === 'roomNumber' ? 'Room Number (optional)' :
                 'M-Pesa Payer Name *'}
              </Text>
              <TextInput
                style={styles.input}
                value={(form as any)[field]}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [field]: v }))}
                keyboardType={field === 'customerPhone' ? 'phone-pad' : 'default'}
                placeholder={field === 'mpesaPayerName' ? 'Name on M-Pesa receipt' : ''}
                placeholderTextColor="#9ca3af"
              />
            </View>
          ))}

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {cart.map((c) => (
              <View key={c.menuItem.id} style={styles.summaryRow}>
                <Text style={styles.summaryItem}>{c.menuItem.name} × {c.quantity}</Text>
                <Text style={styles.summaryPrice}>KES {c.menuItem.price * c.quantity}</Text>
              </View>
            ))}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginTop: 4 }]}>
              <Text style={styles.summaryItem}>Delivery Fee</Text>
              <Text style={styles.summaryPrice}>KES {deliveryFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryItem, { fontWeight: '700' }]}>Total</Text>
              <Text style={[styles.summaryPrice, { fontWeight: '700', color: '#f97316' }]}>KES {cartTotal + deliveryFee}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.button, submitting && { opacity: 0.6 }]}
            onPress={placeOrder}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Place Order</Text>}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => setCheckoutVisible(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 56, paddingBottom: 100 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#f97316', fontWeight: '600', fontSize: 15 },
  stallName: { fontSize: 26, fontWeight: '800', color: '#111827' },
  description: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  rating: { fontSize: 13, color: '#9ca3af', marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuItemDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  menuItemPrice: { fontSize: 14, color: '#f97316', fontWeight: '700', marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: '#374151', lineHeight: 22 },
  qtyNum: { fontSize: 15, fontWeight: '700', color: '#111827' },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24 },
  cartBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cartBarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cartBarCta: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { padding: 24, paddingTop: 32, paddingBottom: 48 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  summary: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginVertical: 20 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryItem: { fontSize: 13, color: '#374151' },
  summaryPrice: { fontSize: 13, color: '#374151' },
  button: { backgroundColor: '#f97316', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#6b7280', fontSize: 14 },
});
