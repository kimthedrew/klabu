import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-body">
      <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8 w-full max-w-md">
        <h1 className="font-heading text-2xl text-app-text mb-2">Forgot Password</h1>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-primary font-medium mb-2">Check your email!</p>
            <p className="text-muted text-sm">
              If an account exists for <strong className="text-app-text">{email}</strong>, a reset link has been sent.
            </p>
            <Link href="/login" className="mt-4 inline-block text-primary hover:text-primary/80 text-sm font-medium">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-background border border-muted/40 rounded-button px-4 py-2.5 text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-surface font-semibold py-2.5 rounded-button transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
