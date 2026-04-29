import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, Phone, MapPin, Copy, Check } from 'lucide-react';
import SEO from '../../components/SEO';
import StatusTimeline from '../../components/StatusTimeline';
import { API_BASE_URL } from '../../lib/config';

interface OrderItem {
  id: string;
  quantity: number;
  menuItem: { id: string; name: string; price: number };
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  totalAmount: number;
  deliveryFee: number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  roomNumber?: string;
  mpesaPayerName?: string;
  deliveryTier?: string;
  createdAt: string;
  stall: {
    id: string;
    name: string;
    stallOwner: { phoneNumber?: string; mpesaNumber?: string; tillNumber?: string; paymentMode?: string };
  };
  items: OrderItem[];
  deliveryPerson?: { id: string; fullName: string; phoneNumber?: string } | null;
}

const STEPS: { key: string; label: string; description: string; matches: (o: Order) => 'past' | 'active' | 'future' }[] = [
  {
    key: 'placed',
    label: 'Order placed',
    description: 'We received your order',
    matches: () => 'past',
  },
  {
    key: 'paid',
    label: 'Payment confirmed',
    description: 'Payment received by the stall',
    matches: o => (o.paymentStatus === 'CONFIRMED' ? 'past' : o.paymentStatus === 'FAILED' ? 'future' : 'active'),
  },
  {
    key: 'preparing',
    label: 'Preparing your food',
    description: 'The stall is cooking your order',
    matches: o => {
      if (['PREPARING'].includes(o.status)) return 'active';
      if (['READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) return 'past';
      return 'future';
    },
  },
  {
    key: 'on-the-way',
    label: 'On the way',
    description: 'A runner has picked up your order',
    matches: o => {
      if (['OUT_FOR_DELIVERY'].includes(o.status) || o.deliveryStatus === 'PICKED_UP') return 'active';
      if (o.status === 'DELIVERED' || o.deliveryStatus === 'DELIVERED') return 'past';
      return 'future';
    },
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Enjoy your meal!',
    matches: o => (o.status === 'DELIVERED' || o.deliveryStatus === 'DELIVERED' ? 'active' : 'future'),
  },
];

function getActiveIndex(order: Order): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const s = STEPS[i].matches(order);
    if (s === 'active') return i;
    if (s === 'past') return i + 1 < STEPS.length ? i + 1 : i;
  }
  return 0;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OrderTrackingPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTill, setCopiedTill] = useState(false);
  const pollRef = useRef<any>(null);

  const fetchOrder = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const customerToken = typeof window !== 'undefined' ? localStorage.getItem('customerToken') : null;
      const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined;
      const res = await axios.get(`${API_BASE_URL}/orders/${id}`, { headers });
      setOrder(res.data.order);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load this order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();
    pollRef.current = setInterval(() => fetchOrder(true), 15000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save tracking handle for guests so home can offer "Track your last order"
  useEffect(() => {
    if (order?.id && typeof window !== 'undefined') {
      try {
        localStorage.setItem('lastOrderId', order.id);
      } catch {}
    }
  }, [order?.id]);

  const copyTill = (val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedTill(true);
    setTimeout(() => setCopiedTill(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-body flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background font-body flex flex-col items-center justify-center px-6 text-center">
        <p className="font-heading text-xl text-app-text mb-2">Order not found</p>
        <p className="text-muted text-sm mb-6">{error || 'This order link may be invalid.'}</p>
        <Link href="/" className="bg-primary text-surface px-6 py-3 rounded-button font-semibold hover:bg-primary/90 transition-colors">
          Back to Klabu
        </Link>
      </div>
    );
  }

  const activeIndex = getActiveIndex(order);
  const cancelled = order.status === 'CANCELLED';
  const subtotal = order.totalAmount;
  const total = subtotal + order.deliveryFee;
  const awaitingManualPayment =
    order.paymentMethod === 'MANUAL' && order.paymentStatus === 'PENDING';

  const tillOrPhone =
    order.stall.stallOwner.tillNumber ||
    order.stall.stallOwner.mpesaNumber ||
    order.stall.stallOwner.phoneNumber ||
    '';

  return (
    <>
      <SEO title={`Order from ${order.stall.name}`} description="Track your Klabu order" canonical={`/orders/${order.id}`} noindex={true} />

      <div className="min-h-screen bg-background font-body pb-12">
        {/* Header */}
        <header className="bg-primary text-surface px-4 pt-6 pb-8">
          <Link href="/" className="inline-flex items-center text-surface/80 hover:text-surface text-sm mb-4">
            <ArrowLeft size={16} className="mr-1" /> Back to Klabu
          </Link>
          <h1 className="font-heading text-2xl mb-1">Order from {order.stall.name}</h1>
          <p className="text-surface/80 text-sm">
            #{order.id.slice(0, 8)} · placed {formatTime(order.createdAt)}
          </p>
        </header>

        <div className="px-4 -mt-4 space-y-4">
          {/* Status card */}
          <section className="bg-surface rounded-card shadow-soft p-5">
            <h2 className="font-heading text-app-text text-lg mb-4">
              {cancelled ? 'Order cancelled' : 'Where your food is'}
            </h2>
            <StatusTimeline steps={STEPS} activeIndex={activeIndex} cancelled={cancelled} />
          </section>

          {/* Manual M-Pesa pay reminder */}
          {awaitingManualPayment && (
            <section className="bg-accent/10 border border-accent/30 rounded-card p-5">
              <h3 className="font-heading text-app-text text-base mb-1">Pay the stall to start cooking</h3>
              <p className="text-muted text-sm mb-3">
                Send <span className="font-medium text-app-text">KES {total}</span> via M-Pesa
                {tillOrPhone ? ' to the number below.' : '.'}
                {' '}The stall will confirm with the name <span className="font-medium text-app-text">{order.mpesaPayerName || order.customerName}</span>.
              </p>
              {tillOrPhone && (
                <button
                  onClick={() => copyTill(tillOrPhone)}
                  className="flex items-center gap-2 bg-surface border border-muted/40 rounded-button px-3 py-2 text-sm text-app-text hover:bg-background transition-colors"
                >
                  {copiedTill ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                  {copiedTill ? 'Copied' : `${order.stall.stallOwner.tillNumber ? 'Till' : 'Number'}: ${tillOrPhone}`}
                </button>
              )}
            </section>
          )}

          {/* Runner card */}
          {order.deliveryPerson && (
            <section className="bg-surface rounded-card shadow-soft p-5">
              <p className="text-muted text-xs uppercase tracking-wide mb-2">Your runner</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading text-app-text text-lg">{order.deliveryPerson.fullName}</p>
                  {order.deliveryPerson.phoneNumber && (
                    <p className="text-muted text-sm">{order.deliveryPerson.phoneNumber}</p>
                  )}
                </div>
                {order.deliveryPerson.phoneNumber && (
                  <a
                    href={`tel:${order.deliveryPerson.phoneNumber}`}
                    className="flex items-center gap-2 bg-primary/10 text-primary rounded-pill px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Order details */}
          <section className="bg-surface rounded-card shadow-soft p-5">
            <h3 className="font-heading text-app-text text-base mb-3">Order details</h3>
            <div className="space-y-2 mb-4">
              {order.items.map(it => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-app-text">
                    {it.quantity} × {it.menuItem.name}
                  </span>
                  <span className="text-muted">KES {it.menuItem.price * it.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-muted/20 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>KES {subtotal}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery {order.deliveryTier === 'FAST' ? '(Fast)' : ''}</span>
                <span>KES {order.deliveryFee}</span>
              </div>
              <div className="flex justify-between font-heading text-app-text text-base pt-2">
                <span>Total</span>
                <span className="text-primary">KES {total}</span>
              </div>
            </div>
          </section>

          {/* Delivery details */}
          <section className="bg-surface rounded-card shadow-soft p-5">
            <h3 className="font-heading text-app-text text-base mb-3">Delivery</h3>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={16} className="text-muted flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-app-text">{order.deliveryLocation}</p>
                {order.roomNumber && <p className="text-muted">{order.roomNumber}</p>}
                <p className="text-muted mt-1">{order.customerName} · {order.customerPhone}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
