import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import PinInput from '../components/PinInput';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { describeError } from '../lib/errors';

export default function SetupPage() {
  const { setupAndLogin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = pin.length >= 4 && pin === confirm && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length < 4) {
      setError('الرقم السري يجب أن يكون 4 خانات على الأقل.');
      return;
    }
    if (pin !== confirm) {
      setError('الرقم السري غير متطابق.');
      return;
    }
    setBusy(true);
    try {
      await setupAndLogin(pin);
    } catch (err) {
      setError(describeError(err, 'تعذّر إنشاء الرقم السري.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="أهلاً بك! اختر رقمك السري"
      subtitle="هذا هو رقمك الشخصي للدخول إلى مفكرتك. لا يمكن استرداده، فاحفظه جيداً."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">الرقم السري</label>
          <PinInput value={pin} onChange={setPin} autoFocus disabled={busy} />
        </div>

        <div>
          <label className="label">أعد إدخال الرقم</label>
          <PinInput
            value={confirm}
            onChange={setConfirm}
            disabled={busy}
            placeholder="تأكيد الرقم"
          />
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2
                          dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30">
            {error}
          </div>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
          {busy ? <Spinner className="text-white" /> : null}
          <span>إنشاء الرقم والدخول</span>
          <ArrowLeft size={16} className="rtl:rotate-180" />
        </button>
      </form>
    </AuthLayout>
  );
}
