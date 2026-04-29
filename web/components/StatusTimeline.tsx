interface Step {
  key: string;
  label: string;
  description?: string;
  timestamp?: string;
}

interface Props {
  steps: Step[];
  activeIndex: number;
  cancelled?: boolean;
}

export default function StatusTimeline({ steps, activeIndex, cancelled = false }: Props) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const isPast = i < activeIndex;
        const isActive = i === activeIndex && !cancelled;
        const isFuture = i > activeIndex || cancelled;

        const dotClass = cancelled && i === activeIndex
          ? 'bg-accent ring-4 ring-accent/20'
          : isActive
            ? 'bg-accent ring-4 ring-accent/20'
            : isPast
              ? 'bg-primary'
              : 'bg-muted/40';

        const lineClass = isPast ? 'bg-primary' : 'bg-muted/30';

        return (
          <li key={step.key} className="flex gap-4 pb-6 last:pb-0 relative">
            {/* Dot + connecting line */}
            <div className="relative flex flex-col items-center">
              <span className={`w-3 h-3 rounded-pill ${dotClass} z-10 mt-1.5`} />
              {i < steps.length - 1 && (
                <span className={`absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full ${lineClass}`} />
              )}
            </div>

            <div className="flex-1 pb-1">
              <p className={`font-body font-medium text-sm ${isFuture ? 'text-muted' : 'text-app-text'}`}>
                {step.label}
              </p>
              {step.description && (
                <p className={`text-xs mt-0.5 ${isFuture ? 'text-muted/70' : 'text-muted'}`}>
                  {step.description}
                </p>
              )}
              {step.timestamp && !isFuture && (
                <p className="text-xs text-muted mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
