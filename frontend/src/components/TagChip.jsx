import clsx from 'clsx';
import { X } from 'lucide-react';

/**
 * Small reusable tag chip used both in lists (read-only) and inputs (with X).
 * The colour is deterministically picked from the tag name so the same tag
 * always looks the same regardless of where it's rendered.
 */
const PALETTE = [
  'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
  'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
  'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
];

function colorFor(name) {
  const s = String(name || '').toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function TagChip({
  name,
  onRemove,
  onClick,
  active,
  size = 'sm',
  className,
}) {
  const palette = colorFor(name);
  const interactive = onClick && !onRemove;
  const Tag = interactive ? 'button' : 'span';

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full ring-1 font-medium leading-none',
        size === 'xs' && 'text-[11px] px-2 py-0.5',
        size === 'sm' && 'text-xs px-2.5 py-1',
        active
          ? 'bg-brand-600 text-white ring-brand-600 dark:bg-brand-500 dark:ring-brand-500'
          : palette,
        interactive && 'transition hover:opacity-80 cursor-pointer',
        className
      )}
      title={`#${name}`}
    >
      <span className="truncate max-w-[160px]">#{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 rounded-full p-0.5 hover:bg-black/10 transition dark:hover:bg-white/10"
          aria-label={`إزالة الوسم ${name}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </Tag>
  );
}
