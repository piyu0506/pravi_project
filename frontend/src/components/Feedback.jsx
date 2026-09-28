import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-box" role="status">
      <LoaderCircle className="spin" size={22} />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title = 'Nothing to show', message }) {
  return (
    <div className="state-box">
      <Inbox size={22} />
      <p className="state-title">{title}</p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

export function ErrorState({ message = 'Unable to load data.', onRetry }) {
  return (
    <div className="state-box state-error">
      <AlertTriangle size={22} />
      <p className="state-title">Request failed</p>
      <p className="muted">{message}</p>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>Retry</button>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
