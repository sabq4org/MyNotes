import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
  { value: 'light', label: 'فاتح', Icon: Sun },
  { value: 'dark', label: 'داكن', Icon: Moon },
  { value: 'system', label: 'حسب النظام', Icon: Monitor },
];

export default function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ActiveIcon = resolved === 'dark' ? Moon : Sun;
  const title = `المظهر (${
    preference === 'system'
      ? 'حسب النظام'
      : preference === 'dark'
      ? 'داكن'
      : 'فاتح'
  })`;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost text-sm !px-2 !py-2"
        title={title}
        aria-label="تبديل المظهر"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ActiveIcon size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-2 min-w-[180px] rounded-xl bg-white shadow-lg ring-1 ring-ink-200 overflow-hidden z-30 animate-pop-in
                     dark:bg-ink-900 dark:ring-ink-700 dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setPreference(value);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full px-3 py-2 text-start flex items-center gap-2.5 text-sm transition',
                  active
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800'
                )}
              >
                <Icon
                  size={15}
                  className={clsx(
                    'shrink-0',
                    active
                      ? 'text-brand-600 dark:text-brand-300'
                      : 'text-ink-500 dark:text-ink-400'
                  )}
                />
                <span className="flex-1">{label}</span>
                {active && (
                  <Check
                    size={14}
                    className="text-brand-600 dark:text-brand-300 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
