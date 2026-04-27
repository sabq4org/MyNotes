import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import PinInput from '../components/PinInput';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { describeError } from '../lib/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = pin.length > 0 && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pin) return;
    setBusy(true);
    try {
      await login(pin);
    } catch (err) {
      setError(describeError(err, 'تعذّر تسجيل الدخول.'));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="مرحباً بعودتك" subtitle="أدخل رقمك السري للدخول إلى مفكرتك.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">الرقم السري</label>
          <PinInput value={pin} onChange={setPin} autoFocus disabled={busy} />
        </div>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2
                          dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30">
            {error}
          </div>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
          {busy ? <Spinner className="text-white" /> : null}
          <span>دخول</span>
          <ArrowLeft size={16} className="rtl:rotate-180" />
        </button>
      </form>
    </AuthLayout>
  );
}
