import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, newPassword });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-body">
        <p className="text-muted">Invalid reset link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-body">
      <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8 w-full max-w-md">
        <h1 className="font-heading text-2xl text-app-text mb-2">Set New Password</h1>

        {done ? (
          <div className="text-center py-4">
            <p className="text-primary font-medium mb-2">Password updated!</p>
            <Link href="/login" className="inline-block mt-2 bg-primary hover:bg-primary/90 text-surface font-semibold px-6 py-2.5 rounded-button transition-colors text-sm">
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mb-6">Enter your new password below.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-muted/40 rounded-button px-4 py-2.5 text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-background border border-muted/40 rounded-button px-4 py-2.5 text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                  placeholder="Re-enter password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-surface font-semibold py-2.5 rounded-button transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
