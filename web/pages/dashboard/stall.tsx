import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LogOut, Plus, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { API_BASE_URL, API_URL } from '../../lib/config';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
}

interface Stall {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  menuItems: MenuItem[];
}

interface Order {
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
  deliveryStatus: string;
  createdAt: string;
  items: { id: string; quantity: number; price: number; menuItem: { name: string } }[];
  deliveryPerson?: { fullName: string; phoneNumber: string };
}

type Tab = 'new' | 'prep' | 'ready';

function timeAgo(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function StallDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('new');
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Menu management state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: 0, isAvailable: true });

  // Order detail sheet
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mpesaName, setMpesaName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'STALL_OWNER') { router.push('/login'); return; }
    setUser(parsed);

    fetchAll();

    const sock = io(API_URL);
    sock.emit('join-user', parsed.id);
    if (parsed.profile?.stall?.id) sock.emit('join-stall', parsed.profile.stall.id);
    sock.on('delivery-accepted', () => { toast.success('Delivery accepted!'); fetchOrders(); });
    sock.on('delivery-status-updated', () => fetchOrders());
    return () => { sock.disconnect(); };
  }, []);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, { headers: authHeader() });
      setStall(res.data.user.profile.stall);
      await fetchOrders();
    } catch { toast.error('Failed to load stall data'); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders/stall/my-orders`, { headers: authHeader() });
      setOrders(res.data.orders);
    } catch { toast.error('Failed to load orders'); }
  };

  const toggleStatus = async () => {
    if (!stall) return;
    try {
      await axios.put(`${API_BASE_URL}/stalls/${stall.id}`, { isActive: !stall.isActive }, { headers: authHeader() });
      toast.success(`Stall ${!stall.isActive ? 'opened' : 'closed'}`);
      fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const acceptOrder = async (order: Order) => {
    if (!mpesaName.trim() && order.paymentStatus === 'PENDING') {
      toast.error('Enter the M-Pesa payer name to confirm payment');
      return;
    }
    try {
      if (order.paymentStatus === 'PENDING') {
        await axios.post(`${API_BASE_URL}/orders/${order.id}/confirm-payment`, { mpesaPayerName: mpesaName }, { headers: authHeader() });
      }
      // Move order into Preparing state so it shows up in Prep tab
      await axios.patch(`${API_BASE_URL}/orders/${order.id}/status`, { status: 'PREPARING' }, { headers: authHeader() });

      setDismissing(d => new Set(d).add(order.id));
      setTimeout(() => {
        setDismissing(d => { const n = new Set(d); n.delete(order.id); return n; });
        fetchOrders();
        setSelectedOrder(null);
        setTab('prep');
        toast.success('Order accepted — now in prep!');
      }, 350);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/orders/${orderId}/status`, { status }, { headers: authHeader() });
      const msgs: Record<string, string> = { PREPARING: 'Preparing!', READY_FOR_DELIVERY: 'Ready — finding runner...', DELIVERED: 'Delivered!', CANCELLED: 'Cancelled.' };
      toast.success(msgs[status] || 'Updated');
      fetchOrders();
      setSelectedOrder(null);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stall) return;
    try {
      await axios.post(`${API_BASE_URL}/stalls/${stall.id}/menu`, newItem, { headers: authHeader() });
      toast.success('Item added');
      setNewItem({ name: '', description: '', price: 0, isAvailable: true });
      setShowAddItem(false);
      fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const tabOrders = {
    new:   orders.filter(o => o.paymentStatus === 'PENDING'),
    prep:  orders.filter(o => o.paymentStatus === 'CONFIRMED' && o.status !== 'READY_FOR_DELIVERY' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'),
    ready: orders.filter(o => o.status === 'READY_FOR_DELIVERY'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>{stall?.name || 'Dashboard'} — Klabu</title></Head>

      <div className="min-h-screen bg-background font-body pb-24">
        {/* Header */}
        <div className="bg-primary px-5 pt-10 pb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-body text-white/60 text-xs mb-0.5">Stall Dashboard</p>
              <h1 className="font-heading text-white text-2xl">{stall?.name || 'Your Stall'}</h1>
            </div>
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); }} className="text-white/60 p-2">
              <LogOut size={20} />
            </button>
          </div>

          {/* Open/Closed toggle */}
          <div className="flex items-center justify-between bg-white/10 rounded-card px-4 py-3">
            <div>
              <p className="font-body text-white text-sm font-medium">{stall?.isActive ? 'Accepting Orders' : 'Stall Closed'}</p>
              <p className="font-body text-white/50 text-xs">{stall?.isActive ? 'Tap to close your stall' : 'Tap to open your stall'}</p>
            </div>
            <button
              onClick={toggleStatus}
              className={`relative w-14 h-7 rounded-pill transition-colors duration-200 ${stall?.isActive ? 'bg-white/90' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200 shadow ${stall?.isActive ? 'left-7 bg-primary' : 'left-0.5 bg-muted'}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-4 gap-2">
          {(['new', 'prep', 'ready'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-pill font-body text-sm font-medium transition-colors relative ${tab === t ? 'bg-primary text-surface' : 'bg-surface text-app-text border border-muted/30'}`}
            >
              {t === 'new' ? 'New' : t === 'prep' ? 'Prep' : 'Ready'}
              {tabOrders[t].length > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${tab === t ? 'bg-white/20 text-white' : 'bg-accent text-white'}`}>
                  {tabOrders[t].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Order cards */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {tabOrders[tab].length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-3 block">{tab === 'new' ? '📭' : tab === 'prep' ? '👨‍🍳' : '🛵'}</span>
              <p className="font-heading text-app-text text-base">No {tab === 'new' ? 'new orders' : tab === 'prep' ? 'orders in prep' : 'orders ready'}</p>
            </div>
          ) : (
            tabOrders[tab].map(order => (
              <div
                key={order.id}
                className={`bg-surface rounded-card shadow-soft p-4 transition-all duration-350 ${dismissing.has(order.id) ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-heading text-app-text text-base">#{order.id.slice(-6).toUpperCase()}</p>
                    <p className="font-body text-muted text-xs">{timeAgo(order.createdAt)}</p>
                  </div>
                  <span className="font-heading text-primary font-semibold text-base">KES {order.totalAmount}</span>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.map(item => (
                    <p key={item.id} className="font-body text-app-text text-sm">{item.quantity}× {item.menuItem.name}</p>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs font-body text-muted mb-4">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1a4 4 0 100 8A4 4 0 006 1z" stroke="currentColor" strokeWidth="1.2"/></svg>
                  {order.deliveryLocation}{order.roomNumber ? `, Room ${order.roomNumber}` : ''}
                </div>

                {tab === 'new' && (
                  <button
                    onClick={() => { setSelectedOrder(order); setMpesaName(''); }}
                    className="w-full h-12 bg-primary text-surface rounded-card font-body font-semibold text-base active:scale-[0.98] transition-transform"
                  >
                    Accept Order
                  </button>
                )}

                {tab === 'prep' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(order.id, 'READY_FOR_DELIVERY')}
                      className="flex-1 h-12 bg-primary text-surface rounded-card font-body font-semibold text-base active:scale-[0.98] transition-transform"
                    >
                      Mark as Ready
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, 'CANCELLED')}
                      className="h-12 px-4 bg-accent/10 text-accent rounded-card font-body font-semibold text-sm active:scale-[0.98] transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {tab === 'ready' && order.deliveryPerson && (
                  <div className="flex items-center gap-3 bg-background rounded-card px-3 py-2">
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium text-app-text">{order.deliveryPerson.fullName}</p>
                      <p className="font-body text-xs text-muted">Runner assigned</p>
                    </div>
                    <a href={`tel:${order.deliveryPerson.phoneNumber}`} className="text-primary">
                      <Phone size={18} />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Menu section */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-app-text text-lg">Menu Items</h2>
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-1.5 bg-primary text-surface px-4 py-2 rounded-pill font-body text-sm font-medium">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="bg-surface rounded-card shadow-soft divide-y divide-muted/20">
            {stall?.menuItems.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-body font-medium text-app-text text-sm">{item.name}</p>
                  <p className="font-heading text-primary text-sm font-semibold">KES {item.price}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-pill text-xs font-body ${item.isAvailable ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                  {item.isAvailable ? 'Available' : 'Sold out'}
                </span>
              </div>
            ))}
            {!stall?.menuItems.length && (
              <p className="px-4 py-6 font-body text-muted text-sm text-center">No menu items yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Accept order sheet */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-app-text/30 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[32px] shadow-soft px-5 pb-10 pt-5">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-pill bg-muted/40" />
            </div>
            <h3 className="font-heading text-app-text text-xl mb-1">Order #{selectedOrder.id.slice(-6).toUpperCase()}</h3>
            <p className="font-body text-muted text-sm mb-4">{selectedOrder.customerName} · {selectedOrder.customerPhone}</p>

            <div className="bg-background rounded-card p-4 mb-4">
              {selectedOrder.items.map(i => (
                <div key={i.id} className="flex justify-between font-body text-sm py-1">
                  <span>{i.quantity}× {i.menuItem.name}</span>
                  <span className="text-muted">KES {i.price * i.quantity}</span>
                </div>
              ))}
              <div className="border-t border-muted/20 mt-2 pt-2 flex justify-between font-heading font-semibold text-app-text">
                <span>Total</span><span>KES {selectedOrder.totalAmount}</span>
              </div>
            </div>

            {selectedOrder.paymentStatus === 'PENDING' && (
              <div className="mb-4">
                <label className="font-body text-xs text-muted block mb-1">M-Pesa Payer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. JOHN DOE"
                  value={mpesaName}
                  onChange={e => setMpesaName(e.target.value)}
                  className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary"
                />
                <p className="font-body text-xs text-muted mt-1">Enter as shown in your M-Pesa statement to verify payment</p>
              </div>
            )}

            <button
              onClick={() => acceptOrder(selectedOrder)}
              className="w-full h-14 bg-primary text-surface rounded-button font-body font-semibold text-base active:scale-[0.98] transition-transform"
            >
              Confirm & Accept Order
            </button>
          </div>
        </>
      )}

      {/* Add menu item sheet */}
      {showAddItem && (
        <>
          <div className="fixed inset-0 z-40 bg-app-text/30 backdrop-blur-sm" onClick={() => setShowAddItem(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[32px] shadow-soft px-5 pb-10 pt-5">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-pill bg-muted/40" />
            </div>
            <h3 className="font-heading text-app-text text-xl mb-4">Add Menu Item</h3>
            <form onSubmit={addMenuItem} className="space-y-3">
              <div>
                <label className="font-body text-xs text-muted block mb-1">Name *</label>
                <input required value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Chapati & Ndengu"
                  className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-body text-xs text-muted block mb-1">Description</label>
                <input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                  placeholder="Short description (optional)"
                  className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="font-body text-xs text-muted block mb-1">Price (KES) *</label>
                <input required type="number" min="1" value={newItem.price || ''} onChange={e => setNewItem(p => ({ ...p, price: Number(e.target.value) }))}
                  placeholder="150"
                  className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <button type="submit" className="w-full h-14 bg-primary text-surface rounded-button font-body font-semibold text-base mt-2 active:scale-[0.98] transition-transform">
                Add to Menu
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
