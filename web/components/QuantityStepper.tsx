interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export default function QuantityStepper({ value, onChange, min = 0 }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-3 bg-background rounded-pill px-1 h-8">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-full text-app-text hover:bg-muted/20 transition-colors font-body font-medium text-lg leading-none"
      >
        −
      </button>
      <span className="font-body font-medium text-app-text text-sm w-4 text-center">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-full text-app-text hover:bg-muted/20 transition-colors font-body font-medium text-lg leading-none"
      >
        +
      </button>
    </div>
  );
}
