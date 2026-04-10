import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Users,
  Store,
  Truck,
  DollarSign,
  LogOut,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Phone,
  MapPin,
  Clock,
  Star,
  Package,
  User,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';
import NotificationBell from '../../components/NotificationBell';

interface DashboardStats {
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
  deliveryStatus: string;
  mpesaPayerName?: string;
  createdAt: string;
  deliveryAcceptedAt?: string;
  deliveryCompletedAt?: string;
  stall: {
    id: string;
    name: string;
    stallOwner: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
  };
  deliveryPerson?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    rating: number;
  };
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

interface TopStall {
  id: string;
  name: string;
  owner: string;
  totalOrders: number;
  averageRating: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topStalls, setTopStalls] = useState<TopStall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [stkPushEnabled, setStkPushEnabled] = useState(false);
  const [togglingStk, setTogglingStk] = useState(false);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState<number>(50);
  const [deliveryFeeForm, setDeliveryFeeForm] = useState({ deliveryFee: '', deliveryFeeNote: '' });
  const [showDeliveryFeeSection, setShowDeliveryFeeSection] = useState(false);
  const [updatingDeliveryFee, setUpdatingDeliveryFee] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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

    if (parsedUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchDashboardData();
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/payment-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStkPushEnabled(response.data.config.stkPushEnabled);
      setCurrentDeliveryFee(response.data.config.deliveryFee ?? 50);
    } catch (error) {
      console.error('Error fetching payment config:', error);
    }
  };

  const handleUpdateDeliveryFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(deliveryFeeForm.deliveryFee);
    if (isNaN(fee) || fee < 0) {
      toast.error('Please enter a valid delivery fee');
      return;
    }
    setUpdatingDeliveryFee(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_BASE_URL}/admin/payment-config/delivery-fee`,
        { deliveryFee: fee, deliveryFeeNote: deliveryFeeForm.deliveryFeeNote || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentDeliveryFee(response.data.config.deliveryFee);
      toast.success('Delivery fee updated successfully');
      setDeliveryFeeForm({ deliveryFee: '', deliveryFeeNote: '' });
      setShowDeliveryFeeSection(false);
    } catch (error) {
      toast.error('Failed to update delivery fee');
    } finally {
      setUpdatingDeliveryFee(false);
    }
  };

  const handleToggleStkPush = async () => {
    setTogglingStk(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_BASE_URL}/admin/payment-config/stk-push`,
        { enabled: !stkPushEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStkPushEnabled(response.data.config.stkPushEnabled);
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to update STK Push setting');
    } finally {
      setTogglingStk(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats(response.data.stats);
      setRecentOrders(response.data.recentOrders);
      setTopStalls(response.data.topStalls);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (order: RecentOrder) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedOrder(response.data.order);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
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
        <title>Admin Dashboard - Klabu</title>
        <meta name="description" content="Admin dashboard for Klabu platform" />
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
                  <span className="ml-2 text-sm text-gray-500">Admin Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="hidden sm:block text-sm text-gray-600 truncate max-w-[160px]">Welcome, {user?.profile?.fullName || 'Admin'}</span>
                <NotificationBell
                  token={typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''}
                />
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <LogOut size={20} className="mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3">
                  <Store className="text-green-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Stalls</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalStalls || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalOrders || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-full p-3">
                  <Truck className="text-orange-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Delivery Persons</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalDeliveryPersons || 0}</p>
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
                  <p className="text-2xl font-semibold text-gray-900">KES {(stats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-full p-3">
                  <Users className="text-yellow-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Delivery Persons</p>
                  <p className="text-xl font-semibold text-gray-900">{stats?.activeDeliveryPersons || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-red-100 rounded-full p-3">
                  <BarChart3 className="text-red-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-xl font-semibold text-gray-900">{stats?.pendingOrders || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                  <p className="text-xl font-semibold text-gray-900">{stats?.completedOrders || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Orders</h2>
              
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No orders yet</p>
                  <p className="text-sm">Orders will appear here when customers place them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{order.customerName}</h3>
                          <p className="text-sm text-gray-600">{order.stall.name}</p>
                          <p className="text-sm text-gray-600">{order.deliveryLocation}</p>
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
                        <p className="text-sm font-medium text-green-600">
                          KES {order.totalAmount + order.deliveryFee}
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                          <Eye size={14} className="mr-1" />
                          Click to view details
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Performing Stalls */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performing Stalls</h2>
              
              {topStalls.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No stalls yet</p>
                  <p className="text-sm">Stall performance will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topStalls.map((stall, index) => (
                    <div key={stall.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="bg-green-100 rounded-full p-2 mr-3">
                          <span className="text-green-600 font-semibold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{stall.name}</h3>
                          <p className="text-sm text-gray-600">{stall.owner}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{stall.totalOrders} orders</p>
                        <p className="text-sm text-gray-600">⭐ {stall.averageRating.toFixed(1)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/stalls" className="btn-primary flex items-center justify-center">
                <Store size={20} className="mr-2" />
                Manage Stalls
              </Link>
              <Link href="/admin/delivery-persons" className="btn-primary flex items-center justify-center">
                <Truck size={20} className="mr-2" />
                Manage Delivery Persons
              </Link>
              <Link href="/admin/orders" className="btn-primary flex items-center justify-center">
                <BarChart3 size={20} className="mr-2" />
                View All Orders
              </Link>
            </div>
          </div>

          {/* Security Settings */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowPasswordSection(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <Lock size={18} className="text-gray-600" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                  <p className="text-sm text-gray-500">Change your admin account password</p>
                </div>
              </div>
              {showPasswordSection ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            {showPasswordSection && (
              <form onSubmit={handleChangePassword} className="mt-6 space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowCurrentPw(p => !p)}
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      required
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowNewPw(p => !p)}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Repeat new password"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordSection(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Payment Settings */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Settings</h2>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">STK Push Payments</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {stkPushEnabled
                    ? 'Customers can pay via M-Pesa STK Push prompt on their phone.'
                    : 'STK Push is disabled. Customers pay manually and enter their M-Pesa name.'}
                </p>
              </div>
              <button
                onClick={handleToggleStkPush}
                disabled={togglingStk}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  stkPushEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {stkPushEnabled
                  ? <ToggleRight size={24} className="text-green-600" />
                  : <ToggleLeft size={24} className="text-gray-400" />}
                <span>{togglingStk ? 'Updating...' : stkPushEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            <div className="mt-4 border border-gray-200 rounded-lg">
              <button
                className="w-full flex items-center justify-between p-4"
                onClick={() => {
                  setShowDeliveryFeeSection(prev => !prev);
                  setDeliveryFeeForm({ deliveryFee: String(currentDeliveryFee), deliveryFeeNote: '' });
                }}
              >
                <div>
                  <h3 className="font-medium text-gray-900 text-left">Delivery Fee</h3>
                  <p className="text-sm text-gray-500 mt-1">Current fee: KES {currentDeliveryFee}</p>
                </div>
                {showDeliveryFeeSection ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>

              {showDeliveryFeeSection && (
                <form onSubmit={handleUpdateDeliveryFee} className="px-4 pb-4 space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Delivery Fee (KES)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={deliveryFeeForm.deliveryFee}
                      onChange={e => setDeliveryFeeForm(f => ({ ...f, deliveryFee: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
                    <input
                      type="text"
                      value={deliveryFeeForm.deliveryFeeNote}
                      onChange={e => setDeliveryFeeForm(f => ({ ...f, deliveryFeeNote: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g. Peak hours adjustment"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={updatingDeliveryFee}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingDeliveryFee ? 'Saving...' : 'Update Fee'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeliveryFeeSection(false); setDeliveryFeeForm({ deliveryFee: '', deliveryFeeNote: '' }); }}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Details - #{selectedOrder.id.slice(-8)}</h3>
              
              {/* Order Status Overview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Order Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedOrder.paymentStatus === 'CONFIRMED' 
                        ? 'text-green-600 bg-green-100' 
                        : 'text-yellow-600 bg-yellow-100'
                    }`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Delivery Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedOrder.deliveryStatus === 'DELIVERED' ? 'text-green-600 bg-green-100' :
                      selectedOrder.deliveryStatus === 'PICKED_UP' ? 'text-orange-600 bg-orange-100' :
                      selectedOrder.deliveryStatus === 'ASSIGNED' ? 'text-blue-600 bg-blue-100' :
                      'text-gray-600 bg-gray-100'
                    }`}>
                      {selectedOrder.deliveryStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <User size={20} className="mr-2" />
                      Customer Information
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                      <div className="flex items-center">
                        <Phone size={16} className="mr-2 text-gray-600" />
                        <strong>Phone:</strong> {selectedOrder.customerPhone}
                      </div>
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-2 text-gray-600" />
                        <strong>Location:</strong> {selectedOrder.deliveryLocation}
                      </div>
                      {selectedOrder.roomNumber && (
                        <p><strong>Room:</strong> {selectedOrder.roomNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Stall Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Store size={20} className="mr-2" />
                      Stall Information
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      <p><strong>Stall Name:</strong> {selectedOrder.stall.name}</p>
                      <p><strong>Owner:</strong> {selectedOrder.stall.stallOwner.fullName}</p>
                      <div className="flex items-center">
                        <Phone size={16} className="mr-2 text-gray-600" />
                        <strong>Phone:</strong> {selectedOrder.stall.stallOwner.phoneNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Person & Order Details */}
                <div className="space-y-6">
                  {/* Delivery Person Information */}
                  {selectedOrder.deliveryPerson ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Truck size={20} className="mr-2" />
                        Delivery Person
                      </h4>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                        <p><strong>Name:</strong> {selectedOrder.deliveryPerson.fullName}</p>
                        <div className="flex items-center">
                          <Phone size={16} className="mr-2 text-gray-600" />
                          <strong>Phone:</strong> {selectedOrder.deliveryPerson.phoneNumber}
                        </div>
                        <div className="flex items-center">
                          <Star size={16} className="mr-2 text-yellow-500" />
                          <strong>Rating:</strong> {selectedOrder.deliveryPerson.rating}/5.0
                        </div>
                        {selectedOrder.deliveryAcceptedAt && (
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-gray-600" />
                            <strong>Accepted:</strong> {new Date(selectedOrder.deliveryAcceptedAt).toLocaleString()}
                          </div>
                        )}
                        {selectedOrder.deliveryCompletedAt && (
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-gray-600" />
                            <strong>Completed:</strong> {new Date(selectedOrder.deliveryCompletedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Truck size={20} className="mr-2" />
                        Delivery Person
                      </h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">No delivery person assigned yet</p>
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Package size={20} className="mr-2" />
                      Order Summary
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span>Order Total:</span>
                        <span className="font-medium">KES {selectedOrder.totalAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span className="font-medium">KES {selectedOrder.deliveryFee}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total Amount:</span>
                        <span className="text-green-600">KES {selectedOrder.totalAmount + selectedOrder.deliveryFee}</span>
                      </div>
                      {selectedOrder.mpesaPayerName && (
                        <div className="border-t pt-2">
                          <p className="text-sm text-gray-600">
                            <strong>M-Pesa Payer Name:</strong> {selectedOrder.mpesaPayerName}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.menuItem.name}</p>
                        {item.menuItem.description && (
                          <p className="text-sm text-gray-600">{item.menuItem.description}</p>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">KES {item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Order Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2 text-gray-600" />
                    <span><strong>Order Placed:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedOrder.deliveryAcceptedAt && (
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-600" />
                      <span><strong>Delivery Accepted:</strong> {new Date(selectedOrder.deliveryAcceptedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.deliveryCompletedAt && (
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-600" />
                      <span><strong>Order Delivered:</strong> {new Date(selectedOrder.deliveryCompletedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
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
