import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const config = { runtime: 'edge' };

export default function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Klabu — UON Food Delivery';
  const description = searchParams.get('description') ||
    'A famous, budget-friendly food haven located near the University of Nairobi (UoN) main campus. Order affordable meals and get them delivered to your hostel.';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#16a34a',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              backgroundColor: 'white',
              color: '#16a34a',
              fontSize: 28,
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: 8,
            }}
          >
            Klabu
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 20, marginLeft: 16 }}>
            UON Food Delivery
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: 'white', fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 26, lineHeight: 1.5, maxWidth: 900 }}>
            {description}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>
          klabu.site
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
