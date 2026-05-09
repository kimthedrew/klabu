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
      const role = response.data.user.role;

      // Customer accounts belong on /customer/login — reject here so they don't
      // get bounced into a redirect loop (this page sets `token`/`user`, but
      // /customer/orders looks for `customerToken`/`customerUser`).
      if (role === 'CUSTOMER' || role === 'STUDENT') {
        toast.error('That looks like a customer account. Use the customer sign-in page.');
        router.push('/customer/login');
        return;
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');

      // Redirect to T&C acceptance if not yet accepted (version bump)
      if (response.data.termsAccepted === false && response.data.termsVersion) {
        router.push(`/terms-accept?role=${role}&version=${response.data.termsVersion}`);
        return;
      }

      if (role === 'STALL_OWNER') {
        router.push('/dashboard/stall');
      } else if (role === 'DELIVERY_PERSON') {
        router.push('/dashboard/delivery');
      } else if (role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/');
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

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 font-body">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="font-heading text-4xl text-primary tracking-tight">Klabu</span>
            </Link>
            <h2 className="mt-3 font-heading text-2xl text-app-text">Welcome back</h2>
            <p className="mt-1 text-sm text-muted">Sign in to continue to your dashboard</p>
          </div>

          {/* Card */}
          <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8">

            {pendingReset && (
              <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-card">
                <p className="text-sm font-semibold text-accent mb-1">Admin approved your password reset</p>
                <p className="text-xs text-muted mb-3">Set a new password for <strong className="text-app-text">{formData.email}</strong></p>
                <form onSubmit={handleSetNewPassword} className="flex gap-2">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New password (min. 6 chars)"
                    className="flex-1 bg-background border border-muted/40 rounded-button px-3 py-2 text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={settingPassword}
                    className="bg-primary hover:bg-primary/90 text-surface text-sm font-semibold px-4 py-2 rounded-button transition-colors disabled:opacity-50"
                  >
                    {settingPassword ? '...' : 'Save'}
                  </button>
                </form>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-app-text mb-1.5">
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
                  className="w-full px-4 py-3 rounded-button bg-background border border-muted/40 text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-app-text">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium">
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
                    className="w-full px-4 py-3 pr-11 rounded-button bg-background border border-muted/40 text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-app-text transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 active:bg-primary/80 text-surface font-semibold rounded-button transition-colors duration-150 flex items-center justify-center gap-2 shadow-soft disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-surface border-t-transparent" />
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

            <p className="text-center text-sm text-muted mt-6">
              New here?{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
