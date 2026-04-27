import Modal from './Modal';

export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = 'هل أنت متأكد؟',
  description,
  confirmLabel = 'حذف',
  cancelLabel = 'إلغاء',
  destructive = true,
  busy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-600 leading-relaxed dark:text-ink-300">{description}</p>}
    </Modal>
  );
}
