import clsx from 'clsx';
import { Check } from 'lucide-react';

export const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#0ea5e9',
  '#64748b',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={clsx(
              'size-8 rounded-full flex items-center justify-center transition shadow-sm',
              active ? 'ring-2 ring-offset-2 ring-ink-900' : 'hover:scale-110'
            )}
            style={{ backgroundColor: c }}
            aria-label={`اختر اللون ${c}`}
          >
            {active && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
