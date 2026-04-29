import { useRef, useState } from 'react';

interface SwipeToAcceptProps {
  label?: string;
  onAccept: () => void;
}

export default function SwipeToAccept({ label = 'Swipe to deliver', onAccept }: SwipeToAcceptProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const startX = useRef<number | null>(null);

  const THUMB_SIZE = 52;
  const THRESHOLD = 0.9;

  const getTrackWidth = () => trackRef.current?.clientWidth ?? 300;

  const handleStart = (clientX: number) => {
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (startX.current === null) return;
    const trackWidth = getTrackWidth();
    const maxTravel = trackWidth - THUMB_SIZE - 8;
    const raw = clientX - startX.current;
    setProgress(Math.min(1, Math.max(0, raw / maxTravel)));
  };

  const handleEnd = () => {
    if (progress >= THRESHOLD) {
      setAccepted(true);
      if (navigator.vibrate) navigator.vibrate(200);
      onAccept();
    } else {
      setProgress(0);
    }
    startX.current = null;
  };

  const trackWidth = typeof window !== 'undefined' ? (trackRef.current?.clientWidth ?? 300) : 300;
  const maxTravel = trackWidth - THUMB_SIZE - 8;
  const thumbX = 4 + progress * maxTravel;

  return (
    <div
      ref={trackRef}
      className="relative w-full h-14 bg-background rounded-button overflow-hidden select-none"
      onMouseDown={e => handleStart(e.clientX)}
      onMouseMove={e => { if (startX.current !== null) handleMove(e.clientX); }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={e => handleStart(e.touches[0].clientX)}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/15 rounded-button transition-none"
        style={{ width: `${thumbX + THUMB_SIZE / 2}px` }}
      />

      {/* Label */}
      <span className="absolute inset-0 flex items-center justify-center font-body text-sm text-muted pointer-events-none">
        {accepted ? 'Accepted!' : label}
      </span>

      {/* Thumb */}
      <div
        className="absolute top-1 w-[52px] h-[52px] bg-accent rounded-pill flex items-center justify-center shadow-soft transition-none"
        style={{ left: `${thumbX}px` }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M12 6l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
