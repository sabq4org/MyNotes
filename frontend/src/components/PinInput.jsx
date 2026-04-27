import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function PinInput({
  value,
  onChange,
  placeholder = 'الرقم السري',
  autoFocus = false,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'input ps-3.5 pe-11 text-lg tracking-[0.4em] text-center',
          'placeholder:tracking-normal placeholder:text-base'
        )}
        dir="ltr"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute inset-y-0 end-0 flex items-center px-3 text-ink-400 hover:text-ink-700 transition
                   dark:text-ink-500 dark:hover:text-ink-200"
        aria-label={visible ? 'إخفاء' : 'إظهار'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
