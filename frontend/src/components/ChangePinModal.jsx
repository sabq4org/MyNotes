import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';
import { useAuth } from '../context/AuthContext';
import { describeError } from '../lib/errors';

export default function ChangePinModal({ open, onClose }) {
  const { changePin } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess('');
    setBusy(false);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPin.trim()) {
      setError('اكتب كلمة المرور الحالية.');
      return;
    }
    if (newPin.trim().length < 4) {
      setError('كلمة المرور الجديدة يجب أن تكون 4 أحرف/أرقام على الأقل.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setError('تأكيد كلمة المرور غير مطابق.');
      return;
    }
    if (currentPin.trim() === newPin.trim()) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية.');
      return;
    }

    setBusy(true);
    try {
      await changePin(currentPin, newPin);
      setSuccess('تم تغيير كلمة المرور بنجاح.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      window.setTimeout(() => onClose?.(), 900);
    } catch (err) {
      setError(describeError(err, 'تعذّر تغيير كلمة المرور.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="تغيير كلمة المرور"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-ink-50 border border-ink-100 px-3.5 py-3 flex items-start gap-2 text-sm text-ink-600
                        dark:bg-ink-800/60 dark:border-ink-700 dark:text-ink-300">
          <KeyRound size={17} className="mt-0.5 text-brand-600 shrink-0 dark:text-brand-400" />
          <p>غيّر كلمة مرور الدخول للتطبيق. بعد الحفظ ستبقى مسجّل دخولك بالتوكن الجديد.</p>
        </div>

        <div>
          <label className="label">كلمة المرور الحالية</label>
          <input
            type="password"
            className="input"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            autoComplete="current-password"
            disabled={busy}
            autoFocus
          />
        </div>

        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input
            type="password"
            className="input"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            autoComplete="new-password"
            disabled={busy}
            minLength={4}
          />
        </div>

        <div>
          <label className="label">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            className="input"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            autoComplete="new-password"
            disabled={busy}
            minLength={4}
          />
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2
                          dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2
                          dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30">
            {success}
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
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !currentPin.trim() || !newPin.trim() || !confirmPin.trim()}
          >
            {busy ? <Spinner className="text-white" /> : null}
            <span>حفظ</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
