import { NotebookPen } from 'lucide-react';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-ink-50 to-white">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="size-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-soft mb-4">
            <NotebookPen size={26} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">مفكرتي</h1>
          <p className="text-ink-500 text-sm mt-1">المساحة الشخصية لمشاريعك وملاحظاتك</p>
        </div>

        <div className="card p-7 animate-pop-in">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="text-ink-500 text-sm mt-1.5">{subtitle}</p>}

          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-ink-500 animate-fade-in">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
