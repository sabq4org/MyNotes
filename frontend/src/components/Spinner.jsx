import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function Spinner({ className, size = 18 }) {
  return (
    <Loader2
      className={clsx('animate-spin text-ink-400', className)}
      size={size}
      strokeWidth={2.5}
    />
  );
}
