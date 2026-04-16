import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalStalls: number;
  totalOrders: number;
  totalDeliveryPersons: number;
  activeDeliveryPersons: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  roomNumber?: string;
  totalAmount: number;
  deliveryFee: number;
  status: string;
  paymentStatus: string;
  mpesaPayerName?: string;
  createdAt: string;
  stall: { id: string; name: string; stallOwner: { fullName: string; phoneNumber: string } };
  deliveryPerson?: { fullName: string; phoneNumber: string; rating: number };
  items: { id: string; quantity: number; price: number; menuItem: { name: string } }[];
}

interface TopStall {
  id: string;
  name: string;
  owner: string;
  totalOrders: number;
  averageRating: number;
}

interface StallOwnerEntry {
  id: string;
  fullName: string;
  businessName?: string;
  phoneNumber: string;
  isApproved: boolean;
  isActive: boolean;
  stall?: { id: string; name: string; isActive: boolean };
  user: { email: string };
}

interface DeliveryPerson {
  id: string;
  fullName: string;
  phoneNumber: string;
  idNumber: string;
  isApproved: boolean;
  isActive: boolean;
  rating: number;
  user: { email: string };
  _count: { deliveries: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PREPARING: '#8b5cf6',
  READY_FOR_DELIVERY: '#10b981',
  DELIVERED: '#6b7280',
  CANCELLED: '#ef4444',
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: accent }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'stalls' | 'delivery';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topStalls, setTopStalls] = useState<TopStall[]>([]);
  const [stallOwners, setStallOwners] = useState<StallOwnerEntry[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [stkEnabled, setStkEnabled] = useState(false);
  const [fastDeliveryFee, setFastDeliveryFee] = useState(50);
  const [slowDeliveryFee, setSlowDeliveryFee] = useState(30);
  const [commissionRate, setCommissionRate] = useState(33);
  const [savingFees, setSavingFees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOverview = async () => {
    const [dashRes, configRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/payment-config'),
    ]);
    setStats(dashRes.data.stats);
    setRecentOrders(dashRes.data.recentOrders);
    setTopStalls(dashRes.data.topStalls);
    const cfg = configRes.data.config;
    setStkEnabled(cfg.stkPushEnabled);
    setFastDeliveryFee(cfg.fastDeliveryFee ?? 50);
    setSlowDeliveryFee(cfg.slowDeliveryFee ?? 30);
    setCommissionRate(Math.round((cfg.commissionRate ?? 0.33) * 100));
  };

  const handleSaveDeliveryFees = async () => {
    setSavingFees(true);
    try {
      await api.patch('/admin/payment-config/delivery-fee', {
        fastDeliveryFee,
        slowDeliveryFee,
        commissionRate: commissionRate / 100,
      });
      Alert.alert('Success', 'Delivery settings updated');
    } catch {
      Alert.alert('Error', 'Failed to update delivery settings');
    } finally {
      setSavingFees(false);
    }
  };

  const fetchStalls = async () => {
    const res = await api.get('/admin/stalls?limit=100');
    setStallOwners(res.data.stalls);
  };

  const fetchDelivery = async () => {
    const res = await api.get('/admin/delivery-persons?limit=100');
    setDeliveryPersons(res.data.deliveryPersons);
  };

  const loadAll = async () => {
    try {
      await Promise.all([fetchOverview(), fetchStalls(), fetchDelivery()]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const toggleStk = async () => {
    try {
      const res = await api.patch('/admin/payment-config/stk-push', { enabled: !stkEnabled });
      setStkEnabled(res.data.config.stkPushEnabled);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const approveStallOwner = async (id: string, approved: boolean) => {
    try {
      await api.patch(`/admin/stall-owners/${id}/approve`, { approved });
      setStallOwners((prev) => prev.map((s) => s.id === id ? { ...s, isApproved: approved } : s));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const toggleStallOwner = async (id: string) => {
    try {
      const res = await api.patch(`/admin/stall-owners/${id}/toggle`);
      const updated = res.data.stallOwner;
      setStallOwners((prev) => prev.map((s) => s.id === id ? { ...s, isActive: updated.isActive } : s));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const approveDelivery = async (id: string, approved: boolean) => {
    try {
      await api.patch(`/admin/delivery-persons/${id}/approve`, { approved });
      setDeliveryPersons((prev) => prev.map((d) => d.id === id ? { ...d, isApproved: approved } : d));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const toggleDelivery = async (id: string) => {
    try {
      const res = await api.patch(`/admin/delivery-persons/${id}/toggle`);
      const updated = res.data.deliveryPerson;
      setDeliveryPersons((prev) => prev.map((d) => d.id === id ? { ...d, isActive: updated.isActive } : d));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const openOrder = async (order: RecentOrder) => {
    try {
      const res = await api.get(`/orders/${order.id}`);
      setSelectedOrder(res.data.order);
      setOrderModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Admin</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['overview', 'stalls', 'delivery'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? 'Overview' : t === 'stalls' ? 'Stalls' : 'Delivery'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {tab === 'overview' && <OverviewTab stats={stats} recentOrders={recentOrders} topStalls={topStalls} stkEnabled={stkEnabled} onToggleStk={toggleStk} onOrderPress={openOrder} fastDeliveryFee={fastDeliveryFee} slowDeliveryFee={slowDeliveryFee} commissionRate={commissionRate} onFastFeeChange={setFastDeliveryFee} onSlowFeeChange={setSlowDeliveryFee} onCommissionChange={setCommissionRate} onSaveFees={handleSaveDeliveryFees} savingFees={savingFees} />}
        {tab === 'stalls' && <StallsTab stallOwners={stallOwners} onApprove={approveStallOwner} onToggle={toggleStallOwner} />}
        {tab === 'delivery' && <DeliveryTab deliveryPersons={deliveryPersons} onApprove={approveDelivery} onToggle={toggleDelivery} />}
      </ScrollView>

      {/* Order Detail Modal */}
      <OrderModal order={selectedOrder} visible={orderModalVisible} onClose={() => { setOrderModalVisible(false); setSelectedOrder(null); }} />
    </View>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, recentOrders, topStalls, stkEnabled, onToggleStk, onOrderPress, fastDeliveryFee, slowDeliveryFee, commissionRate, onFastFeeChange, onSlowFeeChange, onCommissionChange, onSaveFees, savingFees }: {
  stats: Stats | null;
  recentOrders: RecentOrder[];
  topStalls: TopStall[];
  stkEnabled: boolean;
  onToggleStk: () => void;
  onOrderPress: (o: RecentOrder) => void;
  fastDeliveryFee: number;
  slowDeliveryFee: number;
  commissionRate: number;
  onFastFeeChange: (v: number) => void;
  onSlowFeeChange: (v: number) => void;
  onCommissionChange: (v: number) => void;
  onSaveFees: () => void;
  savingFees: boolean;
}) {
  return (
    <>
      {/* Stats */}
      <Text style={styles.sectionTitle}>Platform Stats</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total Stalls" value={stats?.totalStalls ?? 0} accent="#10b981" />
        <StatCard label="Total Orders" value={stats?.totalOrders ?? 0} accent="#3b82f6" />
        <StatCard label="Pending Orders" value={stats?.pendingOrders ?? 0} accent="#f59e0b" />
        <StatCard label="Completed" value={stats?.completedOrders ?? 0} accent="#6b7280" />
        <StatCard label="Delivery Team" value={`${stats?.activeDeliveryPersons ?? 0}/${stats?.totalDeliveryPersons ?? 0}`} accent="#8b5cf6" />
        <StatCard label="Revenue (KES)" value={(stats?.totalRevenue ?? 0).toLocaleString()} accent="#f97316" />
      </View>

      {/* Payment Settings */}
      <Text style={styles.sectionTitle}>Payment Settings</Text>
      <View style={styles.settingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>STK Push Payments</Text>
          <Text style={styles.settingDesc}>
            {stkEnabled ? 'Customers can pay via M-Pesa STK Push.' : 'Manual payment only.'}
          </Text>
        </View>
        <Switch value={stkEnabled} onValueChange={onToggleStk} trackColor={{ true: '#f97316' }} />
      </View>

      {/* Delivery Fees */}
      <Text style={[styles.settingLabel, { marginTop: 16, marginBottom: 8 }]}>Delivery Fees & Commission</Text>
      <View style={styles.feeRow}>
        <View style={styles.feeField}>
          <Text style={styles.feeLabel}>Fast Fee (KES)</Text>
          <TextInput
            style={styles.feeInput}
            keyboardType="numeric"
            value={String(fastDeliveryFee)}
            onChangeText={(t) => onFastFeeChange(Number(t) || 0)}
          />
        </View>
        <View style={styles.feeField}>
          <Text style={styles.feeLabel}>Standard Fee (KES)</Text>
          <TextInput
            style={styles.feeInput}
            keyboardType="numeric"
            value={String(slowDeliveryFee)}
            onChangeText={(t) => onSlowFeeChange(Number(t) || 0)}
          />
        </View>
        <View style={styles.feeField}>
          <Text style={styles.feeLabel}>Commission (%)</Text>
          <TextInput
            style={styles.feeInput}
            keyboardType="numeric"
            value={String(commissionRate)}
            onChangeText={(t) => onCommissionChange(Number(t) || 0)}
          />
        </View>
      </View>
      <Pressable style={[styles.saveBtn, savingFees && { opacity: 0.6 }]} onPress={onSaveFees} disabled={savingFees}>
        <Text style={styles.saveBtnText}>{savingFees ? 'Saving...' : 'Save Fee Settings'}</Text>
      </Pressable>

      {/* Recent Orders */}
      <Text style={styles.sectionTitle}>Recent Orders</Text>
      {recentOrders.slice(0, 8).map((order) => (
        <Pressable key={order.id} style={styles.orderCard} onPress={() => onOrderPress(order)}>
          <View style={styles.orderCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderCustomer}>{order.customerName}</Text>
              <Text style={styles.orderMeta}>{order.stall.name}</Text>
              <Text style={styles.orderMeta}>{order.deliveryLocation}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>{order.status.replace('_', ' ')}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: order.paymentStatus === 'CONFIRMED' ? '#dcfce7' : '#fef9c3' }]}>
                <Text style={[styles.statusText, { color: order.paymentStatus === 'CONFIRMED' ? '#16a34a' : '#a16207' }]}>{order.paymentStatus}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.orderAmount}>KES {order.totalAmount + order.deliveryFee}</Text>
        </Pressable>
      ))}
      {recentOrders.length === 0 && <Text style={styles.empty}>No orders yet.</Text>}

      {/* Top Stalls */}
      <Text style={styles.sectionTitle}>Top Stalls</Text>
      {topStalls.map((stall, i) => (
        <View key={stall.id} style={styles.topStallRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topStallName}>{stall.name}</Text>
            <Text style={styles.topStallOwner}>{stall.owner}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.topStallOrders}>{stall.totalOrders} orders</Text>
            <Text style={styles.topStallRating}>⭐ {stall.averageRating.toFixed(1)}</Text>
          </View>
        </View>
      ))}
      {topStalls.length === 0 && <Text style={styles.empty}>No stall data yet.</Text>}
    </>
  );
}

// ─── Stalls Tab ───────────────────────────────────────────────────────────────

function StallsTab({ stallOwners, onApprove, onToggle }: {
  stallOwners: StallOwnerEntry[];
  onApprove: (id: string, approved: boolean) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Stall Owners ({stallOwners.length})</Text>
      {stallOwners.map((owner) => (
        <View key={owner.id} style={styles.personCard}>
          <View style={styles.personCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{owner.fullName}</Text>
              {owner.businessName ? <Text style={styles.personMeta}>{owner.businessName}</Text> : null}
              <Text style={styles.personMeta}>{owner.user.email}</Text>
              <Text style={styles.personMeta}>{owner.phoneNumber}</Text>
              {owner.stall ? <Text style={styles.personMeta}>Stall: {owner.stall.name}</Text> : <Text style={styles.personMeta}>No stall yet</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: owner.isApproved ? '#dcfce7' : '#fef3c7' }]}>
                <Text style={[styles.statusText, { color: owner.isApproved ? '#16a34a' : '#d97706' }]}>
                  {owner.isApproved ? 'Approved' : 'Pending'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: owner.isActive ? '#dbeafe' : '#f3f4f6' }]}>
                <Text style={[styles.statusText, { color: owner.isActive ? '#1d4ed8' : '#6b7280' }]}>
                  {owner.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.actionRow}>
            {!owner.isApproved ? (
              <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => onApprove(owner.id, true)}>
                <Text style={styles.actionBtnText}>Approve</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => onApprove(owner.id, false)}>
                <Text style={styles.actionBtnText}>Revoke</Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionBtn, { backgroundColor: owner.isActive ? '#6b7280' : '#f97316' }]} onPress={() => onToggle(owner.id)}>
              <Text style={styles.actionBtnText}>{owner.isActive ? 'Deactivate' : 'Activate'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {stallOwners.length === 0 && <Text style={styles.empty}>No stall owners registered.</Text>}
    </>
  );
}

// ─── Delivery Tab ─────────────────────────────────────────────────────────────

function DeliveryTab({ deliveryPersons, onApprove, onToggle }: {
  deliveryPersons: DeliveryPerson[];
  onApprove: (id: string, approved: boolean) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Delivery Persons ({deliveryPersons.length})</Text>
      {deliveryPersons.map((dp) => (
        <View key={dp.id} style={styles.personCard}>
          <View style={styles.personCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{dp.fullName}</Text>
              <Text style={styles.personMeta}>{dp.user.email}</Text>
              <Text style={styles.personMeta}>{dp.phoneNumber}</Text>
              <Text style={styles.personMeta}>ID: {dp.idNumber}</Text>
              <Text style={styles.personMeta}>⭐ {dp.rating.toFixed(1)} · {dp._count.deliveries} deliveries</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: dp.isApproved ? '#dcfce7' : '#fef3c7' }]}>
                <Text style={[styles.statusText, { color: dp.isApproved ? '#16a34a' : '#d97706' }]}>
                  {dp.isApproved ? 'Approved' : 'Pending'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: dp.isActive ? '#dbeafe' : '#f3f4f6' }]}>
                <Text style={[styles.statusText, { color: dp.isActive ? '#1d4ed8' : '#6b7280' }]}>
                  {dp.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.actionRow}>
            {!dp.isApproved ? (
              <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => onApprove(dp.id, true)}>
                <Text style={styles.actionBtnText}>Approve</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => onApprove(dp.id, false)}>
                <Text style={styles.actionBtnText}>Revoke</Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionBtn, { backgroundColor: dp.isActive ? '#6b7280' : '#f97316' }]} onPress={() => onToggle(dp.id)}>
              <Text style={styles.actionBtnText}>{dp.isActive ? 'Deactivate' : 'Activate'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {deliveryPersons.length === 0 && <Text style={styles.empty}>No delivery persons registered.</Text>}
    </>
  );
}

// ─── Order Modal ──────────────────────────────────────────────────────────────

function OrderModal({ order, visible, onClose }: { order: RecentOrder | null; visible: boolean; onClose: () => void }) {
  if (!order) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView contentContainerStyle={styles.modal}>
        <Text style={styles.modalTitle}>Order #{order.id.slice(-8).toUpperCase()}</Text>

        <InfoSection title="Status">
          <Row label="Order" value={order.status.replace(/_/g, ' ')} />
          <Row label="Payment" value={order.paymentStatus} />
        </InfoSection>

        <InfoSection title="Customer">
          <Row label="Name" value={order.customerName} />
          <Row label="Phone" value={order.customerPhone} />
          <Row label="Location" value={order.deliveryLocation} />
          {order.roomNumber ? <Row label="Room" value={order.roomNumber} /> : null}
        </InfoSection>

        <InfoSection title="Stall">
          <Row label="Name" value={order.stall.name} />
          <Row label="Owner" value={order.stall.stallOwner.fullName} />
          <Row label="Phone" value={order.stall.stallOwner.phoneNumber} />
        </InfoSection>

        {order.deliveryPerson ? (
          <InfoSection title="Delivery Person">
            <Row label="Name" value={order.deliveryPerson.fullName} />
            <Row label="Phone" value={order.deliveryPerson.phoneNumber} />
            <Row label="Rating" value={`${order.deliveryPerson.rating}/5.0`} />
          </InfoSection>
        ) : (
          <InfoSection title="Delivery Person">
            <Text style={styles.personMeta}>Not yet assigned</Text>
          </InfoSection>
        )}

        <InfoSection title="Items">
          {order.items.map((item) => (
            <Row key={item.id} label={`${item.menuItem.name} ×${item.quantity}`} value={`KES ${item.price * item.quantity}`} />
          ))}
          <View style={styles.divider} />
          <Row label="Delivery Fee" value={`KES ${order.deliveryFee}`} />
          <Row label="Total" value={`KES ${order.totalAmount + order.deliveryFee}`} bold />
          {order.mpesaPayerName ? <Row label="M-Pesa Payer" value={order.mpesaPayerName} /> : null}
        </InfoSection>

        <Row label="Placed At" value={new Date(order.createdAt).toLocaleString()} />

        <Pressable style={[styles.actionBtn, { backgroundColor: '#6b7280', marginTop: 24 }]} onPress={onClose}>
          <Text style={styles.actionBtnText}>Close</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '700', color: '#f97316' }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: '#111827' },
  logoutText: { color: '#ef4444', fontWeight: '600' },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 10 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    width: '47%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  settingRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  feeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  feeField: { flex: 1 },
  feeLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  feeInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#111827' },
  saveBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  orderCardTop: { flexDirection: 'row', marginBottom: 8 },
  orderCustomer: { fontSize: 15, fontWeight: '700', color: '#111827' },
  orderMeta: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#f97316' },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  topStallRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#f97316' },
  topStallName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  topStallOwner: { fontSize: 12, color: '#6b7280' },
  topStallOrders: { fontSize: 13, fontWeight: '600', color: '#111827' },
  topStallRating: { fontSize: 12, color: '#9ca3af' },

  personCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  personCardTop: { flexDirection: 'row', marginBottom: 10 },
  personName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  personMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 20, marginBottom: 20 },

  modal: { padding: 24, paddingTop: 32, paddingBottom: 48 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  infoSection: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 12 },
  infoSectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: { fontSize: 13, color: '#111827', fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 6 },
});
