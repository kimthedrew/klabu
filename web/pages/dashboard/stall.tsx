import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Store, 
  Plus, 
  Package, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  User,
  Phone,
  AlertCircle,
  Star
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { API_BASE_URL, API_URL } from '../../lib/config';
import NotificationBell from '../../components/NotificationBell';

interface Stall {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  menuItems: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
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
  paymentCode?: string;
  deliveryStatus: string;
  deliveryPerson?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    rating: number;
  };
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      id: string;
      name: string;
      description?: string;
    };
  }[];
}

export default function StallDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stall, setStall] = useState<Stall | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [showCreateStall, setShowCreateStall] = useState(false);
  const [showEditMenuItem, setShowEditMenuItem] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: 0,
    isAvailable: true
  });
  const [newStall, setNewStall] = useState({
    name: '',
    description: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'STALL_OWNER') {
      router.push('/login');
      return;
    }

    fetchStallData();

    // Initialize socket connection
    const socketConnection = io(API_URL);
    setSocket(socketConnection);

    // Join user room for personal notifications
    socketConnection.emit('join-user', parsedUser.id);

    // Join stall room for real-time order updates
    if (parsedUser.profile?.stall?.id) {
      socketConnection.emit('join-stall', parsedUser.profile.stall.id);
    }

    // Listen for delivery-related events
    socketConnection.on('delivery-accepted', (data) => {
      toast.success(`Delivery accepted by ${data.deliveryPerson.fullName}!`);
      fetchOrders(); // Refresh orders to show updated delivery info
    });

    socketConnection.on('delivery-status-updated', (data) => {
      toast.success(`Delivery status updated: ${data.status}`);
      fetchOrders();
    });

    socketConnection.on('no-delivery-persons-available', (data) => {
      toast.error('No delivery persons are currently available');
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const fetchStallData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStall(response.data.user.profile.stall);
      fetchOrders();
    } catch (error) {
      console.error('Error fetching stall data:', error);
      toast.error('Failed to load stall data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching orders with token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`${API_BASE_URL}/orders/stall/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Orders response:', response.data);
      setOrders(response.data.orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to load orders');
    }
  };

  const handleCreateStall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/stalls`, newStall, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Stall created successfully');
      setNewStall({ name: '', description: '' });
      setShowCreateStall(false);
      fetchStallData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create stall');
    }
  };

  const toggleStallStatus = async () => {
    if (!stall) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/stalls/${stall.id}`, {
        isActive: !stall.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Stall ${!stall.isActive ? 'opened' : 'closed'} successfully`);
      fetchStallData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update stall status');
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stall) {
      toast.error('No stall found. Please create a stall first.');
      return;
    }

    console.log('Adding menu item:', newMenuItem);
    console.log('Stall ID:', stall.id);

    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await axios.post(`${API_BASE_URL}/stalls/${stall.id}/menu`, newMenuItem, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response:', response.data);
      toast.success('Menu item added successfully');
      setNewMenuItem({ name: '', description: '', price: 0, isAvailable: true });
      setShowAddMenuItem(false);
      fetchStallData();
    } catch (error: any) {
      console.error('Add menu item error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to add menu item');
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingMenuItem(item);
    setShowEditMenuItem(true);
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stall || !editingMenuItem) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/stalls/${stall.id}/menu/${editingMenuItem.id}`,
        {
          name: editingMenuItem.name,
          description: editingMenuItem.description,
          price: editingMenuItem.price,
          isAvailable: editingMenuItem.isAvailable
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Menu item updated successfully');
      setShowEditMenuItem(false);
      setEditingMenuItem(null);
      fetchStallData();
    } catch (error: any) {
      console.error('Update menu item error:', error);
      toast.error(error.response?.data?.error || 'Failed to update menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!stall) return;

    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/stalls/${stall.id}/menu/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Menu item deleted successfully');
      fetchStallData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete menu item');
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !confirmationCode.trim()) {
      toast.error('Please enter the M-Pesa confirmation code');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/orders/${selectedOrder.id}/confirm-payment`, {
        paymentCode: confirmationCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Payment confirmed successfully! You can now start preparing the order.');
      setConfirmationCode('');
      
      // Refresh order data without closing modal
      const updatedOrderResponse = await axios.get(`${API_BASE_URL}/orders/${selectedOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(updatedOrderResponse.data.order);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to confirm payment');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/orders/${orderId}/status`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const statusMessages: Record<string, string> = {
        'PREPARING': 'Order is now being prepared!',
        'READY_FOR_DELIVERY': 'Order is ready! Finding a delivery person...',
        'DELIVERED': 'Order marked as delivered!',
        'CANCELLED': 'Order has been cancelled.'
      };
      
      toast.success(statusMessages[status] || 'Order status updated successfully!');
      
      // Refresh order data in modal without closing it
      if (selectedOrder) {
        const updatedOrderResponse = await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedOrder(updatedOrderResponse.data.order);
      }
      
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleRejectDelivery = async () => {
    if (!selectedOrder || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/orders/${selectedOrder.id}/reject-delivery`, {
        reason: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Delivery person rejected. Finding another delivery person...');
      setShowRejectModal(false);
      setRejectReason('');
      
      // Refresh order data in modal
      const updatedOrderResponse = await axios.get(`${API_BASE_URL}/orders/${selectedOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(updatedOrderResponse.data.order);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject delivery person');
    }
  };

  const handleConfirmPickup = async () => {
    if (!selectedOrder) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/orders/${selectedOrder.id}/confirm-pickup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Delivery pickup confirmed! Order is now out for delivery.');
      
      // Refresh order data in modal
      const updatedOrderResponse = await axios.get(`${API_BASE_URL}/orders/${selectedOrder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(updatedOrderResponse.data.order);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to confirm pickup');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CONFIRMED': return 'text-blue-600 bg-blue-100';
      case 'PREPARING': return 'text-orange-600 bg-orange-100';
      case 'READY_FOR_DELIVERY': return 'text-purple-600 bg-purple-100';
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
        <title>Stall Dashboard - Klabu</title>
        <meta name="description" content="Manage your stall and orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <h1 className="text-2xl font-bold text-green-600">Klabu</h1>
                  <span className="ml-2 text-sm text-gray-500">Stall Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.profile?.fullName}</span>
                <NotificationBell
                  token={typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''}
                  socket={socket}
                />
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut size={20} className="mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Approval Status Banner */}
          {user?.profile && !user.profile.isApproved && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">Pending Admin Approval</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    Your account is currently pending approval from the administrator. 
                    You won't be able to receive orders until your account is approved. 
                    This usually takes 24-48 hours. We'll notify you once approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`rounded-full p-3 mr-4 ${stall?.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Store className={`${stall?.isActive ? 'text-green-600' : 'text-red-600'}`} size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stall Status</p>
                    <p className={`text-lg font-semibold ${stall?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {stall?.isActive ? 'Open for Business' : 'Closed'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleStallStatus}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    stall?.isActive ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      stall?.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <Package className="text-blue-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Menu Items</p>
                  <p className="text-lg font-semibold text-gray-900">{stall?.menuItems?.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-full p-3">
                  <Clock className="text-orange-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {orders.filter(order => order.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-full p-3">
                  <DollarSign className="text-purple-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">
                    KES {orders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Menu Management */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Menu Items</h2>
                {stall ? (
                  <button
                    onClick={() => setShowAddMenuItem(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus size={20} className="mr-2" />
                    Add Item
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateStall(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus size={20} className="mr-2" />
                    Create Stall First
                  </button>
                )}
              </div>

              {!stall ? (
                <div className="text-center py-8 text-gray-500">
                  <Store size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No stall created yet</p>
                  <p className="text-sm">Create your stall first to start adding menu items</p>
                </div>
              ) : stall?.menuItems?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No menu items yet</p>
                  <p className="text-sm">Add your first menu item to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stall?.menuItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-sm font-medium text-green-600">KES {item.price}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit item"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Orders</h2>
              
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No orders yet</p>
                  <p className="text-sm">Orders will appear here when customers place them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{order.customerName}</h3>
                          <p className="text-sm text-gray-600">{order.customerPhone}</p>
                          <p className="text-sm text-gray-600">{order.deliveryLocation}</p>
                          {order.roomNumber && (
                            <p className="text-sm text-gray-600">Room: {order.roomNumber}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.paymentStatus === 'CONFIRMED' 
                              ? 'text-green-600 bg-green-100' 
                              : 'text-yellow-600 bg-yellow-100'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            KES {order.totalAmount + order.deliveryFee}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Stall Modal */}
        {showCreateStall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Your Stall</h3>
              <form onSubmit={handleCreateStall} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stall Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStall.name}
                    onChange={(e) => setNewStall({...newStall, name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Kamau's Kitchen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newStall.description}
                    onChange={(e) => setNewStall({...newStall, description: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Describe your stall and the food you serve..."
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateStall(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Create Stall
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Menu Item Modal */}
        {showAddMenuItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Menu Item</h3>
              <form onSubmit={handleAddMenuItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Ugali & Sukuma Wiki"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Describe the item..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (KES)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={newMenuItem.price}
                    onChange={(e) => setNewMenuItem({...newMenuItem, price: parseFloat(e.target.value)})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={newMenuItem.isAvailable}
                    onChange={(e) => setNewMenuItem({...newMenuItem, isAvailable: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isAvailable" className="ml-2 text-sm text-gray-700">
                    Available for order
                  </label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMenuItem(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Menu Item Modal */}
        {showEditMenuItem && editingMenuItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Menu Item</h3>
              <form onSubmit={handleUpdateMenuItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMenuItem.name}
                    onChange={(e) => setEditingMenuItem({...editingMenuItem, name: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Ugali & Sukuma Wiki"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingMenuItem.description || ''}
                    onChange={(e) => setEditingMenuItem({...editingMenuItem, description: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Describe the item..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (KES)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editingMenuItem.price}
                    onChange={(e) => setEditingMenuItem({...editingMenuItem, price: parseFloat(e.target.value)})}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAvailableEdit"
                    checked={editingMenuItem.isAvailable}
                    onChange={(e) => setEditingMenuItem({...editingMenuItem, isAvailable: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isAvailableEdit" className="ml-2 text-sm text-gray-700">
                    Available for order
                  </label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditMenuItem(false);
                      setEditingMenuItem(null);
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Details</h3>
              
              {/* Customer Information */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                  <p><strong>Delivery Location:</strong> {selectedOrder.deliveryLocation}</p>
                  {selectedOrder.roomNumber && (
                    <p><strong>Room Number:</strong> {selectedOrder.roomNumber}</p>
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
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">KES {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>KES {selectedOrder.totalAmount + selectedOrder.deliveryFee}</span>
                  </div>
                  <p className="text-sm text-gray-600">(Includes KES {selectedOrder.deliveryFee} delivery fee)</p>
                </div>
              </div>

              {/* Payment Confirmation */}
              {selectedOrder.paymentStatus === 'PENDING' && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Confirm Payment</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Customer's M-Pesa Code:</strong> {selectedOrder.paymentCode || 'Not provided'}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Verify this code matches the M-Pesa transaction you received
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      className="flex-1 input-field"
                      placeholder="Enter M-Pesa confirmation code"
                    />
                    <button
                      onClick={handleConfirmPayment}
                      className="btn-primary"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Person Information */}
              {selectedOrder.deliveryPerson && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Delivery Person</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                          <Truck className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedOrder.deliveryPerson.fullName}</p>
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone size={14} className="mr-1" />
                            {selectedOrder.deliveryPerson.phoneNumber}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Star size={14} className="mr-1" />
                            {selectedOrder.deliveryPerson.rating}/5.0
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedOrder.deliveryStatus === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                          selectedOrder.deliveryStatus === 'PICKED_UP' ? 'bg-orange-100 text-orange-800' :
                          selectedOrder.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedOrder.deliveryStatus}
                        </span>
                      </div>
                    </div>
                    
                    {/* Delivery Actions */}
                    {selectedOrder.deliveryStatus === 'ASSIGNED' && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex space-x-3">
                          <button
                            onClick={handleConfirmPickup}
                            className="btn-primary flex items-center"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Confirm Pickup
                          </button>
                          <button
                            onClick={() => setShowRejectModal(true)}
                            className="btn-secondary flex items-center"
                          >
                            <XCircle size={16} className="mr-2" />
                            Choose Different Person
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Status Management */}
              {selectedOrder.paymentStatus === 'CONFIRMED' && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Order Status</h4>
                  <div className="flex space-x-2">
                    {selectedOrder.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'PREPARING')}
                        className="btn-primary"
                      >
                        Start Preparing
                      </button>
                    )}
                    {selectedOrder.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'READY_FOR_DELIVERY')}
                        className="btn-primary"
                      >
                        Ready for Delivery
                      </button>
                    )}
                    {selectedOrder.status === 'READY_FOR_DELIVERY' && !selectedOrder.deliveryPerson && (
                      <div className="flex items-center text-yellow-600">
                        <AlertCircle size={16} className="mr-2" />
                        <span className="text-sm">Finding delivery person...</span>
                      </div>
                    )}
                    {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                      <div className="flex items-center text-blue-600">
                        <Truck size={16} className="mr-2" />
                        <span className="text-sm">Out for delivery</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                    setConfirmationCode('');
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Delivery Person Modal */}
        {showRejectModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Different Delivery Person</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for choosing a different delivery person. 
                We'll find another available delivery person for you.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={4}
                  placeholder="e.g., Need someone closer to the location, prefer different delivery person, etc."
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectDelivery}
                  className="flex-1 btn-primary"
                >
                  Find Another Person
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
