import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

export default function CustomerLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { redirect } = router.query;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      const { user, token } = response.data;

      if (user.role !== 'CUSTOMER') {
        toast.error('This login is for customers only. Use the staff login page.');
        return;
      }

      localStorage.setItem('customerToken', token);
      localStorage.setItem('customerUser', JSON.stringify(user));
      toast.success('Welcome back!');

      if (redirect && typeof redirect === 'string') {
        router.push(redirect);
      } else {
        router.push('/customer/orders');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Sign in" description="Sign in to your Klabu account to track orders" canonical="/customer/login" noindex={true} />

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 font-body">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="font-heading text-4xl text-primary tracking-tight">Klabu</span>
            </Link>
            <h2 className="mt-3 font-heading text-2xl text-app-text">Welcome back</h2>
            <p className="mt-1 text-sm text-muted">Sign in to track your orders</p>
          </div>

          <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-app-text mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

            <p className="mt-6 text-center text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link
                href={redirect && typeof redirect === 'string' ? `/customer/register?redirect=${encodeURIComponent(redirect)}` : '/customer/register'}
                className="text-primary font-medium hover:text-primary/80"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
