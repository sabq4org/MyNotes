import clsx from 'clsx';
import { Check } from 'lucide-react';

export const PROJECT_ICONS = [
  '📝',
  '📌',
  '📁',
  '🗂️',
  '📰',
  '💼',
  '💡',
  '🚀',
  '✅',
  '📚',
  '🧠',
  '🏥',
  '💪',
  '🍎',
  '💰',
  '🏠',
  '🎯',
  '⭐',
];

export default function IconPicker({ value, onChange, color }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div
          className="size-12 rounded-xl flex items-center justify-center text-2xl shadow-sm shrink-0"
          style={{ backgroundColor: color || '#6366f1' }}
          aria-hidden
        >
          {value || '📝'}
        </div>
        <p className="text-xs text-ink-500 leading-5">
          اختر أيقونة للمشروع، واللون المختار يكون خلفيتها.
        </p>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
        {PROJECT_ICONS.map((icon) => {
          const active = value === icon;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => onChange(icon)}
              className={clsx(
                'relative size-10 rounded-xl flex items-center justify-center text-xl transition border bg-white',
                active
                  ? 'border-ink-900 ring-2 ring-ink-900/10 shadow-sm'
                  : 'border-ink-100 hover:border-ink-300 hover:bg-ink-50'
              )}
              aria-label={`اختر الأيقونة ${icon}`}
            >
              <span aria-hidden>{icon}</span>
              {active && (
                <span
                  className="absolute -top-1 -end-1 size-4 rounded-full bg-ink-900 text-white flex items-center justify-center"
                  aria-hidden
                >
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
