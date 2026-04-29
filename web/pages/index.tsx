import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import SEO from '../components/SEO';
import WavyHeader from '../components/WavyHeader';
import StallCard, { StallCardSkeleton } from '../components/StallCard';
import CategoryPill from '../components/CategoryPill';
import { API_BASE_URL } from '../lib/config';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface StallOwner {
  id: string;
  fullName: string;
  businessName?: string;
  phoneNumber: string;
  stallPhoto?: string;
  stall?: {
    id: string;
    name: string;
    description?: string;
    averageRating: number;
    totalReviews: number;
    menuItems: MenuItem[];
  };
}

const CATEGORIES = ['All', 'Chapati', 'Rice', 'Ugali', 'Chicken', 'Nyama', 'Snacks', 'Drinks'];

function matchesCategory(stall: StallOwner, category: string): boolean {
  if (category === 'All') return true;
  return stall.stall?.menuItems.some(item =>
    item.name.toLowerCase().includes(category.toLowerCase())
  ) ?? false;
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Klabu',
    url: 'https://klabu.site',
    description: 'UON food delivery platform — order from campus stalls and get food delivered to your hostel.',
  },
];

export default function Home() {
  const [stalls, setStalls] = useState<StallOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/stalls`)
      .then(res => setStalls(res.data.stalls))
      .catch(() => toast.error('Failed to load stalls'))
      .finally(() => setLoading(false));

    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('customerUser');
      if (user) {
        try {
          const parsed = JSON.parse(user);
          if (parsed.role === 'CUSTOMER') {
            setCustomerName(parsed.profile?.fullName ?? null);
          }
        } catch {}
      }
    }
  }, []);

  const visible = stalls.filter(s => {
    if (!s.stall) return false;
    const matchesCat = matchesCategory(s, category);
    const matchesSearch = !search ||
      s.stall.name.toLowerCase().includes(search.toLowerCase()) ||
      s.stall.menuItems.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const rightElement = customerName ? (
    <Link
      href="/customer/orders"
      className="flex items-center gap-1.5 bg-surface/15 hover:bg-surface/25 text-surface font-body text-sm font-medium px-3 py-1.5 rounded-pill transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span className="max-w-[120px] truncate">{customerName.split(' ')[0]}</span>
    </Link>
  ) : (
    <Link
      href="/customer/login"
      className="flex items-center gap-1.5 bg-surface/15 hover:bg-surface/25 text-surface font-body text-sm font-medium px-3 py-1.5 rounded-pill transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 12c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      Sign in
    </Link>
  );

  return (
    <>
      <SEO
        canonical="/"
        description="Order food from campus stalls at the University of Nairobi and get it delivered to your hostel."
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-background font-body">
        <WavyHeader
          greeting="What are you hungry for?"
          rightElement={rightElement}
        />

        {/* Search bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search stalls or food..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-surface rounded-pill border border-muted/40 font-body text-sm text-app-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <CategoryPill
              key={cat}
              label={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>

        {/* Section heading */}
        <div className="px-4 pb-3">
          <h2 className="font-heading text-app-text text-xl">
            {category === 'All' ? 'Open Stalls' : `${category} spots`}
          </h2>
        </div>

        {/* Stall list */}
        <div className="px-4 pb-24 flex flex-col gap-4">
          {loading ? (
            <>
              <StallCardSkeleton />
              <StallCardSkeleton />
              <StallCardSkeleton />
            </>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="text-5xl mb-4">😴</span>
              <p className="font-heading text-app-text text-lg mb-1">No stalls open right now</p>
              <p className="font-body text-muted text-sm">Check back later or try a different category</p>
            </div>
          ) : (
            visible.map(owner => (
              owner.stall ? (
                <StallCard
                  key={owner.stall.id}
                  id={owner.stall.id}
                  name={owner.stall.name}
                  coverImage={owner.stallPhoto}
                  rating={owner.stall.averageRating > 0 ? owner.stall.averageRating : undefined}
                  reviewCount={owner.stall.totalReviews}
                  eta="~15 min"
                />
              ) : null
            ))
          )}
        </div>
      </div>
    </>
  );
}
