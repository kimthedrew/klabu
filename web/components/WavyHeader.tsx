import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';

interface WavyHeaderProps {
  location?: string;
  greeting?: string;
  rightElement?: ReactNode;
}

export default function WavyHeader({ location = 'Hall 9', greeting = "What are you hungry for?", rightElement }: WavyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-40">
      <div className="bg-primary px-5 pt-10 pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 font-body text-sm mb-1">Deliver to</p>
            <button className="flex items-center gap-1 text-white font-body text-sm font-medium mb-3">
              <span>{location}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {rightElement && (
            <div className="mt-1">{rightElement}</div>
          )}
        </div>
        <h1 className={`font-heading text-white transition-all duration-300 ${scrolled ? 'text-lg pb-3' : 'text-2xl pb-4'}`}>
          {greeting}
        </h1>
      </div>
      <div className="relative" style={{ height: 32, marginTop: -1 }}>
        <img
          src="/wavy-border.svg"
          alt=""
          className={`w-full h-full transition-all duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}
          style={{ display: 'block' }}
        />
        {scrolled && <div className="absolute inset-0 bg-background" />}
      </div>
    </div>
  );
}
