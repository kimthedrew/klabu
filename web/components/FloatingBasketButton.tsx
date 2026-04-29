interface FloatingBasketButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export default function FloatingBasketButton({ itemCount, total, onClick }: FloatingBasketButtonProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-30">
      <button
        onClick={onClick}
        className="w-full h-14 bg-primary rounded-button shadow-soft flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 bg-surface/20 rounded-full flex items-center justify-center font-body text-xs text-surface font-medium">
            {itemCount}
          </span>
          <span className="font-body font-medium text-surface text-base">View Basket</span>
        </div>
        <span className="font-heading font-semibold text-surface text-base">KES {total}</span>
      </button>
    </div>
  );
}
