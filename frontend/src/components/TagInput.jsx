import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Tag as TagIcon } from 'lucide-react';
import TagChip from './TagChip';

const MAX_TAG = 60;

/**
 * Tag input with chips + suggestion dropdown.
 * - value: array of strings (tag names)
 * - suggestions: array of { id, name, noteCount? } from /api/tags
 * - onChange(nextValue) is called whenever the chip list changes.
 *
 * Adds a tag on Enter / "," and removes the last chip on Backspace
 * when the input is empty.
 */
export default function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'أضف وسماً واضغط Enter',
  disabled = false,
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const lowerSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );

  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !lowerSet.has(s.name.toLowerCase()))
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [suggestions, draft, lowerSet]);

  useEffect(() => {
    setActive(0);
  }, [draft, open]);

  useEffect(() => {
    function onClickOutside(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function commit(name) {
    const cleaned = String(name || '')
      .trim()
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ');
    if (!cleaned) return;
    if (cleaned.length > MAX_TAG) return;
    if (lowerSet.has(cleaned.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange?.([...value, cleaned]);
    setDraft('');
  }

  function removeAt(index) {
    const next = value.slice();
    next.splice(index, 1);
    onChange?.(next);
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && filtered[active]) {
        commit(filtered[active].name);
      } else if (draft.trim()) {
        commit(draft);
      }
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    } else if (e.key === 'ArrowDown' && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp' && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={clsx(
          'flex items-center flex-wrap gap-1.5 px-2 py-1.5 rounded-lg ring-1 ring-ink-200 bg-white',
          'dark:bg-ink-900 dark:ring-ink-700',
          'focus-within:ring-2 focus-within:ring-brand-300 dark:focus-within:ring-brand-500/50 transition',
          disabled && 'opacity-60 pointer-events-none'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <TagIcon size={14} className="text-ink-400 mr-1 dark:text-ink-500" />
        {value.map((name, i) => (
          <TagChip
            key={`${name}-${i}`}
            name={name}
            onRemove={disabled ? undefined : () => removeAt(i)}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          maxLength={MAX_TAG}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none py-0.5
                     dark:text-ink-100 dark:placeholder:text-ink-500"
          disabled={disabled}
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-20 mt-1 w-full rounded-lg bg-white shadow-lg ring-1 ring-ink-200 max-h-60 overflow-auto
                     dark:bg-ink-900 dark:ring-ink-700 dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          role="listbox"
        >
          {filtered.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(s.name)}
              className={clsx(
                'flex items-center justify-between w-full px-3 py-2 text-sm transition',
                i === active
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800'
              )}
            >
              <span className="truncate">#{s.name}</span>
              {typeof s.noteCount === 'number' && (
                <span className="text-xs text-ink-400 dark:text-ink-500">{s.noteCount}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
