import { useState } from 'react';
import Link from 'next/link';
import SEO from '../components/SEO';
import { Store, Truck, User, LogIn, UserPlus } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/config';

export default function App() {
  const [userType, setUserType] = useState<'stall' | 'delivery' | null>(null);

  return (
    <>
      <SEO
        title="For Stall Owners & Delivery Persons"
        description="Register your food stall at UON on Klabu, or sign up as a delivery person. Join the University of Nairobi's campus food delivery platform."
        canonical="/app"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-green-600">Klabu</h1>
                <span className="ml-2 text-sm text-gray-500">App</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!userType ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Join Klabu Platform
              </h2>
              <p className="text-lg text-gray-600 mb-12">
                Choose how you want to participate in the Klabu food delivery platform
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stall Owner Card */}
                <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Store className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Stall Owner</h3>
                    <p className="text-gray-600 mb-6">
                      Register your food stall and start receiving orders from students. 
                      Manage your menu, track orders, and grow your business.
                    </p>
                    <ul className="text-left text-sm text-gray-600 mb-8 space-y-2">
                      <li>• Create and manage your stall profile</li>
                      <li>• Add and update your menu items</li>
                      <li>• Receive and confirm orders</li>
                      <li>• Track your sales and reviews</li>
                    </ul>
                    <button
                      onClick={() => setUserType('stall')}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Register as Stall Owner
                    </button>
                  </div>
                </div>

                {/* Delivery Person Card */}
                <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Truck className="text-blue-600" size={32} />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Delivery Person</h3>
                    <p className="text-gray-600 mb-6">
                      Earn money by delivering food to students. Work flexible hours 
                      and be part of the Klabu delivery network.
                    </p>
                    <ul className="text-left text-sm text-gray-600 mb-8 space-y-2">
                      <li>• Flexible working hours</li>
                      <li>• Earn per delivery</li>
                      <li>• Work when you want</li>
                      <li>• Build your delivery rating</li>
                    </ul>
                    <button
                      onClick={() => setUserType('delivery')}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Register as Delivery Person
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Section */}
              <div className="mt-12 bg-white rounded-lg shadow-lg p-8 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                  Already have an account?
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/login"
                    className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <LogIn size={20} className="mr-2" />
                    Login
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {userType === 'stall' ? (
                <StallOwnerRegistration onBack={() => setUserType(null)} />
              ) : (
                <DeliveryPersonRegistration onBack={() => setUserType(null)} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StallOwnerRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    businessName: '',
    phoneNumber: '',
    paymentMode: '',
    mpesaNumber: '',
    tillNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const { confirmPassword, ...registrationData } = formData;
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...registrationData,
        role: 'STALL_OWNER'
      });
      
      alert('Registration successful! Your account needs admin approval before you can start operating. You will be notified once approved. Please login to check your status.');
      window.location.href = '/login';
    } catch (error: any) {
      alert(error.response?.data?.error || 'Registration failed');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Stall Owner Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name (Optional)
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Payment Details Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode *
              </label>
              <select
                required
                value={formData.paymentMode}
                onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select payment mode</option>
                <option value="MPESA">M-Pesa</option>
              </select>
            </div>

            {formData.paymentMode === 'MPESA' && (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mpesaNumber}
                    onChange={(e) => setFormData({...formData, mpesaNumber: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 254712345678"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa Till Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tillNumber}
                    onChange={(e) => setFormData({...formData, tillNumber: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 123456"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    If you have a business till number, enter it here. Otherwise, customers will pay to your phone number.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryPersonRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    idNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const { confirmPassword, ...registrationData } = formData;
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        ...registrationData,
        role: 'DELIVERY_PERSON'
      });
      
      alert('Registration successful! Your account needs admin approval before you can start accepting deliveries. You will be notified once approved. Please login to check your status.');
      window.location.href = '/login';
    } catch (error: any) {
      alert(error.response?.data?.error || 'Registration failed');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Delivery Person Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Number / Registration Number *
            </label>
            <input
              type="text"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
