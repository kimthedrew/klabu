import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Star, 
  LogOut,
  CheckCircle,
  XCircle,
  Phone,
  User,
  Package,
  AlertCircle,
  Bell
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { API_BASE_URL, API_URL } from '../../lib/config';

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
  stall: {
    id: string;
    name: string;
    stallOwner: {
      fullName: string;
      phoneNumber: string;
    };
  };
}

interface DeliveryAssignment {
  id: string;
  orderId: string;
  status: string;
  assignedAt: string;
  expiresAt: string;
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryLocation: string;
    roomNumber?: string;
    totalAmount: number;
    deliveryFee: number;
    stall: {
      id: string;
      name: string;
      stallOwner: {
        fullName: string;
        phoneNumber: string;
      };
    };
    items: any[];
  };
}

export default function DeliveryDashboard() {
  const [user, setUser] = useState<any>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
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

    if (parsedUser.role !== 'DELIVERY_PERSON') {
      router.push('/login');
      return;
    }

    fetchDeliveryData();

    // Initialize socket connection
    const socketConnection = io(API_URL);
    setSocket(socketConnection);

    // Join delivery person room for real-time notifications
    if (parsedUser.profile?.id) {
      socketConnection.emit('join-delivery', parsedUser.profile.id);
    }

    // Listen for delivery assignment events
    socketConnection.on('delivery-assignment', (data) => {
      // Play notification sound (optional)
      toast.success(`🔔 New delivery from ${data.stallName}! KES ${data.deliveryFee} delivery fee`, {
        duration: 10000,
        icon: '🚚'
      });
      fetchPendingAssignments(); // Refresh pending assignments
    });

    socketConnection.on('delivery-picked-up', (data) => {
      toast.success('Order has been picked up by stall owner');
      fetchDeliveries(); // Refresh deliveries
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // Update current time every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      
      // Auto-refresh pending assignments when any timer expires
      if (pendingAssignments.some(a => new Date(a.expiresAt).getTime() <= Date.now())) {
        fetchPendingAssignments();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingAssignments]);

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/deliveries/my-deliveries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeliveries(response.data.orders);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  const fetchPendingAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/deliveries/pending-assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPendingAssignments(response.data.assignments);
    } catch (error) {
      console.error('Error fetching pending assignments:', error);
    }
  };

  const fetchDeliveryData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/deliveries/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeliveryPerson(response.data.deliveryPerson);
      setIsActive(response.data.deliveryPerson.isActive);
      fetchDeliveries();
      fetchPendingAssignments();
    } catch (error) {
      console.error('Error fetching delivery data:', error);
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };


  const toggleActiveStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/deliveries/toggle-status`, 
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsActive(!isActive);
      toast.success(`You are now ${!isActive ? 'active' : 'inactive'} for deliveries`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const acceptDelivery = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/deliveries/accept`, 
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery accepted successfully');
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept delivery');
    }
  };

  const updateDeliveryStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/deliveries/${orderId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery status updated');
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const acceptAssignment = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/deliveries/accept-assignment`, 
        { assignmentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery assignment accepted!');
      fetchPendingAssignments();
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept assignment');
    }
  };

  const rejectAssignment = async (assignmentId: string) => {
    const reason = prompt('Please provide a reason for rejecting this delivery:');
    if (!reason || !reason.trim()) {
      toast.error('Reason is required to reject delivery');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/deliveries/reject-assignment`, 
        { assignmentId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Delivery assignment rejected');
      fetchPendingAssignments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject assignment');
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
      case 'ASSIGNED': return 'text-blue-600 bg-blue-100';
      case 'ACCEPTED': return 'text-purple-600 bg-purple-100';
      case 'PICKED_UP': return 'text-orange-600 bg-orange-100';
      case 'DELIVERED': return 'text-green-600 bg-green-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Delivery Dashboard - Klabu</title>
        <meta name="description" content="Manage your deliveries" />
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
                  <span className="ml-2 text-sm text-gray-500">Delivery Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.profile?.fullName}</span>
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
          {deliveryPerson && !deliveryPerson.isApproved && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">Pending Admin Approval</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    Your account is currently pending approval from the administrator. 
                    You won't be able to accept deliveries until your account is approved. 
                    This usually takes 24-48 hours. We'll notify you once approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Toggle */}
          <div className="card mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`rounded-full p-3 mr-4 ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Truck className={`${isActive ? 'text-green-600' : 'text-gray-400'}`} size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Delivery Status
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isActive ? 'You are active and receiving delivery requests' : 'You are inactive and not receiving requests'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleActiveStatus}
                disabled={!deliveryPerson?.isApproved}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !deliveryPerson?.isApproved
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : isActive 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {!deliveryPerson?.isApproved 
                  ? 'Pending Approval' 
                  : isActive ? 'Go Offline' : 'Go Online'
                }
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <Package className="text-blue-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                  <p className="text-lg font-semibold text-gray-900">{deliveryPerson?.totalDeliveries || 0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-full p-3">
                  <Star className="text-yellow-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-lg font-semibold text-gray-900">{deliveryPerson?.rating || 5.0}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => d.deliveryStatus === 'DELIVERED' && 
                      new Date(d.createdAt).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 rounded-full p-3">
                  <Clock className="text-orange-600" size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deliveries.filter(d => ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(d.deliveryStatus)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Assignments */}
          {pendingAssignments.length > 0 && (
            <div className="card mb-8">
              <div className="flex items-center mb-6">
                <Bell className="text-orange-600 mr-2" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Pending Delivery Requests</h2>
                <span className="ml-2 bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                  {pendingAssignments.length}
                </span>
              </div>
              
              <div className="space-y-4">
                {pendingAssignments.map((assignment) => {
                  const timeRemaining = Math.max(0, Math.floor((new Date(assignment.expiresAt).getTime() - currentTime) / 1000));
                  const minutes = Math.floor(timeRemaining / 60);
                  const seconds = timeRemaining % 60;
                  const isExpiring = timeRemaining <= 30;
                  
                  return (
                    <div key={assignment.id} className={`p-6 border-2 rounded-lg transition-colors ${
                      isExpiring ? 'border-red-300 bg-red-50' : 'border-orange-200 bg-orange-50'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">{assignment.order.customerName}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Phone size={16} className="mr-1" />
                            {assignment.order.customerPhone}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin size={16} className="mr-1" />
                            {assignment.order.deliveryLocation}
                          </div>
                          {assignment.order.roomNumber && (
                            <div className="text-sm text-gray-600 mt-1">
                              Room: {assignment.order.roomNumber}
                            </div>
                          )}
                          <div className="text-sm text-gray-600 mt-1">
                            From: {assignment.order.stall.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold mb-1 ${
                            isExpiring ? 'text-red-600 animate-pulse' : 'text-orange-600'
                          }`}>
                            {timeRemaining === 0 ? 'EXPIRED' : `${minutes}:${seconds.toString().padStart(2, '0')}`}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isExpiring ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {timeRemaining === 0 ? 'EXPIRED' : 'PENDING'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Order Total</p>
                          <p className="font-medium text-green-600">
                            KES {assignment.order.totalAmount + assignment.order.deliveryFee}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Delivery Fee</p>
                          <p className="font-medium text-blue-600">
                            KES {assignment.order.deliveryFee}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => acceptAssignment(assignment.id)}
                          disabled={timeRemaining === 0}
                          className={`flex items-center flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                            timeRemaining === 0 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          <CheckCircle size={16} className="mr-2" />
                          {timeRemaining === 0 ? 'Expired' : 'Accept Delivery'}
                        </button>
                        <button
                          onClick={() => rejectAssignment(assignment.id)}
                          disabled={timeRemaining === 0}
                          className={`flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
                            timeRemaining === 0 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          <XCircle size={16} className="mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deliveries */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Deliveries</h2>
            
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Truck size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No deliveries yet</p>
                <p className="text-sm">Deliveries will appear here when you accept them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDelivery(delivery)}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{delivery.customerName}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Phone size={16} className="mr-1" />
                          {delivery.customerPhone}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin size={16} className="mr-1" />
                          {delivery.deliveryLocation}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(delivery.deliveryStatus)}`}>
                        {delivery.deliveryStatus}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Order Total</p>
                        <p className="font-medium text-green-600">
                          KES {delivery.totalAmount + delivery.deliveryFee}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      {delivery.deliveryStatus === 'ASSIGNED' && (
                        <button
                          onClick={() => acceptDelivery(delivery.id)}
                          className="btn-primary flex items-center"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Accept Delivery
                        </button>
                      )}
                      
                      {delivery.deliveryStatus === 'ACCEPTED' && (
                        <button
                          onClick={() => updateDeliveryStatus(delivery.id, 'PICKED_UP')}
                          className="btn-primary flex items-center"
                        >
                          <Package size={16} className="mr-2" />
                          Mark as Picked Up
                        </button>
                      )}
                      
                      {delivery.deliveryStatus === 'PICKED_UP' && (
                        <button
                          onClick={() => updateDeliveryStatus(delivery.id, 'DELIVERED')}
                          className="btn-primary flex items-center"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Mark as Delivered
                        </button>
                      )}
                      
                      {delivery.deliveryStatus === 'DELIVERED' && (
                        <div className="flex items-center text-green-600">
                          <CheckCircle size={16} className="mr-2" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Delivery Details Modal */}
          {selectedDelivery && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">Delivery Details</h3>
                  <button onClick={() => setSelectedDelivery(null)} className="text-gray-500 hover:text-gray-700">Close</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="card p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Customer</h4>
                    <p className="text-sm text-gray-700"><strong>Name:</strong> {selectedDelivery.customerName}</p>
                    <p className="text-sm text-gray-700 flex items-center"><Phone size={14} className="mr-1" />{selectedDelivery.customerPhone}</p>
                    <p className="text-sm text-gray-700 flex items-center"><MapPin size={14} className="mr-1" />{selectedDelivery.deliveryLocation}</p>
                    {selectedDelivery.roomNumber && (<p className="text-sm text-gray-700"><strong>Room:</strong> {selectedDelivery.roomNumber}</p>)}
                  </div>
                  <div className="card p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Order</h4>
                    <p className="text-sm text-gray-700"><strong>Status:</strong> {selectedDelivery.status}</p>
                    <p className="text-sm text-gray-700"><strong>Payment:</strong> {selectedDelivery.paymentStatus}</p>
                    <p className="text-sm text-gray-700"><strong>Delivery Status:</strong> {selectedDelivery.deliveryStatus}</p>
                    <p className="text-sm text-gray-700"><strong>Created:</strong> {new Date(selectedDelivery.createdAt).toLocaleString()}</p>
                    
                  </div>
                </div>
                <div className="card p-4 mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Stall</h4>
                  <p className="text-sm text-gray-700"><strong>Name:</strong> {selectedDelivery.stall.name}</p>
                  <p className="text-sm text-gray-700"><strong>Owner:</strong> {selectedDelivery.stall.stallOwner.fullName}</p>
                  <p className="text-sm text-gray-700 flex items-center"><Phone size={14} className="mr-1" />{selectedDelivery.stall.stallOwner.phoneNumber}</p>
                </div>
                <div className="card p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Item</th>
                          <th className="py-2 pr-4">Qty</th>
                          <th className="py-2 pr-4">Price</th>
                          <th className="py-2 pr-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDelivery.items.map((it) => (
                          <tr key={it.id} className="border-t">
                            <td className="py-2 pr-4">{it.menuItem.name}</td>
                            <td className="py-2 pr-4">{it.quantity}</td>
                            <td className="py-2 pr-4">KES {it.price}</td>
                            <td className="py-2 pr-4">KES {it.price * it.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
