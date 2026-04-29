import { useEffect, useState } from 'react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
}

interface CustomizationSheetProps {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number) => void;
}

export default function CustomizationSheet({ item, onClose, onAdd }: CustomizationSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(1);
      // Delay to trigger slide-up animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [item]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleAdd = () => {
    if (!item) return;
    onAdd(item, quantity);
    handleClose();
  };

  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-280 ${visible ? 'bg-app-text/30 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-[32px] shadow-soft transition-transform duration-280 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-pill bg-muted/40" />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* Item info */}
          <div className="flex gap-4 mb-5">
            <div className="flex-1">
              <h3 className="font-heading text-app-text text-xl leading-tight">{item.name}</h3>
              {item.description && (
                <p className="font-body text-muted text-sm mt-1">{item.description}</p>
              )}
              <p className="font-heading text-primary font-semibold text-lg mt-2">KES {item.price}</p>
            </div>
            {item.image && (
              <div className="w-24 h-24 flex-shrink-0 rounded-card overflow-hidden sepia-warm">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between mb-6">
            <span className="font-body text-app-text text-sm">Quantity</span>
            <div className="flex items-center gap-4 bg-background rounded-pill px-2 h-10">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full text-app-text hover:bg-muted/20 font-medium text-xl leading-none"
              >
                −
              </button>
              <span className="font-body font-medium text-app-text w-5 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-app-text hover:bg-muted/20 font-medium text-xl leading-none"
              >
                +
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleAdd}
            className="w-full h-14 bg-primary text-surface rounded-button font-body font-medium text-base flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
          >
            <span>Add to Basket</span>
            <span className="font-heading font-semibold">KES {item.price * quantity}</span>
          </button>
        </div>
      </div>
    </>
  );
}
