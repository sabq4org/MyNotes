import clsx from 'clsx';
import { X } from 'lucide-react';

/**
 * Small reusable tag chip used both in lists (read-only) and inputs (with X).
 * The colour is deterministically picked from the tag name so the same tag
 * always looks the same regardless of where it's rendered.
 */
const PALETTE = [
  'bg-sky-50 text-sky-700 ring-sky-200',
  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'bg-amber-50 text-amber-700 ring-amber-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-violet-50 text-violet-700 ring-violet-200',
  'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  'bg-teal-50 text-teal-700 ring-teal-200',
  'bg-orange-50 text-orange-700 ring-orange-200',
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
          ? 'bg-brand-600 text-white ring-brand-600'
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
          className="-mr-1 rounded-full p-0.5 hover:bg-black/10 transition"
          aria-label={`إزالة الوسم ${name}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </Tag>
  );
}
