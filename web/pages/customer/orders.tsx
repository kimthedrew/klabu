import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { ArrowLeft, LogOut, Package, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

interface OrderItem {
  menuItem: { name: string };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  totalAmount: number;
  deliveryFee: number;
  customerName: string;
  deliveryLocation: string;
  createdAt: string;
  stall: { name: string };
  items: OrderItem[];
  deliveryPerson: { fullName: string; phoneNumber: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_DELIVERY: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-accent/15 text-accent',
  CONFIRMED: 'bg-primary/10 text-primary',
  PREPARING: 'bg-primary/10 text-primary',
  READY_FOR_DELIVERY: 'bg-primary/10 text-primary',
  OUT_FOR_DELIVERY: 'bg-accent/15 text-accent',
  DELIVERED: 'bg-muted/20 text-app-text',
  CANCELLED: 'bg-muted/20 text-muted',
};

function formatDate(s: string): string {
  const d = new Date(s);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const user = localStorage.getItem('customerUser');
    if (!token || !user) {
      router.replace('/customer/login?redirect=/customer/orders');
      return;
    }
    try {
      const parsed = JSON.parse(user);
      setCustomerName(parsed.profile?.fullName ?? parsed.email ?? '');
    } catch {}
    fetchOrders(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/customer/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data.orders);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerUser');
        router.replace('/customer/login?redirect=/customer/orders');
      } else {
        toast.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerUser');
    toast.success('Signed out');
    router.push('/');
  };

  return (
    <>
      <SEO title="My Orders" description="Track your Klabu food orders" canonical="/customer/orders" noindex={true} />

      <div className="min-h-screen bg-background font-body pb-12">
        {/* Header */}
        <header className="bg-primary text-surface px-4 pt-6 pb-8">
          <div className="flex items-start justify-between mb-4">
            <Link href="/" className="inline-flex items-center text-surface/80 hover:text-surface text-sm">
              <ArrowLeft size={16} className="mr-1" /> Back to Klabu
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm text-surface/80 hover:text-surface transition-colors"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
          <h1 className="font-heading text-3xl mb-1">My orders</h1>
          {customerName && <p className="text-surface/80 text-sm">Signed in as {customerName}</p>}
        </header>

        <div className="px-4 -mt-4">
          {loading ? (
            <div className="bg-surface rounded-card shadow-soft p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-surface rounded-card shadow-soft p-8 text-center">
              <Package size={40} className="mx-auto text-muted mb-3" />
              <p className="font-heading text-lg text-app-text mb-1">No orders yet</p>
              <p className="text-muted text-sm mb-5">Place an order and it'll show up here.</p>
              <Link
                href="/"
                className="inline-block bg-primary text-surface px-5 py-2.5 rounded-button font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Browse stalls
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => {
                const total = o.totalAmount + o.deliveryFee;
                const summary =
                  o.items
                    .slice(0, 2)
                    .map((it) => `${it.quantity}× ${it.menuItem.name}`)
                    .join(', ') + (o.items.length > 2 ? `, +${o.items.length - 2} more` : '');
                return (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="block bg-surface rounded-card shadow-soft p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-app-text truncate">{o.stall.name}</p>
                          <p className="text-muted text-xs">{formatDate(o.createdAt)}</p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-pill whitespace-nowrap ${STATUS_TONE[o.status] || 'bg-muted/20 text-app-text'}`}
                        >
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted line-clamp-1 mb-2">{summary}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-primary text-base">KES {total}</span>
                        <ChevronRight size={16} className="text-muted" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
