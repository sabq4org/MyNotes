import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-950/50 backdrop-blur-sm animate-fade-in
                 dark:bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="card w-full sm:max-w-md p-6 animate-pop-in rounded-b-none sm:rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition
                       dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-200"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div>{children}</div>

        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
