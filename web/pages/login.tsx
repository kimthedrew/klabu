import { useState } from 'react';
import Link from 'next/link';
import SEO from '../components/SEO';
import { useRouter } from 'next/router';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');

      // Redirect to T&C acceptance if not yet accepted (version bump)
      if (response.data.termsAccepted === false && response.data.termsVersion) {
        router.push(`/terms-accept?role=${response.data.user.role}&version=${response.data.termsVersion}`);
        return;
      }

      if (response.data.user.role === 'STALL_OWNER') {
        router.push('/dashboard/stall');
      } else if (response.data.user.role === 'DELIVERY_PERSON') {
        router.push('/dashboard/delivery');
      } else if (response.data.user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      }

    } catch (error: any) {
      // Check if admin has approved a password reset for this email
      if (formData.email) {
        try {
          const check = await axios.post(`${API_BASE_URL}/auth/check-reset-status`, { email: formData.email });
          if (check.data.pendingPasswordReset) {
            setPendingReset(true);
            toast('Your password reset was approved. Set a new password below.', { icon: '🔑' });
            setLoading(false);
            return;
          }
        } catch {}
      }
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSettingPassword(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/set-new-password`, {
        email: formData.email,
        newPassword,
      });
      toast.success('Password updated! Please log in.');
      setPendingReset(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  return (
    <>
      <SEO
        title="Login"
        description="Login to your Klabu account"
        canonical="/login"
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="text-4xl font-extrabold text-green-600 tracking-tight">Klabu</span>
            </Link>
            <h2 className="mt-3 text-2xl font-bold text-gray-800">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to continue to your dashboard</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">

            {pendingReset && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-semibold text-green-800 mb-1">Admin approved your password reset</p>
                <p className="text-xs text-green-600 mb-3">Set a new password for <strong>{formData.email}</strong></p>
                <form onSubmit={handleSetNewPassword} className="flex gap-2">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password (min. 6 chars)"
                    className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={settingPassword}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {settingPassword ? '...' : 'Save'}
                  </button>
                </form>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-green-600 hover:text-green-500 font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
