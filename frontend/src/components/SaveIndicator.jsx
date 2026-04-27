import { Check, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const LABELS = {
  idle: '',
  pending: 'تعديل…',
  saving: 'جارٍ الحفظ…',
  saved: 'محفوظ',
  error: 'فشل الحفظ',
};

export default function SaveIndicator({ status, errorMessage }) {
  const label = LABELS[status] || '';
  if (!label) return <span className="text-xs text-ink-400 dark:text-ink-500" aria-hidden />;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs',
        status === 'error'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-ink-500 dark:text-ink-400'
      )}
      role="status"
      aria-live="polite"
      title={status === 'error' && errorMessage ? errorMessage : undefined}
    >
      {status === 'saving' && <Loader2 size={13} className="animate-spin" />}
      {status === 'saved' && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
      {status === 'error' && <AlertCircle size={13} />}
      {(status === 'pending' || status === 'idle') && (
        <span className="size-1.5 rounded-full bg-ink-300 dark:bg-ink-600" />
      )}
      <span>{label}</span>
    </span>
  );
}
