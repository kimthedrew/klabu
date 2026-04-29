import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LogOut, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { API_BASE_URL, API_URL } from '../../lib/config';
import SwipeToAccept from '../../components/SwipeToAccept';

interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  roomNumber?: string;
  totalAmount: number;
  deliveryFee: number;
  status: string;
  deliveryStatus: string;
  paymentStatus: string;
  createdAt: string;
  items: { id: string; quantity: number; menuItem: { name: string } }[];
  stall: { id: string; name: string; stallOwner: { fullName: string; phoneNumber: string } };
}

interface Assignment {
  id: string;
  orderId: string;
  expiresAt: string;
  order: {
    id: string;
    customerName: string;
    deliveryLocation: string;
    roomNumber?: string;
    totalAmount: number;
    deliveryFee: number;
    items: any[];
    stall: { name: string; stallOwner: { fullName: string; phoneNumber: string } };
  };
}

export default function DeliveryDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'DELIVERY_PERSON') { router.push('/login'); return; }
    setUser(parsed);

    fetchAll();

    const sock = io(API_URL);
    sock.emit('join-user', parsed.id);
    if (parsed.profile?.id) sock.emit('join-delivery', parsed.profile.id);
    sock.on('delivery-assignment', data => {
      toast.success(`New delivery from ${data.stallName}! KES ${data.deliveryFee}`, { duration: 10000 });
      fetchAssignments();
    });
    sock.on('delivery-picked-up', () => fetchDeliveries());
    return () => { sock.disconnect(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      if (assignments.some(a => new Date(a.expiresAt).getTime() <= Date.now())) {
        fetchAssignments();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [assignments]);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/deliveries/profile`, { headers: authHeader() });
      setDeliveryPerson(res.data.deliveryPerson);
      setIsActive(res.data.deliveryPerson.isActive);
      await Promise.all([fetchDeliveries(), fetchAssignments()]);
    } catch { toast.error('Failed to load delivery data'); }
    finally { setLoading(false); }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/deliveries/my-deliveries`, { headers: authHeader() });
      setDeliveries(res.data.orders);
    } catch { /* silent */ }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/deliveries/pending-assignments`, { headers: authHeader() });
      setAssignments(res.data.assignments);
    } catch { /* silent */ }
  };

  const toggleActive = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/deliveries/toggle-status`, { isActive: !isActive }, { headers: authHeader() });
      setIsActive(a => !a);
      toast.success(`You are now ${!isActive ? 'active' : 'inactive'}`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const acceptAssignment = async (assignmentId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/deliveries/accept-assignment`, { assignmentId }, { headers: authHeader() });
      toast.success('Delivery accepted!');
      fetchAssignments();
      fetchDeliveries();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const markDelivered = async (orderId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/deliveries/${orderId}/status`, { status: 'DELIVERED' }, { headers: authHeader() });
      toast.success('Marked as delivered!');
      fetchDeliveries();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const activeDelivery = deliveries.find(d => d.deliveryStatus === 'ACCEPTED' || d.deliveryStatus === 'PICKED_UP');
  const todayEarnings = deliveries
    .filter(d => d.deliveryStatus === 'DELIVERED' && new Date(d.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, d) => sum + d.deliveryFee, 0);
  const todayCount = deliveries.filter(d => d.deliveryStatus === 'DELIVERED' && new Date(d.createdAt).toDateString() === new Date().toDateString()).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>Runner Dashboard — Klabu</title></Head>

      <div className="min-h-screen bg-background font-body pb-10">
        {/* Header */}
        <div className="bg-primary px-5 pt-10 pb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-body text-white/60 text-xs mb-0.5">Runner Dashboard</p>
              <h1 className="font-heading text-white text-2xl">{user?.profile?.fullName || 'Runner'}</h1>
            </div>
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); }} className="text-white/60 p-2">
              <LogOut size={20} />
            </button>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between bg-white/10 rounded-card px-4 py-3">
            <div>
              <p className="font-body text-white text-sm font-medium">{isActive ? 'Available for deliveries' : 'Not accepting deliveries'}</p>
              <p className="font-body text-white/50 text-xs">{isActive ? 'You\'ll receive delivery pings' : 'Go active to earn'}</p>
            </div>
            <button
              onClick={toggleActive}
              className={`relative w-14 h-7 rounded-pill transition-colors duration-200 ${isActive ? 'bg-white/90' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200 shadow ${isActive ? 'left-7 bg-primary' : 'left-0.5 bg-muted'}`} />
            </button>
          </div>

          {/* Earnings */}
          <div className="flex gap-3 mt-3">
            <div className="flex-1 bg-white/10 rounded-card px-3 py-2 text-center">
              <p className="font-heading text-white text-lg font-semibold">KES {todayEarnings}</p>
              <p className="font-body text-white/60 text-xs">Today's earnings</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-card px-3 py-2 text-center">
              <p className="font-heading text-white text-lg font-semibold">{todayCount}</p>
              <p className="font-body text-white/60 text-xs">Deliveries today</p>
            </div>
            {deliveryPerson?.rating > 0 && (
              <div className="flex-1 bg-white/10 rounded-card px-3 py-2 text-center">
                <p className="font-heading text-white text-lg font-semibold">{deliveryPerson.rating.toFixed(1)} ⭐</p>
                <p className="font-body text-white/60 text-xs">Rating</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Active delivery route mode */}
          {activeDelivery && (
            <div className="bg-surface rounded-card shadow-soft p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <p className="font-body text-accent text-xs font-medium uppercase tracking-wide">Active Delivery</p>
              </div>
              <h3 className="font-heading text-app-text text-lg mb-1">{activeDelivery.stall.name}</h3>
              <p className="font-body text-muted text-sm mb-1">Pickup from {activeDelivery.stall.stallOwner.fullName}</p>
              <div className="flex items-center gap-2 mb-4">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1a4 4 0 100 8A4 4 0 006 1z" stroke="#A89F91" strokeWidth="1.2"/></svg>
                <p className="font-body text-sm text-app-text">{activeDelivery.deliveryLocation}{activeDelivery.roomNumber ? `, Room ${activeDelivery.roomNumber}` : ''}</p>
              </div>

              <div className="space-y-2 mb-4 bg-background rounded-card p-3">
                {activeDelivery.items.map((item: any) => (
                  <p key={item.id} className="font-body text-sm text-app-text">{item.quantity}× {item.menuItem.name}</p>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="font-heading text-primary font-semibold">KES {activeDelivery.deliveryFee} fee</span>
                <a href={`tel:${activeDelivery.customerPhone}`} className="flex items-center gap-2 text-primary font-body text-sm">
                  <Phone size={14} /> Call customer
                </a>
              </div>

              <button
                onClick={() => markDelivered(activeDelivery.id)}
                className="w-full h-14 bg-primary text-surface rounded-button font-body font-semibold text-base active:scale-[0.98] transition-transform"
              >
                Mark as Delivered
              </button>
            </div>
          )}

          {/* Pending assignment pings */}
          {assignments.length > 0 && (
            <div>
              <h2 className="font-heading text-app-text text-lg mb-2">Available Deliveries</h2>
              <div className="space-y-3">
                {assignments.map(a => {
                  const secondsLeft = Math.max(0, Math.round((new Date(a.expiresAt).getTime() - currentTime) / 1000));
                  return (
                    <div key={a.id} className="bg-surface rounded-card shadow-soft p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-heading text-app-text text-base">{a.order.stall.name}</p>
                          <p className="font-body text-muted text-xs">Pickup from {a.order.stall.stallOwner.fullName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading text-primary font-semibold text-base">KES {a.order.deliveryFee}</p>
                          <p className={`font-body text-xs font-medium ${secondsLeft < 10 ? 'text-accent' : 'text-muted'}`}>{secondsLeft}s</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-4 font-body text-sm text-app-text">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1a4 4 0 100 8A4 4 0 006 1z" stroke="#A89F91" strokeWidth="1.2"/></svg>
                        {a.order.deliveryLocation}{a.order.roomNumber ? `, Room ${a.order.roomNumber}` : ''}
                      </div>
                      <SwipeToAccept onAccept={() => acceptAssignment(a.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No active state */}
          {!activeDelivery && assignments.length === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl mb-3 block">🛵</span>
              <p className="font-heading text-app-text text-lg mb-1">
                {isActive ? 'Waiting for pings...' : 'Go active to start earning'}
              </p>
              <p className="font-body text-muted text-sm">
                {isActive ? 'You\'ll be notified when a delivery is available' : 'Toggle the switch above to receive delivery requests'}
              </p>
            </div>
          )}

          {/* Past deliveries */}
          {deliveries.filter(d => d.deliveryStatus === 'DELIVERED').length > 0 && (
            <div>
              <h2 className="font-heading text-app-text text-lg mb-2">Past Deliveries</h2>
              <div className="bg-surface rounded-card shadow-soft divide-y divide-muted/20">
                {deliveries.filter(d => d.deliveryStatus === 'DELIVERED').slice(0, 5).map(d => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-body font-medium text-app-text text-sm">{d.stall.name}</p>
                      <p className="font-body text-muted text-xs">{d.deliveryLocation}</p>
                    </div>
                    <p className="font-heading text-primary font-semibold text-sm">KES {d.deliveryFee}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
