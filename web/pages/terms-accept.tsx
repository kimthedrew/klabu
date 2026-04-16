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
      <SEO title="Terms & Conditions" description="Please accept the updated Terms & Conditions to continue." />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Updated Terms & Conditions</h1>
          <p className="text-gray-600 mb-6">
            Our Terms & Conditions have been updated. Please read and accept them to continue using Klabu as a {roleLabel}.
          </p>

          <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto mb-6 bg-gray-50">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{termsText}</pre>
          </div>

          <label className="flex items-start space-x-2 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the {roleLabel} Terms & Conditions
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </>
  );
}
