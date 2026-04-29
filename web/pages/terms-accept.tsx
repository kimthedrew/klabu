import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SEO from '../components/SEO';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';
import { STALL_OWNER_TERMS, DELIVERY_PERSON_TERMS } from '../lib/terms';

export default function TermsAccept() {
  const router = useRouter();
  const { role, version } = router.query as { role?: string; version?: string };
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, []);

  const termsText = role === 'STALL_OWNER' ? STALL_OWNER_TERMS : DELIVERY_PERSON_TERMS;
  const roleLabel = role === 'STALL_OWNER' ? 'Stall Owner' : 'Delivery Person';

  const handleAccept = async () => {
    if (!accepted) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/auth/accept-terms`,
        { role, version },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Terms accepted');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'STALL_OWNER') router.replace('/dashboard/stall');
      else if (user.role === 'DELIVERY_PERSON') router.replace('/dashboard/delivery');
      else router.replace('/');
    } catch {
      toast.error('Failed to record acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Terms & Conditions" description="Please accept the updated Terms & Conditions to continue." canonical="/terms-accept" />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-body">
        <div className="bg-surface rounded-card shadow-soft border border-muted/20 p-8 w-full max-w-2xl">
          <h1 className="font-heading text-2xl text-app-text mb-2">Updated Terms &amp; Conditions</h1>
          <p className="text-muted mb-6">
            Our Terms &amp; Conditions have been updated. Please read and accept them to continue using Klabu as a {roleLabel}.
          </p>

          <div className="border border-muted/30 rounded-card p-4 max-h-80 overflow-y-auto mb-6 bg-background">
            <pre className="text-sm text-app-text whitespace-pre-wrap font-body">{termsText}</pre>
          </div>

          <label className="flex items-start gap-2 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm text-app-text">
              I have read and agree to the {roleLabel} Terms &amp; Conditions
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="w-full bg-primary text-surface py-3 rounded-button hover:bg-primary/90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </>
  );
}
