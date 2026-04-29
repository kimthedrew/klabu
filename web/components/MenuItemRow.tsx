interface MenuItemRowProps {
  name: string;
  description?: string;
  price: number;
  image?: string;
  isAvailable: boolean;
  onClick: () => void;
}

export default function MenuItemRow({ name, description, price, image, isAvailable, onClick }: MenuItemRowProps) {
  return (
    <button
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      className="w-full flex items-center gap-3 py-4 border-b border-muted/30 text-left last:border-0 disabled:opacity-50"
    >
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-body font-medium text-app-text text-base leading-snug">{name}</p>
        {description && (
          <p className="font-body text-muted text-sm mt-0.5 line-clamp-2">{description}</p>
        )}
        <p className="font-heading text-primary font-semibold text-base mt-1">KES {price}</p>
        {!isAvailable && (
          <p className="font-body text-accent text-xs mt-0.5">Sold out for today</p>
        )}
      </div>

      {/* Image */}
      {image ? (
        <div className="relative w-20 h-20 flex-shrink-0 rounded-card overflow-hidden sepia-warm">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 rounded-card bg-muted/20 flex items-center justify-center text-2xl">
          🍽️
        </div>
      )}
    </button>
  );
}
