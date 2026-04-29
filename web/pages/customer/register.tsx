import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';

export default function CustomerRegister() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', phoneNumber: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { redirect } = router.query;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        role: 'CUSTOMER',
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber || undefined,
      });

      localStorage.setItem('customerToken', response.data.token);
      localStorage.setItem('customerUser', JSON.stringify(response.data.user));
      toast.success('Account created!');

      if (redirect && typeof redirect === 'string') {
        router.push(redirect);
      } else {
        router.push('/customer/orders');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Create account" description="Create a Klabu account to track your food orders" canonical="/customer/register" noindex={true} />

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 font-body">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="font-heading text-4xl text-primary tracking-tight">Klabu</span>
            </Link>
            <h2 className="mt-3 font-heading text-2xl text-app-text">Create your account</h2>
            <p className="mt-1 text-sm text-muted">Track all your Klabu orders in one place</p>
          </div>

          <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-app-text mb-1.5">
                  Full name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-button bg-background border border-muted/40 text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-app-text mb-1.5">
                  Email address *
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
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-app-text mb-1.5">
                  Phone number <span className="text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-button bg-background border border-muted/40 text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. 0712345678"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-app-text mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-11 rounded-button bg-background border border-muted/40 text-app-text placeholder-muted text-sm focus:outline-none focus:border-primary transition-colors"
                    placeholder="At least 6 characters"
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create account
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{' '}
              <Link
                href={redirect && typeof redirect === 'string' ? `/customer/login?redirect=${encodeURIComponent(redirect)}` : '/customer/login'}
                className="text-primary font-medium hover:text-primary/80"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
