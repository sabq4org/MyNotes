import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { relativeTime } from '../lib/format';

/**
 * Read-only rendering of a note's content using the same Tailwind `prose`
 * classes as `NoteEditor`, so the formatting matches one-to-one. Task list
 * checkboxes are kept clickable but the rest of the document is inert.
 *
 * The `onTaskToggle(html)` callback fires whenever the user clicks a task
 * checkbox; it receives the updated HTML so the parent can persist it.
 */
export default function NoteView({
  html,
  updatedAt,
  createdAt,
  onTaskToggle,
}) {
  const ref = useRef(null);

  // Wire up clickable task list checkboxes (Tiptap's TaskItem renders
  // <li data-type="taskItem" data-checked="true|false"> with an inner
  // <input type="checkbox">). We mutate the DOM in place and emit the
  // resulting HTML so the parent can save.
  useEffect(() => {
    const root = ref.current;
    if (!root || !onTaskToggle) return;

    const handler = (e) => {
      const target = e.target;
      if (
        !(target instanceof HTMLInputElement) ||
        target.type !== 'checkbox'
      ) {
        return;
      }
      const li = target.closest('li[data-type="taskItem"]');
      if (!li) return;
      const next = target.checked;
      li.setAttribute('data-checked', next ? 'true' : 'false');
      target.checked = next;
      onTaskToggle(root.innerHTML);
    };

    root.addEventListener('change', handler);
    return () => root.removeEventListener('change', handler);
  }, [onTaskToggle]);

  // Make the rendered DOM read-only (except task checkboxes) — TaskItem's
  // checkbox HTML doesn't have `disabled` by default, but contenteditable
  // would let users mutate text. We're using a plain div so that's fine.
  // We just need to ensure other inputs (if any) stay disabled.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('input').forEach((el) => {
      if (el.type === 'checkbox') return;
      el.disabled = true;
    });
    // Open links in new tabs for safety.
    root.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }, [html]);

  const isEmpty = !html || !html.trim() || html.trim() === '<p></p>';

  return (
    <div className="flex flex-col h-full">
      {(updatedAt || createdAt) && (
        <div className="px-6 pt-5 pb-2 text-xs text-ink-400 border-b border-ink-100/60 flex items-center gap-3">
          {updatedAt && (
            <span>
              آخر تحديث:{' '}
              <span className="text-ink-600">{relativeTime(updatedAt)}</span>
            </span>
          )}
          {createdAt && createdAt !== updatedAt && (
            <span className="text-ink-300">·</span>
          )}
          {createdAt && createdAt !== updatedAt && (
            <span>
              أنشئت:{' '}
              <span className="text-ink-600">{relativeTime(createdAt)}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center text-ink-400">
            <div className="mx-auto mb-3 size-12 rounded-2xl bg-ink-50 text-ink-400 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <p className="text-sm font-medium text-ink-500">ملاحظة فارغة</p>
            <p className="text-xs mt-1 text-ink-400">
              اضغط <span className="text-ink-600 font-medium">تحرير</span> لإضافة محتوى.
            </p>
          </div>
        ) : (
          <div
            ref={ref}
            dir="rtl"
            className={
              'prose prose-ink max-w-none px-6 py-5 ' +
              'prose-headings:font-semibold prose-p:my-3 prose-li:my-1 ' +
              'prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline ' +
              'prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:border-brand-300 prose-blockquote:bg-brand-50/40 prose-blockquote:py-1 prose-blockquote:rounded ' +
              'prose-code:before:content-none prose-code:after:content-none ' +
              'prose-code:bg-ink-100 prose-code:text-ink-800 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
