import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import Spinner from './components/Spinner';

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}

function BackendUnreachable({ error }) {
  const isDev = import.meta.env.DEV;
  const status = error?.status;
  const code = error?.code;

  let title = 'تعذّر الاتصال بالخادم';
  let hint;
  if (status === 404) {
    title = 'مسار الـ API غير موجود';
    hint = isDev
      ? 'تأكّد أن الخادم يعمل على http://localhost:4000 وأن proxy في vite.config.js مضبوط.'
      : 'لم يُوجَّه /api/* إلى خدمة الخادم. تحقّق من إعدادات النشر (vercel.json + Services preset) ومن أن خدمة backend تم نشرها بنجاح.';
  } else if (status >= 500) {
    title = 'الخادم متاح ولكنّه فشل';
    hint = isDev
      ? 'افحص سجلّ الخادم في الطرفية لمعرفة الخطأ.'
      : 'افتح Vercel → Deployments → آخر deploy → Logs → backend، وتأكّد أن DATABASE_URL مضبوط ومتاح.';
  } else {
    hint = isDev
      ? 'تأكّد أن الخادم يعمل على http://localhost:4000، ثم أعد تحميل الصفحة.'
      : 'قد تكون خدمة الخادم لم تنطلق بعد، أو أن DATABASE_URL غير مضبوط في إعدادات النشر.';
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-6 max-w-md text-center">
        <h2 className="font-semibold text-ink-900">{title}</h2>
        <p className="text-sm text-ink-500 mt-2">{hint}</p>
        {(status || code) && (
          <p className="mt-3 text-[11px] font-mono text-ink-400">
            {status ? `HTTP ${status}` : ''}
            {status && code ? ' · ' : ''}
            {code || ''}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm"
          >
            فحص /api/health
          </a>
        </div>
      </div>
    </div>
  );
}

function AuthGate() {
  const { bootstrapping, isAuthenticated, isSetup, bootstrapError } = useAuth();

  if (bootstrapping) return <FullScreenLoader />;

  if (isSetup === null) {
    return <BackendUnreachable error={bootstrapError} />;
  }

  if (!isAuthenticated) {
    return isSetup ? <LoginPage /> : <SetupPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects/:id" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  );
}
