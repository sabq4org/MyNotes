import { useEffect, useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import ColorPicker, { PROJECT_COLORS } from './ColorPicker';
import IconPicker, { PROJECT_ICONS } from './IconPicker';
import { describeError } from '../lib/errors';

export default function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  mode = 'create',
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState(PROJECT_ICONS[0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setColor(initial?.color ?? PROJECT_COLORS[0]);
      setIcon(initial?.icon ?? PROJECT_ICONS[0]);
      setError('');
      setBusy(false);
    }
  }, [open, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('الاسم مطلوب.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
      });
      onClose?.();
    } catch (err) {
      setError(describeError(err, 'تعذّر حفظ المشروع.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={mode === 'create' ? 'مشروع جديد' : 'تعديل المشروع'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">اسم المشروع</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: الدراسة، العمل، أفكاري…"
            autoFocus
            disabled={busy}
            maxLength={120}
          />
        </div>

        <div>
          <label className="label">وصف مختصر (اختياري)</label>
          <textarea
            className="input min-h-[72px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="فكرة عامة عمّا يحويه هذا المجلد"
            disabled={busy}
            maxLength={500}
          />
        </div>

        <div>
          <label className="label">الأيقونة</label>
          <IconPicker value={icon} onChange={setIcon} color={color} />
        </div>

        <div>
          <label className="label">لون الأيقونة</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2
                          dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            إلغاء
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            {busy ? <Spinner className="text-white" /> : null}
            <span>{mode === 'create' ? 'إنشاء' : 'حفظ'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
