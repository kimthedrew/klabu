import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/config';

type Status = 'sending' | 'awaiting' | 'success' | 'failed';

interface Props {
  orderId: string;
  phoneNumber: string;
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export default function StkPushOverlay({ orderId, phoneNumber, open, onSuccess, onClose }: Props) {
  const [status, setStatus] = useState<Status>('sending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let pollHandle: any;

    (async () => {
      setStatus('sending');
      setError(null);
      try {
        await axios.post(`${API_BASE_URL}/payments/stk-push`, {
          orderId,
          phoneNumber,
        });
        if (cancelled) return;
        setStatus('awaiting');

        // Poll order payment status every 3s, give up after 60s
        const start = Date.now();
        const poll = async () => {
          if (cancelled) return;
          try {
            const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
            const paymentStatus = res.data.order?.paymentStatus;
            if (paymentStatus === 'CONFIRMED') {
              setStatus('success');
              setTimeout(() => { if (!cancelled) onSuccess(); }, 800);
              return;
            }
            if (paymentStatus === 'FAILED') {
              setStatus('failed');
              setError('Payment failed. Please try again.');
              return;
            }
          } catch {}

          if (Date.now() - start > 60000) {
            setStatus('failed');
            setError('Payment is taking longer than expected. Check your phone, or try the manual M-Pesa option.');
            return;
          }
          pollHandle = setTimeout(poll, 3000);
        };
        pollHandle = setTimeout(poll, 3000);
      } catch (err: any) {
        if (cancelled) return;
        setStatus('failed');
        setError(err.response?.data?.error || 'Failed to send M-Pesa request');
      }
    })();

    return () => {
      cancelled = true;
      if (pollHandle) clearTimeout(pollHandle);
    };
  }, [open, orderId, phoneNumber, onSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-app-text/40 backdrop-blur-sm font-body">
      <div className="bg-surface rounded-card shadow-soft w-full max-w-sm p-6 text-center">
        {(status === 'sending' || status === 'awaiting') && (
          <>
            <div className="w-14 h-14 rounded-pill bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Smartphone className="text-primary" size={28} />
            </div>
            <h3 className="font-heading text-app-text text-xl mb-1">
              {status === 'sending' ? 'Sending M-Pesa request…' : 'Check your phone'}
            </h3>
            <p className="text-muted text-sm mb-5">
              {status === 'sending'
                ? 'Hold on a moment.'
                : `An M-Pesa prompt was sent to ${phoneNumber}. Enter your PIN to complete payment.`}
            </p>
            <div className="flex justify-center mb-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 rounded-pill bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="text-primary" size={32} />
            </div>
            <h3 className="font-heading text-app-text text-xl mb-1">Payment received</h3>
            <p className="text-muted text-sm">Taking you to your order…</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-14 h-14 rounded-pill bg-accent/15 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="text-accent" size={28} />
            </div>
            <h3 className="font-heading text-app-text text-xl mb-1">Payment didn't go through</h3>
            <p className="text-muted text-sm mb-5">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-primary text-surface py-3 rounded-button font-semibold hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
