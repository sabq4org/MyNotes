import clsx from 'clsx';
import { Pin, Trash2 } from 'lucide-react';
import { stripHtml, relativeTime } from '../lib/format';
import TagChip from './TagChip';

export default function NoteListItem({ note, active, onSelect, onTogglePin, onDelete }) {
  const preview = stripHtml(note.content).slice(0, 80) || 'لا يوجد محتوى';
  const title = note.title?.trim() || 'بلا عنوان';
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const visibleTags = tags.slice(0, 3);
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(note)}
      className={clsx(
        'group w-full text-start rounded-xl px-3 py-3 transition border',
        active
          ? 'bg-brand-50 border-brand-200 shadow-sm dark:bg-brand-500/10 dark:border-brand-500/30'
          : 'bg-white border-transparent hover:bg-ink-50 dark:bg-transparent dark:hover:bg-ink-800/60'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {note.isPinned && (
              <Pin
                size={12}
                className="text-brand-500 shrink-0 dark:text-brand-400"
                fill="currentColor"
              />
            )}
            <h3
              className={clsx(
                'truncate text-sm font-medium',
                active
                  ? 'text-brand-900 dark:text-brand-100'
                  : 'text-ink-900 dark:text-ink-100'
              )}
            >
              {title}
            </h3>
          </div>
          <p className="truncate text-xs text-ink-500 mt-0.5 dark:text-ink-400">{preview}</p>
          {visibleTags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mt-1.5">
              {visibleTags.map((t) => (
                <TagChip key={t.id} name={t.name} size="xs" />
              ))}
              {hiddenCount > 0 && (
                <span className="text-[11px] text-ink-400 dark:text-ink-500">+{hiddenCount}</span>
              )}
            </div>
          )}
          <p className="text-[11px] text-ink-400 mt-1.5 dark:text-ink-500">
            {relativeTime(note.updatedAt)}
          </p>
        </div>

        <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(note);
            }}
            className="p-1 rounded text-ink-400 hover:text-brand-600 hover:bg-white
                       dark:text-ink-500 dark:hover:text-brand-300 dark:hover:bg-ink-900"
            title={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
            aria-label={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
          >
            <Pin size={13} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(note);
            }}
            className="p-1 rounded text-ink-400 hover:text-rose-600 hover:bg-white
                       dark:text-ink-500 dark:hover:text-rose-300 dark:hover:bg-ink-900"
            title="حذف"
            aria-label="حذف الملاحظة"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </button>
  );
}
