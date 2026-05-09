import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import MenuItemRow from '../../components/MenuItemRow';
import CustomizationSheet from '../../components/CustomizationSheet';
import FloatingBasketButton from '../../components/FloatingBasketButton';
import QuantityStepper from '../../components/QuantityStepper';
import StkPushOverlay from '../../components/StkPushOverlay';
import OrderSuccessSheet from '../../components/OrderSuccessSheet';
import { Copy, Check, Phone } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../lib/config';
import { GetServerSideProps } from 'next';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

interface Stall {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  menuItems: MenuItem[];
  stallOwner: {
    fullName: string;
    businessName?: string;
    phoneNumber: string;
    photo?: string;
    stallPhoto?: string;
    paymentMode?: string;
    mpesaNumber?: string;
    tillNumber?: string;
  };
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Props {
  stall: Stall;
  stkPushEnabled: boolean;
  fastDeliveryFee: number;
  slowDeliveryFee: number;
  deliveryFeeNote: string | null;
}

export default function StallPage({ stall, stkPushEnabled, fastDeliveryFee, slowDeliveryFee, deliveryFeeNote }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedTill, setCopiedTill] = useState(false);
  const [coverParallax, setCoverParallax] = useState(0);
  const [deliveryTier, setDeliveryTier] = useState<'FAST' | 'SLOW'>('FAST');
  const [buyerTermsAccepted, setBuyerTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stkOverlay, setStkOverlay] = useState<{ open: boolean; orderId: string; phone: string }>({ open: false, orderId: '', phone: '' });
  const [successSheet, setSuccessSheet] = useState<{ open: boolean; orderId: string; total: number; paymentMethod: string; isGuest: boolean }>({ open: false, orderId: '', total: 0, paymentMethod: 'MANUAL', isGuest: true });
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryLocation: '',
    roomNumber: '',
    mpesaPayerName: '',
    paymentMethod: 'MANUAL',
  });
  const [loggedInCustomer, setLoggedInCustomer] = useState<{ id: string; fullName: string; phoneNumber?: string } | null>(null);

  // Pre-fill order form from logged-in customer profile
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const user = localStorage.getItem('customerUser');
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.role === 'CUSTOMER' && parsed.profile) {
          setLoggedInCustomer({
            id: parsed.profile.id,
            fullName: parsed.profile.fullName,
            phoneNumber: parsed.profile.phoneNumber ?? undefined,
          });
          setOrderForm(prev => ({
            ...prev,
            customerName: parsed.profile.fullName ?? prev.customerName,
            customerPhone: parsed.profile.phoneNumber ?? prev.customerPhone,
          }));
        }
      } catch {}
    }
  }, []);

  // Parallax on cover image
  useEffect(() => {
    const onScroll = () => setCoverParallax(window.scrollY * 0.5);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const addToCart = (item: MenuItem, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + quantity } : c);
      }
      return [...prev, { menuItem: item, quantity }];
    });
    toast.success(`${item.name} added`);
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.menuItem.id !== id));
    else setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, quantity: qty } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const deliveryFee = deliveryTier === 'FAST' ? fastDeliveryFee : slowDeliveryFee;
  const total = subtotal + deliveryFee;
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const copyTill = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedTill(true);
    setTimeout(() => setCopiedTill(false), 2000);
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { toast.error('Your cart is empty'); return; }
    setSubmitting(true);
    try {
      const orderPayload: Record<string, unknown> = {
        stallId: stall.id,
        ...orderForm,
        deliveryTier,
        items: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
      };
      if (loggedInCustomer) orderPayload.customerId = loggedInCustomer.id;

      const customerToken = loggedInCustomer ? localStorage.getItem('customerToken') : null;
      const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : undefined;

      const res = await axios.post(`${API_BASE_URL}/orders`, orderPayload, { headers });
      const placedOrder = res.data.order;
      const placedTotal = placedOrder.totalAmount + placedOrder.deliveryFee;

      // Save guest tracking handles so home / "/orders" can offer recall.
      try {
        localStorage.setItem('lastOrderId', placedOrder.id);
        const raw = localStorage.getItem('myOrders');
        const list: string[] = raw ? JSON.parse(raw) : [];
        const next = [placedOrder.id, ...list.filter(x => x !== placedOrder.id)].slice(0, 30);
        localStorage.setItem('myOrders', JSON.stringify(next));
      } catch {}

      setCart([]);
      setShowCheckout(false);

      if (orderForm.paymentMethod === 'STK_PUSH') {
        setStkOverlay({ open: true, orderId: placedOrder.id, phone: orderForm.customerPhone });
      } else {
        setSuccessSheet({
          open: true,
          orderId: placedOrder.id,
          total: placedTotal,
          paymentMethod: orderForm.paymentMethod,
          isGuest: !loggedInCustomer,
        });
      }

      // Reset form, but keep prefill for logged-in customers.
      setOrderForm({
        customerName: loggedInCustomer?.fullName ?? '',
        customerPhone: loggedInCustomer?.phoneNumber ?? '',
        deliveryLocation: '',
        roomNumber: '',
        mpesaPayerName: '',
        paymentMethod: 'MANUAL',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStkSuccess = () => {
    const orderId = stkOverlay.orderId;
    setStkOverlay({ open: false, orderId: '', phone: '' });
    router.push(`/orders/${orderId}`);
  };

  const handleStkClose = () => {
    const orderId = stkOverlay.orderId;
    setStkOverlay({ open: false, orderId: '', phone: '' });
    if (orderId) router.push(`/orders/${orderId}`);
  };

  const availableItems = stall.menuItems.filter(i => i.isAvailable);
  const unavailableItems = stall.menuItems.filter(i => !i.isAvailable);

  return (
    <>
      <SEO
        title={stall.name}
        description={`Order from ${stall.name} at the University of Nairobi. ${stall.description || ''}`}
        canonical={`/stall/${stall.id}`}
        ogImage={stall.stallOwner.stallPhoto}
      />

      <div className="min-h-screen bg-background font-body pb-28">
        {/* Cover image with parallax */}
        <div className="relative h-[250px] overflow-hidden sepia-warm">
          {stall.stallOwner.stallPhoto ? (
            <img
              src={stall.stallOwner.stallPhoto}
              alt={stall.name}
              className="w-full h-[300px] object-cover"
              style={{ transform: `translateY(${coverParallax}px)` }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
          {/* Back button */}
          <Link
            href="/"
            className="absolute top-10 left-4 w-10 h-10 bg-surface/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-soft"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L6 9l5-5" stroke="#2D2823" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Stall info bar */}
        <div className="px-4 py-4 bg-surface shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-heading text-app-text text-2xl leading-tight">{stall.name}</h1>
              {stall.description && (
                <p className="font-body text-muted text-sm mt-1 line-clamp-2">{stall.description}</p>
              )}
            </div>
            <span className={`ml-3 flex-shrink-0 px-3 py-1 rounded-pill text-xs font-body font-medium ${stall.isActive ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
              {stall.isActive ? 'Open' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {stall.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="#D96C4E"><path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"/></svg>
                <span className="font-body text-app-text font-medium text-sm">{stall.averageRating.toFixed(1)}</span>
                <span className="font-body text-muted text-sm">({stall.totalReviews})</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-muted text-sm font-body">
              <Phone size={13} />
              {stall.stallOwner.phoneNumber}
            </span>
          </div>

          {/* Payment info */}
          {stall.stallOwner.paymentMode === 'MPESA' && (stall.stallOwner.tillNumber || stall.stallOwner.mpesaNumber) && (
            <div className="mt-3 bg-primary/5 rounded-card p-3 flex items-center justify-between">
              <div>
                <p className="font-body text-xs text-muted">Pay via M-Pesa</p>
                <p className="font-body font-medium text-app-text text-sm">
                  {stall.stallOwner.tillNumber ? `Till: ${stall.stallOwner.tillNumber}` : `Number: ${stall.stallOwner.mpesaNumber}`}
                </p>
              </div>
              <button
                onClick={() => copyTill(stall.stallOwner.tillNumber || stall.stallOwner.mpesaNumber || '')}
                className="text-primary"
              >
                {copiedTill ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="px-4 pt-4">
          {availableItems.length > 0 && (
            <>
              <h2 className="font-heading text-app-text text-lg mb-1">Menu</h2>
              <div className="bg-surface rounded-card shadow-soft px-4">
                {availableItems.map(item => (
                  <MenuItemRow
                    key={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    image={item.image}
                    isAvailable={item.isAvailable}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </>
          )}

          {unavailableItems.length > 0 && (
            <div className="mt-4">
              <h2 className="font-heading text-app-text text-lg mb-1 opacity-50">Sold Out Today</h2>
              <div className="bg-surface rounded-card shadow-soft px-4 opacity-50">
                {unavailableItems.map(item => (
                  <MenuItemRow
                    key={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    image={item.image}
                    isAvailable={false}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item customization sheet */}
      <CustomizationSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAdd={addToCart}
      />

      {/* Floating basket */}
      <FloatingBasketButton
        itemCount={itemCount}
        total={subtotal}
        onClick={() => setShowCheckout(true)}
      />

      {/* Checkout bottom sheet */}
      {showCheckout && (
        <>
          <div className="fixed inset-0 z-40 bg-app-text/30 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[32px] shadow-soft max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-surface z-10">
              <div className="w-10 h-1 rounded-pill bg-muted/40" />
            </div>

            <div className="px-5 pb-10">
              <h2 className="font-heading text-app-text text-2xl mb-4">Your Order</h2>

              {/* Logged-in customer banner */}
              {loggedInCustomer && (
                <div className="mb-4 flex items-center justify-between bg-primary/10 rounded-pill px-4 py-2 text-sm">
                  <span className="text-primary font-medium truncate">
                    Signed in as {loggedInCustomer.fullName}
                  </span>
                  <Link href="/customer/orders" className="text-primary hover:text-primary/80 font-medium ml-2 flex-shrink-0 text-xs">
                    My orders
                  </Link>
                </div>
              )}

              {/* Cart items */}
              <div className="bg-background rounded-card p-4 mb-4">
                {cart.map(c => (
                  <div key={c.menuItem.id} className="flex items-center justify-between py-2 border-b border-muted/20 last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-body font-medium text-app-text text-sm leading-snug">{c.menuItem.name}</p>
                      <p className="font-body text-muted text-xs">KES {c.menuItem.price} each</p>
                    </div>
                    <QuantityStepper value={c.quantity} onChange={qty => updateQty(c.menuItem.id, qty)} />
                  </div>
                ))}
                <div className="pt-3 mt-1 flex justify-between font-body font-medium text-sm text-app-text">
                  <span>Subtotal</span><span>KES {subtotal}</span>
                </div>
              </div>

              {/* Delivery tier */}
              <div className="mb-4">
                <h3 className="font-heading text-app-text text-base mb-2">Delivery Speed</h3>
                <div className="flex gap-2">
                  {(['FAST', 'SLOW'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setDeliveryTier(tier)}
                      className={`flex-1 py-3 px-4 rounded-card border-2 text-left transition-colors ${deliveryTier === tier ? 'border-primary bg-primary/5' : 'border-muted/30 bg-surface'}`}
                    >
                      <p className="font-body font-medium text-app-text text-sm">{tier === 'FAST' ? 'Fast' : 'Standard'}</p>
                      <p className="font-heading text-primary text-sm font-semibold">KES {tier === 'FAST' ? fastDeliveryFee : slowDeliveryFee}</p>
                    </button>
                  ))}
                </div>
                {deliveryFeeNote && <p className="font-body text-xs text-muted mt-1">{deliveryFeeNote}</p>}
              </div>

              {/* Order total */}
              <div className="flex justify-between items-center mb-5 bg-background rounded-card px-4 py-3">
                <span className="font-heading text-app-text text-base">Total</span>
                <span className="font-heading text-primary text-xl font-semibold">KES {total}</span>
              </div>

              {/* Order form */}
              <form onSubmit={handleOrder} className="space-y-3">
                {[
                  { label: 'Your Name', key: 'customerName', placeholder: 'Full name', type: 'text', required: true },
                  { label: 'Phone Number', key: 'customerPhone', placeholder: '07XX XXX XXX', type: 'tel', required: true },
                  { label: 'Delivery Location', key: 'deliveryLocation', placeholder: 'e.g. Hall 9, Chiromo Library, ADD office', type: 'text', required: true },
                  { label: 'Room / office / floor', key: 'roomNumber', placeholder: 'Optional — e.g. Room 12, 3rd floor', type: 'text', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="font-body text-xs text-muted block mb-1">{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={(orderForm as any)[f.key]}
                      onChange={e => setOrderForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}

                {/* Payment method */}
                {stall.stallOwner.paymentMode === 'MPESA' && (
                  <div>
                    <label className="font-body text-xs text-muted block mb-2">Payment Method *</label>
                    <div className="space-y-2">
                      {stkPushEnabled && (
                        <label className="flex items-center gap-3 bg-background rounded-card px-4 py-3 cursor-pointer">
                          <input type="radio" name="pm" value="STK_PUSH" checked={orderForm.paymentMethod === 'STK_PUSH'} onChange={() => setOrderForm(p => ({ ...p, paymentMethod: 'STK_PUSH' }))} className="accent-primary" />
                          <div>
                            <p className="font-body text-sm font-medium text-app-text">STK Push</p>
                            <p className="font-body text-xs text-muted">We send a payment request to your phone</p>
                          </div>
                        </label>
                      )}
                      <label className="flex items-center gap-3 bg-background rounded-card px-4 py-3 cursor-pointer">
                        <input type="radio" name="pm" value="MANUAL" checked={orderForm.paymentMethod === 'MANUAL'} onChange={() => setOrderForm(p => ({ ...p, paymentMethod: 'MANUAL' }))} className="accent-primary" />
                        <div>
                          <p className="font-body text-sm font-medium text-app-text">Manual M-Pesa</p>
                          <p className="font-body text-xs text-muted">Pay and enter your M-Pesa name below</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {stall.stallOwner.paymentMode === 'MPESA' && orderForm.paymentMethod === 'MANUAL' && (
                  <div>
                    <label className="font-body text-xs text-muted block mb-1">M-Pesa Paying Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. JOHN DOE"
                      value={orderForm.mpesaPayerName}
                      onChange={e => setOrderForm(p => ({ ...p, mpesaPayerName: e.target.value }))}
                      className="w-full h-11 px-4 bg-background rounded-card border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary"
                    />
                    <p className="font-body text-xs text-muted mt-1">Exactly as it appears in your M-Pesa confirmation</p>
                  </div>
                )}

                {/* T&C */}
                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={buyerTermsAccepted}
                    onChange={e => setBuyerTermsAccepted(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="font-body text-sm text-muted">
                    I agree — delivery fees are non-refundable once a runner is assigned.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!buyerTermsAccepted || submitting}
                  className="w-full h-14 bg-primary text-surface rounded-button font-body font-medium text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
                >
                  {submitting ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60"/>
                    </svg>
                  ) : (
                    <>
                      <span>Pay KES {total} via M-Pesa</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* STK Push overlay (after STK_PUSH submit) */}
      <StkPushOverlay
        open={stkOverlay.open}
        orderId={stkOverlay.orderId}
        phoneNumber={stkOverlay.phone}
        onSuccess={handleStkSuccess}
        onClose={handleStkClose}
      />

      {/* Manual payment success sheet */}
      <OrderSuccessSheet
        open={successSheet.open}
        orderId={successSheet.orderId}
        total={successSheet.total}
        paymentMethod={successSheet.paymentMethod}
        showSignupCta={successSheet.isGuest}
        onClose={() => setSuccessSheet({ open: false, orderId: '', total: 0, paymentMethod: 'MANUAL', isGuest: true })}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  try {
    const [stallRes, configRes, deliveryConfigRes] = await Promise.all([
      fetch(`${apiUrl}/api/stalls/${id}`),
      fetch(`${apiUrl}/api/payments/config`),
      fetch(`${apiUrl}/api/orders/delivery-config`),
    ]);

    if (!stallRes.ok) return { notFound: true };

    const stall = await stallRes.json();
    const config = configRes.ok ? await configRes.json() : { stkPushEnabled: false };
    const deliveryConfig = deliveryConfigRes.ok ? await deliveryConfigRes.json() : { fastDeliveryFee: 50, slowDeliveryFee: 30, deliveryFeeNote: null };

    return {
      props: {
        stall,
        stkPushEnabled: config.stkPushEnabled ?? false,
        fastDeliveryFee: deliveryConfig.fastDeliveryFee ?? 50,
        slowDeliveryFee: deliveryConfig.slowDeliveryFee ?? 30,
        deliveryFeeNote: deliveryConfig.deliveryFeeNote ?? null,
      },
    };
  } catch {
    return { notFound: true };
  }
};
