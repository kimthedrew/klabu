import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  orderId: string;
  trackingToken?: string;
  total: number;
  paymentMethod: 'STK_PUSH' | 'MANUAL' | string;
  showSignupCta?: boolean;
  onClose: () => void;
}

export default function OrderSuccessSheet({ open, orderId, trackingToken, total, paymentMethod, showSignupCta, onClose }: Props) {
  if (!open) return null;

  const trackHref = trackingToken
    ? `/orders/${orderId}?token=${trackingToken}`
    : `/orders/${orderId}`;

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-app-text/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[56] bg-surface rounded-t-[32px] shadow-soft p-6 font-body">
        <div className="flex justify-center pb-3">
          <div className="w-10 h-1 rounded-pill bg-muted/40" />
        </div>

        <div className="text-center pt-2 pb-2">
          <div className="w-16 h-16 rounded-pill bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="text-primary" size={36} />
          </div>
          <h2 className="font-heading text-2xl text-app-text mb-2">
            {paymentMethod === 'STK_PUSH' ? 'Order placed!' : 'Order placed — pay now'}
          </h2>
          <p className="text-muted text-sm mb-1">
            Order <span className="font-medium text-app-text">#{orderId.slice(0, 8)}</span> · Total{' '}
            <span className="font-medium text-app-text">KES {total}</span>
          </p>
          <p className="text-muted text-sm mb-6 px-4">
            {paymentMethod === 'STK_PUSH'
              ? 'The stall will start preparing once payment confirms.'
              : 'Pay the stall via M-Pesa, then enter your paying name on the tracking page so the stall can confirm.'}
          </p>
        </div>

        <Link
          href={trackHref}
          className="block w-full bg-primary text-surface py-3.5 rounded-button text-center font-semibold hover:bg-primary/90 transition-colors mb-3"
        >
          Track your order
        </Link>

        {showSignupCta && (
          <div className="bg-background rounded-card p-4 mb-3">
            <p className="text-sm text-app-text mb-3">
              <span className="font-medium">Save your orders.</span>{' '}
              <span className="text-muted">Create a free account to see live updates and access order history anytime.</span>
            </p>
            <div className="flex gap-2">
              <Link
                href={`/customer/register?redirect=/orders/${orderId}`}
                className="flex-1 bg-primary/10 text-primary text-sm font-medium py-2 rounded-button text-center hover:bg-primary/20 transition-colors"
              >
                Create account
              </Link>
              <Link
                href={`/customer/login?redirect=/orders/${orderId}`}
                className="flex-1 border border-muted/40 text-app-text text-sm font-medium py-2 rounded-button text-center hover:bg-surface transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="block w-full text-muted text-sm py-2 hover:text-app-text transition-colors"
        >
          Keep browsing
        </button>
      </div>
    </>
  );
}
