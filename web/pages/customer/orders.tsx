import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { ArrowLeft, LogOut, Package, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';
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
  PENDING: 'Pending payment',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_DELIVERY: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

function statusColor(status: string) {
  if (status === 'DELIVERED') return 'bg-green-100 text-green-800';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800';
  if (status === 'OUT_FOR_DELIVERY') return 'bg-blue-100 text-blue-800';
  if (status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-700';
}

function statusIcon(status: string) {
  if (status === 'DELIVERED') return <CheckCircle size={16} className="text-green-600" />;
  if (status === 'OUT_FOR_DELIVERY') return <Truck size={16} className="text-blue-600" />;
  if (status === 'CANCELLED') return <AlertCircle size={16} className="text-red-600" />;
  return <Clock size={16} className="text-yellow-600" />;
}

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
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
  }, []);

  const fetchOrders = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/customer/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
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
    toast.success('Logged out');
    router.push('/');
  };

  return (
    <>
      <SEO title="My Orders" description="Track your Klabu food orders" canonical="/customer/orders" noindex={true} />

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft size={20} />
              </Link>
              <span className="text-xl font-bold text-green-600">Klabu</span>
            </div>
            <div className="flex items-center gap-3">
              {customerName && <span className="text-sm text-gray-600 hidden sm:block">{customerName}</span>}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">You haven&apos;t placed any orders yet.</p>
              <Link href="/" className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors">
                Browse stalls
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="w-full text-left px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {statusIcon(order.status)}
                          <span className="font-semibold text-gray-900 truncate">{order.stall.name}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(order.status)}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">KES {order.totalAmount + order.deliveryFee}</span>
                      </div>
                    </div>
                  </button>

                  {expanded === order.id && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Items</p>
                        <ul className="space-y-1">
                          {order.items.map((item, i) => (
                            <li key={i} className="flex justify-between text-sm text-gray-700">
                              <span>{item.menuItem.name} × {item.quantity}</span>
                              <span>KES {item.price * item.quantity}</span>
                            </li>
                          ))}
                          <li className="flex justify-between text-sm text-gray-500 pt-1 border-t border-gray-200 mt-1">
                            <span>Delivery fee</span>
                            <span>KES {order.deliveryFee}</span>
                          </li>
                          <li className="flex justify-between text-sm font-semibold text-gray-900 pt-1">
                            <span>Total</span>
                            <span>KES {order.totalAmount + order.deliveryFee}</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery to</p>
                        <p className="text-sm text-gray-700">{order.deliveryLocation}</p>
                      </div>

                      {order.deliveryPerson && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivery person</p>
                          <p className="text-sm text-gray-700">{order.deliveryPerson.fullName} — {order.deliveryPerson.phoneNumber}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Order ID</p>
                        <p className="text-xs font-mono text-gray-500">{order.id}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
