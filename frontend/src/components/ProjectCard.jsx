import { MoreVertical, Pencil, Trash2, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ProjectCard({ project, onEdit, onDelete, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const initial = project.name.trim().slice(0, 1).toUpperCase();
  const icon = project.icon || initial;
  const color = project.color || '#6366f1';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(project);
        }
      }}
      className="card p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
                 dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="size-12 rounded-xl flex items-center justify-center text-white text-2xl font-semibold shadow-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          <span className="leading-none" aria-hidden>
            {icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink-900 truncate dark:text-ink-50">{project.name}</h3>
          {project.description ? (
            <p className="text-sm text-ink-500 line-clamp-2 mt-0.5 dark:text-ink-400">
              {project.description}
            </p>
          ) : (
            <p className="text-sm text-ink-400 mt-0.5 dark:text-ink-500">بلا وصف</p>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700
                       dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-200"
            aria-label="خيارات"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute end-0 top-full mt-1 z-10 min-w-[160px] card py-1 shadow-lg animate-pop-in">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onEdit?.(project);
                }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50
                           dark:text-ink-200 dark:hover:bg-ink-800"
              >
                <Pencil size={15} />
                تعديل
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete?.(project);
                }}
                className="w-full text-start flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50
                           dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <Trash2 size={15} />
                حذف
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <FileText size={14} />
        <span>{project.notesCount} ملاحظة</span>
      </div>
    </div>
  );
}
