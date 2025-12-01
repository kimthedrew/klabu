import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ArrowLeft,
  Package, 
  Search,
  Phone,
  MapPin,
  User,
  Store
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

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
  paymentCode?: string;
  createdAt: string;
  stall: {
    name: string;
    stallOwner: {
      fullName: string;
    };
  };
  deliveryPerson?: {
    fullName: string;
  };
  items: {
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      name: string;
    };
  }[];
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    !searchTerm ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone.includes(searchTerm) ||
    order.stall.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CONFIRMED': return 'text-blue-600 bg-blue-100';
      case 'PREPARING': return 'text-orange-600 bg-orange-100';
      case 'READY_FOR_DELIVERY': return 'text-purple-600 bg-purple-100';
      case 'OUT_FOR_DELIVERY': return 'text-indigo-600 bg-indigo-100';
      case 'DELIVERED': return 'text-green-600 bg-green-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>View All Orders - Admin - Klabu</title>
        <meta name="description" content="View and manage all orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link href="/dashboard/admin" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                  <ArrowLeft size={20} className="mr-2" />
                  Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold text-green-600">All Orders</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by customer, phone, or stall name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
              <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'PENDING').length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">In Progress</h3>
              <p className="text-3xl font-bold text-blue-600">
                {orders.filter(o => ['CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'].includes(o.status)).length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Delivered</h3>
              <p className="text-3xl font-bold text-green-600">
                {orders.filter(o => o.status === 'DELIVERED').length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
              <p className="text-2xl font-bold text-purple-600">
                KES {orders.reduce((sum, o) => sum + o.totalAmount + o.deliveryFee, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className="card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{order.customerName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.paymentStatus === 'CONFIRMED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <div className="flex items-center mb-1">
                          <Phone size={14} className="mr-1" />
                          {order.customerPhone}
                        </div>
                        <div className="flex items-center mb-1">
                          <MapPin size={14} className="mr-1" />
                          {order.deliveryLocation}
                        </div>
                        <div className="flex items-center">
                          <Store size={14} className="mr-1" />
                          {order.stall.name}
                        </div>
                      </div>
                      <div>
                        <p><strong>Stall Owner:</strong> {order.stall.stallOwner.fullName}</p>
                        {order.deliveryPerson && (
                          <p><strong>Delivery:</strong> {order.deliveryPerson.fullName}</p>
                        )}
                        <p><strong>Items:</strong> {order.items.length}</p>
                        <p><strong>Total:</strong> KES {order.totalAmount + order.deliveryFee}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Placed: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Details</h3>
              
              {/* Customer Information */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                  <p><strong>Delivery Location:</strong> {selectedOrder.deliveryLocation}</p>
                  {selectedOrder.roomNumber && (
                    <p><strong>Room Number:</strong> {selectedOrder.roomNumber}</p>
                  )}
                </div>
              </div>

              {/* Stall Information */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Stall Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Stall:</strong> {selectedOrder.stall.name}</p>
                  <p><strong>Owner:</strong> {selectedOrder.stall.stallOwner.fullName}</p>
                  {selectedOrder.deliveryPerson && (
                    <p><strong>Delivery Person:</strong> {selectedOrder.deliveryPerson.fullName}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.menuItem.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × KES {item.price}</p>
                      </div>
                      <p className="font-medium">KES {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span>KES {selectedOrder.totalAmount}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Delivery Fee:</span>
                    <span>KES {selectedOrder.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>KES {selectedOrder.totalAmount + selectedOrder.deliveryFee}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedOrder.paymentStatus === 'CONFIRMED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>{selectedOrder.paymentStatus}</span></p>
                  {selectedOrder.paymentCode && (
                    <p><strong>M-Pesa Code:</strong> {selectedOrder.paymentCode}</p>
                  )}
                </div>
              </div>

              {/* Order Status */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Order Status</h4>
                <span className={`px-3 py-2 rounded-full text-sm ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

