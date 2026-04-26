import { useEffect, useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import { relativeTime } from '../lib/format';

function stripViewOnlyCodeControls(root) {
  root.querySelectorAll('.note-code-copy').forEach((button) => button.remove());
  root.querySelectorAll('.note-code-block').forEach((wrapper) => {
    const pre = wrapper.querySelector(':scope > pre');
    if (pre) {
      wrapper.replaceWith(pre);
    }
  });
}

function getCleanContentHtml(root) {
  const clone = root.cloneNode(true);
  stripViewOnlyCodeControls(clone);
  return clone.innerHTML;
}

function decorateCodeBlocks(html) {
  if (!html || typeof document === 'undefined') return html;

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('pre').forEach((pre, index) => {
    if (pre.closest('.note-code-block')) return;

    pre.setAttribute('dir', 'ltr');
    pre.querySelectorAll('code').forEach((code) => {
      code.setAttribute('dir', 'ltr');
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'note-code-block';
    wrapper.setAttribute('dir', 'ltr');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'note-code-copy';
    button.setAttribute('aria-label', 'نسخ الكود');
    button.setAttribute('title', 'نسخ الكود');
    button.dataset.codeIndex = String(index);
    button.innerHTML = '<span aria-hidden="true">⧉</span><span>نسخ</span>';

    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(button);
  });

  return template.innerHTML;
}

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
      onTaskToggle(getCleanContentHtml(root));
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

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const handler = async (e) => {
      const button = e.target.closest?.('.note-code-copy');
      if (!button) return;

      const wrapper = button.closest('.note-code-block');
      const text = wrapper?.querySelector('pre')?.innerText || '';
      if (!text) return;

      let copiedOk = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          copiedOk = true;
        }
      } catch {
        copiedOk = false;
      }

      if (!copiedOk) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copiedOk = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch {
          copiedOk = false;
        }
      }

      if (copiedOk) {
        const previous = button.innerHTML;
        button.innerHTML = '<span aria-hidden="true">✓</span><span>تم النسخ</span>';
        button.setAttribute('aria-label', 'تم نسخ الكود');
        window.setTimeout(() => {
          button.innerHTML = previous;
          button.setAttribute('aria-label', 'نسخ الكود');
        }, 1400);
      }
    };

    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, []);

  const isEmpty = !html || !html.trim() || html.trim() === '<p></p>';
  const decoratedHtml = useMemo(() => decorateCodeBlocks(html), [html]);

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
              'note-content prose prose-ink max-w-none px-6 py-5 ' +
              'prose-headings:font-semibold prose-p:my-3 prose-li:my-1 ' +
              'prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline ' +
              'prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:border-brand-300 prose-blockquote:bg-brand-50/40 prose-blockquote:py-1 prose-blockquote:rounded ' +
              'prose-code:before:content-none prose-code:after:content-none ' +
              'prose-code:bg-ink-100 prose-code:text-ink-800 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:font-medium'
            }
            dangerouslySetInnerHTML={{ __html: decoratedHtml }}
          />
        )}
      </div>
    </div>
  );
}
