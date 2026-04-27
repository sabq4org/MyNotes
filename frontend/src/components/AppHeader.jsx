import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LogOut, NotebookPen, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchModal from './SearchModal';
import BackupMenu from './BackupMenu';
import ChangePinModal from './ChangePinModal';
import ThemeToggle from './ThemeToggle';

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');

export default function AppHeader() {
  const { logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleAfterImport() {
    // Hard reload after import — every cached id may have changed.
    window.location.assign('/');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100 dark:bg-ink-950/80 dark:border-ink-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition"
          >
            <div className="size-8 rounded-lg bg-brand-600 text-white flex items-center justify-center dark:bg-brand-500">
              <NotebookPen size={16} strokeWidth={2.4} />
            </div>
            <span className="font-semibold text-ink-900 dark:text-ink-50">مفكرتي</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 mx-3 flex-1 max-w-md rounded-lg bg-ink-50 hover:bg-ink-100 ring-1 ring-ink-100 hover:ring-ink-200 px-3 py-1.5 text-sm text-ink-500 transition
                       dark:bg-ink-900 dark:hover:bg-ink-800 dark:ring-ink-800 dark:hover:ring-ink-700 dark:text-ink-400"
            title="بحث شامل"
          >
            <Search size={15} />
            <span>ابحث في كل ملاحظاتك…</span>
            <kbd className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white ring-1 ring-ink-200 text-[10px] font-mono text-ink-600
                            dark:bg-ink-800 dark:ring-ink-700 dark:text-ink-300">
              {isMac ? '⌘' : 'Ctrl'}+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-lg text-ink-600 hover:bg-ink-100 transition dark:text-ink-300 dark:hover:bg-ink-800"
            title="بحث"
            aria-label="بحث"
          >
            <Search size={18} />
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <BackupMenu onAfterImport={handleAfterImport} />
            <button
              type="button"
              onClick={() => setChangePinOpen(true)}
              className="btn-ghost text-sm"
              title="تغيير كلمة المرور"
            >
              <KeyRound size={16} />
              <span className="hidden sm:inline">كلمة المرور</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn-ghost text-sm"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ChangePinModal
        open={changePinOpen}
        onClose={() => setChangePinOpen(false)}
      />
    </>
  );
}
