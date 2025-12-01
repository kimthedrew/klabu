import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  Star, 
  Phone, 
  MapPin, 
  Clock, 
  ShoppingCart,
  Plus,
  Minus
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

interface Stall {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  menuItems: MenuItem[];
  stallOwner: {
    fullName: string;
    businessName?: string;
    phoneNumber: string;
    photo?: string;
    stallPhoto?: string;
    paymentMode?: string;
    mpesaNumber?: string;
    tillNumber?: string;
  };
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export default function StallPage() {
  const [stall, setStall] = useState<Stall | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryLocation: '',
    roomNumber: '',
    mpesaConfirmationCode: '',
    paymentMethod: 'STK_PUSH' // Default to STK Push
  });
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      fetchStall();
    }
  }, [id]);

  const fetchStall = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stalls/${id}`);
      setStall(response.data);
    } catch (error) {
      console.error('Error fetching stall:', error);
      toast.error('Failed to load stall details');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (menuItem: MenuItem) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menuItem.id === menuItem.id);
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    toast.success(`${menuItem.name} added to cart`);
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(item => item.menuItem.id !== menuItemId));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      const orderData = {
        stallId: stall!.id,
        customerName: orderForm.customerName,
        customerPhone: orderForm.customerPhone,
        deliveryLocation: orderForm.deliveryLocation,
        roomNumber: orderForm.roomNumber,
        mpesaConfirmationCode: orderForm.mpesaConfirmationCode,
        paymentMethod: orderForm.paymentMethod,
        items: cart.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity
        }))
      };

      const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
      
      // If STK Push is selected, initiate payment
      if (orderForm.paymentMethod === 'STK_PUSH') {
        try {
          const stkResponse = await axios.post(`${API_BASE_URL}/payments/stk-push`, {
            orderId: response.data.order.id,
            phoneNumber: orderForm.customerPhone
          });

          toast.success('Payment request sent to your phone! Please check your phone and enter your M-Pesa PIN to complete the payment.');
          
          // Show payment status
          alert(`Order ID: ${response.data.order.id}\nTotal: KES ${response.data.order.totalAmount + 50}\n\n${stkResponse.data.customerMessage}\n\nPlease complete the payment on your phone to confirm your order.`);
          
        } catch (stkError: any) {
          toast.error(stkError.response?.data?.error || 'Failed to initiate payment');
          return;
        }
      } else {
        toast.success('Order placed successfully!');
        alert(`Order ID: ${response.data.order.id}\nTotal: KES ${response.data.order.totalAmount + 50}\n\nYour order has been placed! The stall owner will verify your payment and confirm the order. You'll be notified when your order is confirmed and on its way.`);
      }

      setCart([]);
      setShowOrderModal(false);
      setOrderForm({ customerName: '', customerPhone: '', deliveryLocation: '', roomNumber: '', mpesaConfirmationCode: '', paymentMethod: 'STK_PUSH' });
      
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Stall not found</h1>
          <Link href="/" className="btn-primary">Go back home</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{stall.name} - Klabu</title>
        <meta name="description" content={`Order from ${stall.name} on Klabu`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                  <ArrowLeft size={20} className="mr-2" />
                  Back
                </Link>
                <h1 className="text-2xl font-bold text-green-600">Klabu</h1>
              </div>
              <button
                onClick={() => setShowOrderModal(true)}
                className="btn-primary flex items-center relative"
                disabled={cart.length === 0}
              >
                <ShoppingCart size={20} className="mr-2" />
                Order ({cart.length})
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stall Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {stall.stallOwner.stallPhoto && (
                <div className="md:w-1/3">
                  <img
                    src={stall.stallOwner.stallPhoto}
                    alt={stall.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{stall.name}</h1>
                <p className="text-gray-600 mb-4">{stall.stallOwner.fullName}</p>
                
                {stall.description && (
                  <p className="text-gray-700 mb-4">{stall.description}</p>
                )}
                
                <div className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Phone size={20} className="mr-2" />
                    <span>{stall.stallOwner.phoneNumber}</span>
                  </div>
                  
                  {stall.averageRating > 0 && (
                    <div className="flex items-center text-yellow-500">
                      <Star size={20} className="mr-1" />
                      <span className="font-medium">{stall.averageRating}</span>
                      <span className="text-gray-500 ml-1">({stall.totalReviews} reviews)</span>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                {stall.stallOwner.paymentMode === 'MPESA' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-800 mb-2">Payment Information</h4>
                    <div className="text-sm text-green-700">
                      <p><strong>Payment Mode:</strong> M-Pesa</p>
                      {stall.stallOwner.tillNumber ? (
                        <p><strong>M-Pesa Till:</strong> {stall.stallOwner.tillNumber}</p>
                      ) : (
                        <p><strong>M-Pesa Number:</strong> {stall.stallOwner.mpesaNumber}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stall.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stall.isActive ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stall.menuItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                    )}
                    <p className="text-2xl font-bold text-green-600">KES {item.price}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.isAvailable 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  
                  {item.isAvailable && (
                    <button
                      onClick={() => addToCart(item)}
                      className="btn-primary flex items-center"
                    >
                      <Plus size={16} className="mr-1" />
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Place Your Order</h3>
              
              {/* Cart Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Your Order</h4>
                {cart.map((item) => (
                  <div key={item.menuItem.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.menuItem.name}</p>
                      <p className="text-sm text-gray-600">KES {item.menuItem.price} each</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>KES {getTotalAmount() + 50}</span>
                  </div>
                  <p className="text-sm text-gray-600">(Includes KES 50 delivery fee)</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              {stall && stall.stallOwner.paymentMode === 'MPESA' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-800 mb-3">Payment Method</h4>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="STK_PUSH"
                        checked={orderForm.paymentMethod === 'STK_PUSH'}
                        onChange={(e) => setOrderForm({...orderForm, paymentMethod: e.target.value})}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-700">
                        <strong>STK Push (Recommended)</strong> - We'll send a payment request to your phone
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="MANUAL"
                        checked={orderForm.paymentMethod === 'MANUAL'}
                        onChange={(e) => setOrderForm({...orderForm, paymentMethod: e.target.value})}
                        className="mr-2"
                      />
                      <span className="text-sm text-blue-700">
                        <strong>Manual Payment</strong> - Pay manually and enter confirmation code
                      </span>
                    </label>
                  </div>
                  
                  {orderForm.paymentMethod === 'MANUAL' && (
                    <div className="mt-3 text-sm text-blue-700">
                      <p className="font-medium">Pay KES {getTotalAmount() + 50} to:</p>
                      {stall.stallOwner.tillNumber ? (
                        <p><strong>M-Pesa Till:</strong> {stall.stallOwner.tillNumber}</p>
                      ) : (
                        <p><strong>M-Pesa Number:</strong> {stall.stallOwner.mpesaNumber}</p>
                      )}
                      <p className="mt-2 text-xs">After payment, you'll receive a confirmation code. Enter it below to complete your order.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Order Form */}
              <form onSubmit={handleOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm({...orderForm, customerPhone: e.target.value})}
                    className="input-field"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.deliveryLocation}
                    onChange={(e) => setOrderForm({...orderForm, deliveryLocation: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Hostel 5, Room 201"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={orderForm.roomNumber}
                    onChange={(e) => setOrderForm({...orderForm, roomNumber: e.target.value})}
                    className="input-field"
                    placeholder="Room number (optional)"
                  />
                </div>

                {/* M-Pesa Confirmation Code - Only for manual payments */}
                {stall && stall.stallOwner.paymentMode === 'MPESA' && orderForm.paymentMethod === 'MANUAL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      M-Pesa Confirmation Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderForm.mpesaConfirmationCode}
                      onChange={(e) => setOrderForm({...orderForm, mpesaConfirmationCode: e.target.value})}
                      className="input-field"
                      placeholder="Enter the M-Pesa confirmation code"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the code you received after making the M-Pesa payment
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    Place Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
