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

function AuthGate() {
  const { bootstrapping, isAuthenticated, isSetup } = useAuth();

  if (bootstrapping) return <FullScreenLoader />;

  if (isSetup === null) {
    // Couldn't reach the server. Show a minimal retry state.
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-sm text-center">
          <h2 className="font-semibold text-ink-900">تعذّر الاتصال بالخادم</h2>
          <p className="text-sm text-ink-500 mt-2">
            تأكّد أن الخادم يعمل على المنفذ 4000، ثم أعد تحميل الصفحة.
          </p>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
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
