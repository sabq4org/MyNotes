import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import ProjectCard from '../components/ProjectCard';
import ProjectFormModal from '../components/ProjectFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api/projects';
import { describeError } from '../lib/errors';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [formMode, setFormMode] = useState('create');

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setLoadError(describeError(err, 'تعذّر تحميل المشاريع.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setFormInitial(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = (project) => {
    setFormInitial(project);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (formMode === 'create') {
      const created = await createProject(payload);
      setProjects((prev) => [...prev, created]);
    } else {
      const updated = await updateProject(formInitial.id, payload);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await deleteProject(confirmTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== confirmTarget.id));
      setConfirmTarget(null);
    } catch (err) {
      setLoadError(describeError(err, 'تعذّر حذف المشروع.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 dark:text-ink-50">مشاريعي</h1>
            <p className="text-ink-500 mt-1 dark:text-ink-400">
              {projects.length === 0
                ? 'كل أفكارك في مكان واحد. ابدأ بإنشاء مشروع.'
                : `لديك ${projects.length} ${projects.length === 1 ? 'مشروع' : 'مشاريع'}.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="btn-ghost"
              title="تحديث"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={16} />
              <span>مشروع جديد</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3
                          dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={openEdit}
                onDelete={(proj) => setConfirmTarget(proj)}
                onOpen={(proj) => navigate(`/projects/${proj.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={formInitial}
        mode={formMode}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onCancel={() => (deleting ? null : setConfirmTarget(null))}
        onConfirm={handleConfirmDelete}
        busy={deleting}
        title="حذف المشروع؟"
        description={
          confirmTarget
            ? `سيتم حذف مشروع "${confirmTarget.name}" وجميع ملاحظاته بشكل دائم. لا يمكن التراجع عن هذه العملية.`
            : ''
        }
        confirmLabel="نعم، احذف"
      />
    </div>
  );
}
