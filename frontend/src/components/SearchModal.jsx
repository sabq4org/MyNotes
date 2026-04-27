import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Pin } from 'lucide-react';
import clsx from 'clsx';

import { searchNotes } from '../api/search';
import { stripHtml, relativeTime } from '../lib/format';
import TagChip from './TagChip';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/**
 * Global search dialog opened via Cmd/Ctrl+K from anywhere in the app.
 * Searches notes by title / content / tag across every project.
 *
 * Tip: prefixing the query with `#` (e.g. `#مهم`) limits to tag matches.
 */
export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setError('');
      setActive(0);
      // Defer to next tick so Tiptap's blur etc. settle first.
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setError('');
      return undefined;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await searchNotes(trimmed);
        setResults(data.notes || []);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'تعذّر إجراء البحث.');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    setActive(0);
  }, [results]);

  function go(note) {
    onClose?.();
    navigate(`/projects/${note.projectId}?note=${note.id}`);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const hint = useMemo(() => {
    if (loading) return 'جاري البحث…';
    if (error) return error;
    if (query.trim().length === 0) {
      return 'ابحث في كل ملاحظاتك. ابدأ السؤال بـ # لتقييد البحث على وسم.';
    }
    if (query.trim().length < MIN_QUERY) {
      return 'اكتب حرفين على الأقل.';
    }
    if (results.length === 0) return 'لا نتائج.';
    return null;
  }, [loading, error, query, results]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-ink-900/40 backdrop-blur-sm
                 dark:bg-black/70"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="بحث شامل"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-ink-200 overflow-hidden
                   dark:bg-ink-900 dark:ring-ink-700 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100 dark:border-ink-800">
          <Search size={18} className="text-ink-400 shrink-0 dark:text-ink-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ابحث في الملاحظات والوسوم…"
            className="flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none
                       dark:text-ink-100 dark:placeholder:text-ink-500"
            autoComplete="off"
          />
          {loading ? (
            <Loader2 size={16} className="animate-spin text-ink-400 shrink-0 dark:text-ink-500" />
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         dark:text-ink-500 dark:hover:text-ink-200 dark:hover:bg-ink-800"
              aria-label="إغلاق"
              title="إغلاق (Esc)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-auto">
          {hint ? (
            <div className="px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400">
              {hint}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((note, i) => (
                <li key={note.id}>
                  <button
                    type="button"
                    data-idx={i}
                    onClick={() => go(note)}
                    onMouseEnter={() => setActive(i)}
                    className={clsx(
                      'w-full text-start px-4 py-3 transition flex flex-col gap-1.5 border-b border-ink-50 last:border-b-0',
                      'dark:border-ink-800',
                      i === active
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : 'hover:bg-ink-50 dark:hover:bg-ink-800/60'
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: note.projectColor || '#6366f1',
                        }}
                        aria-hidden
                      />
                      <span className="text-ink-500 truncate dark:text-ink-400">
                        {note.projectName}
                      </span>
                      {note.isPinned && (
                        <Pin
                          size={11}
                          fill="currentColor"
                          className="text-brand-500 shrink-0 dark:text-brand-400"
                        />
                      )}
                      <span className="ml-auto text-ink-400 dark:text-ink-500">
                        {relativeTime(note.updatedAt)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-ink-900 truncate dark:text-ink-50">
                      {note.title?.trim() || 'بلا عنوان'}
                    </div>
                    <div className="text-xs text-ink-500 line-clamp-2 dark:text-ink-400">
                      {stripHtml(note.content).slice(0, 200) || '—'}
                    </div>
                    {note.tags?.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1 pt-0.5">
                        {note.tags.slice(0, 4).map((t) => (
                          <TagChip key={t.id} name={t.name} size="xs" />
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-ink-100 bg-ink-50/50 text-[11px] text-ink-500
                        dark:border-ink-800 dark:bg-ink-950/40 dark:text-ink-400">
          <Kbd>↑↓</Kbd>
          <span>تنقّل</span>
          <Kbd>Enter</Kbd>
          <span>فتح</span>
          <Kbd>Esc</Kbd>
          <span>إغلاق</span>
          <span className="ml-auto">{results.length} نتيجة</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 px-1.5 py-0.5 rounded bg-white ring-1 ring-ink-200 text-ink-700 text-[10px] font-mono
                    dark:bg-ink-800 dark:ring-ink-700 dark:text-ink-200">
      {children}
    </kbd>
  );
}
