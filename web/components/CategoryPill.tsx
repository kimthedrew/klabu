interface CategoryPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function CategoryPill({ label, active = false, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 h-8 px-4 rounded-pill font-body text-sm transition-colors duration-150
        ${active
          ? 'bg-primary text-surface'
          : 'bg-background text-app-text border border-muted'
        }
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {label}
    </button>
  );
}
