import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowRight,
  Plus,
  Search,
  ArrowLeft as MobileBack,
  Pencil,
  Check,
  Trash2,
  Pin,
  PinOff,
} from 'lucide-react';
import clsx from 'clsx';

import AppHeader from '../components/AppHeader';
import NoteListItem from '../components/NoteListItem';
import NoteEditor from '../components/NoteEditor';
import NoteView from '../components/NoteView';
import SaveIndicator from '../components/SaveIndicator';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import TagInput from '../components/TagInput';
import TagChip from '../components/TagChip';

import { getProject } from '../api/projects';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from '../api/notes';
import { listTags } from '../api/tags';
import { describeError } from '../lib/errors';
import useDebouncedSave from '../lib/useDebouncedSave';
import { stripHtml } from '../lib/format';

export default function ProjectPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState([]);

  const [allTags, setAllTags] = useState([]);
  const [tagFilter, setTagFilter] = useState(null); // tag name (lowercased) or null

  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mobileShowEditor, setMobileShowEditor] = useState(false);

  // Read vs. edit mode for the currently selected note. Notes always open
  // in 'view' mode unless the user just created an empty one (then 'edit').
  const [mode, setMode] = useState('view');

  const titleInputRef = useRef(null);

  /* ── Load project + notes ──────────────────────────── */

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, list, tags] = await Promise.all([
        getProject(projectId),
        listNotes(projectId),
        listTags().catch(() => []),
      ]);
      setProject(proj);
      setNotes(list);
      setAllTags(tags);

      // Auto-select first note if nothing selected yet (the `?note=` param
      // is handled by a dedicated effect below so it works even when the
      // page is already mounted on the same project).
      if (list.length > 0 && selectedId == null) {
        setSelectedId(list[0].id);
        setDraftTitle(list[0].title || '');
        setDraftContent(list[0].content || '');
        setDraftTags((list[0].tags || []).map((t) => t.name));
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('المشروع غير موجود.');
      } else {
        setError(describeError(err, 'تعذّر تحميل المشروع.'));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (Number.isFinite(projectId)) refresh();
  }, [projectId, refresh]);

  // When ?note=ID is present (e.g. navigated from global search), select it
  // as soon as the notes list has loaded.
  useEffect(() => {
    const requested = Number(searchParams.get('note'));
    if (!Number.isFinite(requested) || requested === selectedId) return;
    if (notes.length === 0) return;
    const target = notes.find((n) => n.id === requested);
    if (!target) return;
    setSelectedId(target.id);
    setDraftTitle(target.title || '');
    setDraftContent(target.content || '');
    setDraftTags((target.tags || []).map((t) => t.name));
    setMobileShowEditor(true);
    setMode('view');
    const next = new URLSearchParams(searchParams);
    next.delete('note');
    setSearchParams(next, { replace: true });
  }, [searchParams, notes, selectedId, setSearchParams]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  /**
   * Notes shown in the sidebar — for the currently selected note we substitute
   * the live draft title/content so the user sees their typing reflected
   * immediately, even before the auto-save lands (or if it fails).
   */
  const displayNotes = useMemo(() => {
    if (selectedId == null) return notes;
    return notes.map((n) =>
      n.id === selectedId
        ? {
            ...n,
            title: draftTitle,
            content: draftContent,
            tags: draftTags.map((name, i) => ({ id: `draft-${i}`, name })),
          }
        : n
    );
  }, [notes, selectedId, draftTitle, draftContent, draftTags]);

  /**
   * Distinct tags currently in use within this project, sorted by usage count.
   * Used to render the tag-filter strip above the notes search box.
   */
  const projectTags = useMemo(() => {
    const map = new Map();
    for (const n of displayNotes) {
      for (const t of n.tags || []) {
        const key = t.name.toLowerCase();
        const entry = map.get(key) || { name: t.name, count: 0 };
        entry.count += 1;
        map.set(key, entry);
      }
    }
    return [...map.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar')
    );
  }, [displayNotes]);

  /* ── Auto-save draft ───────────────────────────────── */

  const [staleNoteWarning, setStaleNoteWarning] = useState('');

  const refreshAllTags = useCallback(async () => {
    try {
      const tags = await listTags();
      setAllTags(tags);
    } catch {
      /* non-fatal */
    }
  }, []);

  const saveSelected = useCallback(
    async (payload) => {
      if (!selectedId) return;
      try {
        const updated = await updateNote(selectedId, payload);
        setNotes((prev) =>
          prev
            .map((n) => (n.id === updated.id ? updated : n))
            .sort(sortNotes)
        );
        setStaleNoteWarning('');
        // Tag set may have shifted (new tag created, old one orphaned) —
        // refresh suggestions in the background.
        if (payload && Object.prototype.hasOwnProperty.call(payload, 'tags')) {
          refreshAllTags();
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          // Note was removed elsewhere (e.g. another tab, or DB reset).
          // Drop it from the local list and clear selection.
          setNotes((prev) => prev.filter((n) => n.id !== selectedId));
          setSelectedId(null);
          setDraftTitle('');
          setDraftContent('');
          setMobileShowEditor(false);
          setStaleNoteWarning(
            'هذه الملاحظة لم تعد موجودة. ربما حُذفت من جلسة أخرى. جرّب إنشاء ملاحظة جديدة.'
          );
          const friendly = new Error(
            'الملاحظة غير موجودة (تم حذفها مسبقاً).'
          );
          friendly.userMessage = 'الملاحظة غير موجودة (تم حذفها مسبقاً).';
          throw friendly;
        }
        const friendly = new Error(describeError(err, 'فشل الحفظ.'));
        friendly.userMessage = describeError(err, 'فشل الحفظ.');
        throw friendly;
      }
    },
    [selectedId, refreshAllTags]
  );

  const { status, errorMessage, schedule, flush } = useDebouncedSave({
    key: selectedId,
    save: saveSelected,
    delay: 700,
  });

  // When user changes selection, flush previous edits first.
  const selectNote = useCallback(
    async (note) => {
      // On small screens the first note may already be selected while the
      // reader pane is hidden. Tapping it again must still open the note.
      if (note.id === selectedId) {
        setMobileShowEditor(true);
        setMode('view');
        return;
      }

      await flush();
      setSelectedId(note.id);
      setDraftTitle(note.title || '');
      setDraftContent(note.content || '');
      setDraftTags((note.tags || []).map((t) => t.name));
      setMobileShowEditor(true);
      setMode('view');
      setStaleNoteWarning('');
    },
    [flush, selectedId]
  );

  // Toggle between read and edit modes. When leaving edit mode we flush any
  // pending debounced save so the read view always reflects the latest data.
  const enterEditMode = useCallback(() => {
    setMode('edit');
  }, []);

  const exitEditMode = useCallback(async () => {
    await flush();
    setMode('view');
  }, [flush]);

  // Keyboard shortcuts: Cmd/Ctrl+E toggles edit, Esc exits edit.
  useEffect(() => {
    const onKey = (e) => {
      if (!selectedId) return;
      const target = e.target;
      const isFormField =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA');

      if ((e.metaKey || e.ctrlKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        if (mode === 'edit') exitEditMode();
        else enterEditMode();
        return;
      }
      if (e.key === 'Escape' && mode === 'edit' && !isFormField) {
        e.preventDefault();
        exitEditMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId, enterEditMode, exitEditMode]);

  // Whenever drafts change, schedule a save (unless still loading the note).
  const onTitleChange = (e) => {
    const v = e.target.value;
    setDraftTitle(v);
    schedule({ title: v, content: draftContent, tags: draftTags });
  };

  const onContentChange = (html) => {
    setDraftContent(html);
    schedule({ title: draftTitle, content: html, tags: draftTags });
  };

  const onTagsChange = (next) => {
    setDraftTags(next);
    schedule({ title: draftTitle, content: draftContent, tags: next });
  };

  /* ── Note actions ──────────────────────────────────── */

  const handleNew = async () => {
    await flush();
    setStaleNoteWarning('');
    try {
      const created = await createNote(projectId, {
        title: '',
        content: '',
      });
      setNotes((prev) => [created, ...prev].sort(sortNotes));
      setSelectedId(created.id);
      setDraftTitle('');
      setDraftContent('');
      setDraftTags([]);
      setMobileShowEditor(true);
      // A brand-new empty note has nothing to read — jump straight to edit.
      setMode('edit');
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } catch (err) {
      alert(describeError(err, 'تعذّر إنشاء الملاحظة.'));
    }
  };

  const handleTogglePin = async (note) => {
    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)).sort(sortNotes)
      );
    } catch (err) {
      alert(describeError(err, 'تعذّر تحديث التثبيت.'));
    }
  };

  const handleDelete = (note) => setConfirmDelete(note);

  const confirmDeleteNote = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    try {
      await deleteNote(target.id);
      setNotes((prev) => prev.filter((n) => n.id !== target.id));
      if (selectedId === target.id) {
        setSelectedId(null);
        setDraftTitle('');
        setDraftContent('');
        setDraftTags([]);
        setMobileShowEditor(false);
      }
      setConfirmDelete(null);
      refreshAllTags();
    } catch (err) {
      alert(describeError(err, 'تعذّر حذف الملاحظة.'));
      setConfirmDelete(null);
    }
  };

  /* ── Search ────────────────────────────────────────── */

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayNotes.filter((n) => {
      if (tagFilter) {
        const has = (n.tags || []).some(
          (t) => t.name.toLowerCase() === tagFilter
        );
        if (!has) return false;
      }
      if (!q) return true;
      const title = (n.title || '').toLowerCase();
      const content = stripHtml(n.content).toLowerCase();
      const tagText = (n.tags || []).map((t) => t.name).join(' ').toLowerCase();
      return (
        title.includes(q) || content.includes(q) || tagText.includes(q)
      );
    });
  }, [displayNotes, search, tagFilter]);

  /* ── Render ────────────────────────────────────────── */

  if (!Number.isFinite(projectId)) {
    return (
      <ErrorScreen message="معرّف المشروع غير صالح." onBack={() => navigate('/')} />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/')} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <div className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 flex flex-col">
        {/* Project breadcrumb / header */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-brand-700 transition"
          >
            <ArrowRight size={16} />
            <span>المشاريع</span>
          </Link>
          <span className="text-ink-300">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: project?.color || '#6366f1' }}
              aria-hidden
            />
            <h1 className="text-lg font-semibold text-ink-900 truncate">
              {project?.name}
            </h1>
          </div>
        </div>

        {staleNoteWarning && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <span className="flex-1">{staleNoteWarning}</span>
            <button
              type="button"
              onClick={() => setStaleNoteWarning('')}
              className="text-amber-700 hover:text-amber-900 text-xs underline"
            >
              إخفاء
            </button>
          </div>
        )}

        {/* Main split layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-0">
          {/* Notes sidebar */}
          <aside
            className={clsx(
              'card p-0 flex flex-col min-h-[60vh] md:min-h-0',
              mobileShowEditor && selectedNote ? 'hidden md:flex' : 'flex'
            )}
          >
            <div className="p-3 border-b border-ink-100 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-700">
                  الملاحظات{' '}
                  <span className="text-ink-400 font-normal">
                    ({notes.length})
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={handleNew}
                  className="btn-primary !py-1.5 !px-2.5 text-xs gap-1"
                >
                  <Plus size={14} />
                  جديدة
                </button>
              </div>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="search"
                  placeholder="ابحث في الملاحظات…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pr-8 !py-2 text-sm"
                />
              </div>

              {projectTags.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  {projectTags.slice(0, 12).map((t) => {
                    const key = t.name.toLowerCase();
                    const isActive = tagFilter === key;
                    return (
                      <TagChip
                        key={key}
                        name={t.name}
                        size="xs"
                        active={isActive}
                        onClick={() =>
                          setTagFilter((cur) => (cur === key ? null : key))
                        }
                      />
                    );
                  })}
                  {tagFilter && (
                    <button
                      type="button"
                      onClick={() => setTagFilter(null)}
                      className="text-[11px] text-ink-500 hover:text-ink-800 underline mr-1"
                    >
                      مسح الفلتر
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-1">
              {filteredNotes.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-ink-400">
                  {search
                    ? 'لا نتائج تطابق بحثك.'
                    : 'لا توجد ملاحظات بعد. اضغط "جديدة" لإنشاء أوّل ملاحظة.'}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={note.id === selectedId}
                    onSelect={selectNote}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Editor / viewer area */}
          <section
            className={clsx(
              'card p-0 flex flex-col min-h-[60vh] md:min-h-0 overflow-hidden',
              !mobileShowEditor || !selectedNote ? 'hidden md:flex' : 'flex'
            )}
          >
            {selectedNote ? (
              mode === 'edit' ? (
                <>
                  <div className="px-4 py-2.5 border-b border-ink-100 bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileShowEditor(false)}
                        className="md:hidden p-1.5 rounded text-ink-500 hover:bg-ink-100"
                        aria-label="رجوع"
                      >
                        <MobileBack size={18} />
                      </button>
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={draftTitle}
                        onChange={onTitleChange}
                        placeholder="عنوان الملاحظة"
                        maxLength={200}
                        className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-ink-900 placeholder:text-ink-300 focus:outline-none"
                      />
                      <SaveIndicator status={status} errorMessage={errorMessage} />
                      <button
                        type="button"
                        onClick={exitEditMode}
                        className="btn-primary !py-1.5 !px-3 text-xs gap-1"
                        title="إنهاء التحرير (Esc)"
                      >
                        <Check size={14} />
                        تم
                      </button>
                    </div>
                    <TagInput
                      value={draftTags}
                      onChange={onTagsChange}
                      suggestions={allTags}
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <NoteEditor
                      key={selectedNote.id}
                      value={draftContent}
                      onChange={onContentChange}
                      autoFocus
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-2.5 border-b border-ink-100 bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileShowEditor(false)}
                        className="md:hidden p-1.5 rounded text-ink-500 hover:bg-ink-100"
                        aria-label="رجوع"
                      >
                        <MobileBack size={18} />
                      </button>
                      <h2 className="flex-1 min-w-0 truncate text-lg font-semibold text-ink-900">
                        {draftTitle || (
                          <span className="text-ink-300 font-normal">
                            بلا عنوان
                          </span>
                        )}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(selectedNote)}
                        className={clsx(
                          'p-1.5 rounded-lg transition',
                          selectedNote.isPinned
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700'
                        )}
                        title={selectedNote.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                        aria-label={selectedNote.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                      >
                        {selectedNote.isPinned ? (
                          <PinOff size={16} />
                        ) : (
                          <Pin size={16} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedNote)}
                        className="p-1.5 rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="حذف"
                        aria-label="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={enterEditMode}
                        className="btn-primary !py-1.5 !px-3 text-xs gap-1"
                        title="تحرير (⌘/Ctrl + E)"
                      >
                        <Pencil size={14} />
                        تحرير
                      </button>
                    </div>

                    {draftTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {draftTags.map((name) => (
                          <TagChip
                            key={name}
                            name={name}
                            size="xs"
                            onClick={() =>
                              setTagFilter((cur) =>
                                cur === name.toLowerCase()
                                  ? null
                                  : name.toLowerCase()
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex-1 min-h-0 overflow-hidden"
                    onDoubleClick={enterEditMode}
                  >
                    <NoteView
                      html={draftContent}
                      updatedAt={selectedNote.updatedAt}
                      createdAt={selectedNote.createdAt}
                      onTaskToggle={onContentChange}
                    />
                  </div>
                </>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <EmptyState
                  title={notes.length === 0 ? 'لا توجد ملاحظات بعد' : 'اختر ملاحظة'}
                  description={
                    notes.length === 0
                      ? 'ابدأ بإنشاء أوّل ملاحظة في هذا المشروع.'
                      : 'اختر ملاحظة من القائمة، أو أنشئ واحدة جديدة.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={handleNew}
                      className="btn-primary"
                    >
                      <Plus size={16} />
                      ملاحظة جديدة
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="حذف الملاحظة"
        description={`هل تريد حذف "${confirmDelete?.title || 'بلا عنوان'}"؟ لا يمكن التراجع.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        destructive
        onConfirm={confirmDeleteNote}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function sortNotes(a, b) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md w-full text-center space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">حدث خطأ</h2>
        <p className="text-sm text-ink-600">{message}</p>
        <button onClick={onBack} className="btn-primary mx-auto">
          العودة إلى المشاريع
        </button>
      </div>
    </div>
  );
}
