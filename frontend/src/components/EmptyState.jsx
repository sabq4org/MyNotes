import { FolderPlus } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FolderPlus,
  title = 'لا توجد مشاريع بعد',
  description = 'ابدأ بإنشاء أول مشروع لك. كل مشروع هو مجلّد يحتوي ملاحظاتك ومهامك المتعلقة بفكرة معينة.',
  action,
  onCreate,
}) {
  // Backward-compat: if `onCreate` was passed (old API), render the default
  // primary button. Otherwise render the provided `action` node, if any.
  const renderedAction =
    action !== undefined
      ? action
      : onCreate && (
          <button type="button" onClick={onCreate} className="btn-primary mt-6">
            إنشاء أول مشروع
          </button>
        );

  return (
    <div className="card p-12 text-center animate-fade-in">
      <div className="mx-auto size-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        <Icon size={26} />
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="text-ink-500 text-sm mt-1.5 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {renderedAction && <div className="mt-6">{renderedAction}</div>}
    </div>
  );
}
