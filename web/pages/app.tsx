import { useState } from 'react';
import Link from 'next/link';
import SEO from '../components/SEO';
import { Store, Truck, LogIn } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/config';
import { TERMS_VERSIONS, STALL_OWNER_TERMS, DELIVERY_PERSON_TERMS } from '../lib/terms';

const inputClass =
  'w-full px-4 py-3 bg-background border border-muted/40 rounded-button text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors';
const labelClass = 'block text-sm font-medium text-app-text mb-2';

export default function App() {
  const [userType, setUserType] = useState<'stall' | 'delivery' | null>(null);

  return (
    <>
      <SEO
        title="For Stall Owners & Delivery Persons"
        description="Register your food stall at UON on Klabu, or sign up as a delivery person. Join the University of Nairobi's campus food delivery platform."
        canonical="/app"
      />

      <div className="min-h-screen bg-background font-body">
        {/* Header */}
        <header className="bg-surface border-b border-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/" className="flex items-center">
                <h1 className="font-heading text-2xl text-primary">Klabu</h1>
                <span className="ml-2 text-sm text-muted">App</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!userType ? (
            <div className="text-center">
              <h2 className="font-heading text-3xl text-app-text mb-4">
                Join Klabu Platform
              </h2>
              <p className="text-lg text-muted mb-12">
                Choose how you want to participate in the Klabu food delivery platform
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stall Owner Card */}
                <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-pill w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Store className="text-primary" size={32} />
                    </div>
                    <h3 className="font-heading text-2xl text-app-text mb-4">Stall Owner</h3>
                    <p className="text-muted mb-6">
                      Register your food stall and start receiving orders from students.
                      Manage your menu, track orders, and grow your business.
                    </p>
                    <ul className="text-left text-sm text-muted mb-8 space-y-2">
                      <li>• Create and manage your stall profile</li>
                      <li>• Add and update your menu items</li>
                      <li>• Receive and confirm orders</li>
                      <li>• Track your sales and reviews</li>
                    </ul>
                    <button
                      onClick={() => setUserType('stall')}
                      className="w-full bg-primary text-surface py-3 rounded-button hover:bg-primary/90 transition-colors font-semibold"
                    >
                      Register as Stall Owner
                    </button>
                  </div>
                </div>

                {/* Delivery Person Card */}
                <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="bg-accent/15 rounded-pill w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Truck className="text-accent" size={32} />
                    </div>
                    <h3 className="font-heading text-2xl text-app-text mb-4">Delivery Person</h3>
                    <p className="text-muted mb-6">
                      Earn money by delivering food to students. Work flexible hours
                      and be part of the Klabu delivery network.
                    </p>
                    <ul className="text-left text-sm text-muted mb-8 space-y-2">
                      <li>• Flexible working hours</li>
                      <li>• Earn per delivery</li>
                      <li>• Work when you want</li>
                      <li>• Build your delivery rating</li>
                    </ul>
                    <button
                      onClick={() => setUserType('delivery')}
                      className="w-full bg-primary text-surface py-3 rounded-button hover:bg-primary/90 transition-colors font-semibold"
                    >
                      Register as Delivery Person
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Section */}
              <div className="mt-12 bg-surface rounded-card shadow-soft border border-muted/20 p-8">
                <h3 className="font-heading text-xl text-app-text mb-4 text-center">
                  Already have an account?
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/login"
                    className="flex items-center justify-center px-6 py-3 border border-muted/40 rounded-button text-app-text hover:bg-background transition-colors"
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!termsAccepted) {
      alert('Please accept the Terms & Conditions to continue.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...registrationData } = formData;
      await axios.post(`${API_BASE_URL}/auth/register`, {
        ...registrationData,
        role: 'STALL_OWNER',
        termsAccepted: true,
        termsVersion: TERMS_VERSIONS.STALL_OWNER
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
      <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 px-3 py-2 hover:bg-background rounded-button text-app-text transition-colors"
          >
            ← Back
          </button>
          <h2 className="font-heading text-2xl text-app-text">Stall Owner Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Business Name (Optional)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Payment Details Section */}
          <div className="border-t border-muted/20 pt-6">
            <h3 className="font-heading text-lg text-app-text mb-4">Payment Details</h3>

            <div>
              <label className={labelClass}>Payment Mode *</label>
              <select
                required
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className={inputClass}
              >
                <option value="">Select payment mode</option>
                <option value="MPESA">M-Pesa</option>
              </select>
            </div>

            {formData.paymentMode === 'MPESA' && (
              <>
                <div className="mt-4">
                  <label className={labelClass}>M-Pesa Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mpesaNumber}
                    onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., 254712345678"
                  />
                </div>

                <div className="mt-4">
                  <label className={labelClass}>M-Pesa Till Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.tillNumber}
                    onChange={(e) => setFormData({ ...formData, tillNumber: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., 123456"
                  />
                  <p className="text-sm text-muted mt-1">
                    If you have a business till number, enter it here. Otherwise, customers will pay to your phone number.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Confirm Password *</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* T&C */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-app-text">
                I agree to the{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-primary underline hover:text-primary/80">
                  Stall Owner Terms &amp; Conditions
                </button>
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-muted/40 rounded-button text-app-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="flex-1 bg-primary text-surface py-3 rounded-button hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* T&C Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-app-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-card shadow-soft p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-heading text-lg text-app-text mb-4">Stall Owner Terms &amp; Conditions</h3>
            <pre className="text-sm text-app-text whitespace-pre-wrap font-body">{STALL_OWNER_TERMS}</pre>
            <button onClick={() => { setTermsAccepted(true); setShowTerms(false); }} className="mt-6 w-full bg-primary text-surface py-2.5 rounded-button hover:bg-primary/90 font-semibold">I Accept</button>
            <button onClick={() => setShowTerms(false)} className="mt-2 w-full border border-muted/40 py-2.5 rounded-button text-app-text hover:bg-background">Close</button>
          </div>
        </div>
      )}
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!termsAccepted) {
      alert('Please accept the Terms & Conditions to continue.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...registrationData } = formData;
      await axios.post(`${API_BASE_URL}/auth/register`, {
        ...registrationData,
        role: 'DELIVERY_PERSON',
        termsAccepted: true,
        termsVersion: TERMS_VERSIONS.DELIVERY_PERSON
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
      <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 px-3 py-2 hover:bg-background rounded-button text-app-text transition-colors"
          >
            ← Back
          </button>
          <h2 className="font-heading text-2xl text-app-text">Delivery Person Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>ID Number / Registration Number *</label>
            <input
              type="text"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Confirm Password *</label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* T&C */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-app-text">
                I agree to the{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-primary underline hover:text-primary/80">
                  Delivery Person Terms &amp; Conditions
                </button>
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-muted/40 rounded-button text-app-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="flex-1 bg-primary text-surface py-3 rounded-button hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* T&C Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-app-text/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-card shadow-soft p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="font-heading text-lg text-app-text mb-4">Delivery Person Terms &amp; Conditions</h3>
            <pre className="text-sm text-app-text whitespace-pre-wrap font-body">{DELIVERY_PERSON_TERMS}</pre>
            <button onClick={() => { setTermsAccepted(true); setShowTerms(false); }} className="mt-6 w-full bg-primary text-surface py-2.5 rounded-button hover:bg-primary/90 font-semibold">I Accept</button>
            <button onClick={() => setShowTerms(false)} className="mt-2 w-full border border-muted/40 py-2.5 rounded-button text-app-text hover:bg-background">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
