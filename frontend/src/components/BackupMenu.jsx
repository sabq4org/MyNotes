import { useEffect, useRef, useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

import { downloadBackup, importBackup } from '../api/backup';
import ConfirmDialog from './ConfirmDialog';

/**
 * Header dropdown that exposes the export / import backup actions.
 * Import wipes existing data and replaces it from the JSON file, so it
 * always goes through a confirmation dialog.
 */
export default function BackupMenu({ onAfterImport }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const fileRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!info) return undefined;
    const t = setTimeout(() => setInfo(''), 4000);
    return () => clearTimeout(t);
  }, [info]);

  async function handleExport() {
    setOpen(false);
    setError('');
    setBusy(true);
    try {
      const { filename } = await downloadBackup();
      setInfo(`تم تنزيل النسخة: ${filename}`);
    } catch (err) {
      setError(err?.message || 'تعذّر التصدير.');
    } finally {
      setBusy(false);
    }
  }

  function pickFile() {
    setOpen(false);
    setError('');
    fileRef.current?.click();
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (typeof data !== 'object' || data == null) {
        throw new Error('الملف غير صالح.');
      }
      setPendingImport({
        data,
        filename: file.name,
      });
    } catch (err) {
      setError(`الملف غير صالح: ${err.message || err}`);
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setBusy(true);
    setError('');
    try {
      const result = await importBackup(pendingImport.data);
      setPendingImport(null);
      const r = result?.restored;
      const detail = r
        ? ` (${r.projects} مشروع، ${r.notes} ملاحظة، ${r.tags} وسم)`
        : '';
      setInfo(`تم استيراد النسخة بنجاح${detail}`);
      onAfterImport?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'تعذّر الاستيراد.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost text-sm"
        title="نسخ احتياطي"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Database size={16} />
        )}
        <span className="hidden sm:inline">نسخ احتياطي</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-2 min-w-[220px] rounded-xl bg-white shadow-lg ring-1 ring-ink-200 overflow-hidden z-30"
        >
          <MenuItem
            icon={<Download size={15} />}
            label="تصدير نسخة احتياطية"
            description="تنزيل JSON بكل البيانات"
            onClick={handleExport}
          />
          <MenuItem
            icon={<Upload size={15} />}
            label="استيراد نسخة"
            description="يستبدل البيانات الحالية"
            destructive
            onClick={pickFile}
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChosen}
      />

      {(info || error) && (
        <div
          className={clsx(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 min-w-[260px] max-w-[90vw] rounded-xl px-4 py-2.5 text-sm shadow-lg ring-1',
            error
              ? 'bg-rose-50 text-rose-800 ring-rose-200'
              : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          )}
        >
          {error || info}
          <button
            type="button"
            onClick={() => {
              setError('');
              setInfo('');
            }}
            className="ml-3 text-xs underline opacity-70 hover:opacity-100"
          >
            إخفاء
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="استيراد نسخة احتياطية"
        description={
          pendingImport
            ? `سيتم استبدال جميع البيانات الحالية بمحتوى الملف "${pendingImport.filename}". لا يمكن التراجع. هل تريد المتابعة؟`
            : ''
        }
        confirmLabel={busy ? 'جاري الاستيراد…' : 'استيراد واستبدال'}
        cancelLabel="إلغاء"
        destructive
        onConfirm={confirmImport}
        onCancel={() => !busy && setPendingImport(null)}
      />
    </div>
  );
}

function MenuItem({ icon, label, description, destructive, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        'w-full px-3 py-2.5 text-start flex items-start gap-2.5 transition',
        destructive
          ? 'text-rose-700 hover:bg-rose-50'
          : 'text-ink-800 hover:bg-ink-50'
      )}
    >
      <span
        className={clsx(
          'mt-0.5 shrink-0',
          destructive ? 'text-rose-500' : 'text-brand-600'
        )}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[11px] text-ink-500">{description}</span>
      </span>
    </button>
  );
}
