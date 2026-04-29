import { useRouter } from 'next/router';

interface StallCardProps {
  id: string;
  name: string;
  coverImage?: string;
  rating?: number;
  reviewCount?: number;
  eta?: string;
  category?: string;
  isOpen?: boolean;
}

export function StallCardSkeleton() {
  return (
    <div className="w-full rounded-card bg-surface shadow-soft overflow-hidden animate-pulse">
      <div className="h-40 bg-muted/30" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-muted/30 rounded-pill w-2/3" />
        <div className="h-4 bg-muted/20 rounded-pill w-1/3" />
      </div>
    </div>
  );
}

export default function StallCard({ id, name, coverImage, rating, reviewCount, eta, category, isOpen = true }: StallCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/stall/${id}`)}
      className="w-full rounded-card bg-surface shadow-soft overflow-hidden text-left active:scale-[0.98] transition-transform duration-150"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Cover image */}
      <div className="relative h-40 bg-muted/20 sepia-warm overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {!isOpen && (
          <div className="absolute inset-0 bg-app-text/40 flex items-center justify-center">
            <span className="text-white font-body text-sm font-medium bg-app-text/60 px-3 py-1 rounded-pill">Closed</span>
          </div>
        )}
        {category && (
          <span className="absolute top-3 left-3 bg-surface/90 text-app-text font-body text-xs px-2 py-1 rounded-pill">
            {category}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-heading text-app-text text-lg leading-tight mb-1">{name}</h3>
        <div className="flex items-center gap-3 text-sm font-body">
          {rating !== undefined && (
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="#D96C4E">
                <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"/>
              </svg>
              <span className="text-app-text font-medium">{rating.toFixed(1)}</span>
              {reviewCount && <span className="text-muted">({reviewCount})</span>}
            </span>
          )}
          {eta && <span className="text-muted">{eta}</span>}
        </div>
      </div>
    </button>
  );
}
