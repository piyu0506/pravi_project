export function Badge({ value, kind = 'neutral' }) {
  if (!value) return <span className="muted">—</span>;
  return <span className={`badge badge-${kind} badge-${String(value).toLowerCase()}`}>{value}</span>;
}

export function LifecycleBadge({ status }) {
  return <Badge value={status} kind="lifecycle" />;
}

export function RiskBadge({ level }) {
  return <Badge value={level} kind="risk" />;
}

export function ImpactBadge({ level }) {
  return <Badge value={level} kind="impact" />;
}

export function StatusBadge({ status }) {
  return <Badge value={status} kind="status" />;
}

export function HealthMeter({ score, riskLevel }) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  return (
    <div className="health-meter">
      <div className="health-ring" style={{ '--score': safeScore ?? 0 }}>
        <strong>{safeScore ?? '—'}</strong>
      </div>
      <div>
        <p className="muted">Health score</p>
        <RiskBadge level={riskLevel} />
      </div>
    </div>
  );
}

export function WarrantyNotice({ warrantyEnd }) {
  if (!warrantyEnd) return null;
  const end = new Date(warrantyEnd);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  if (days > 30) return null;
  const expired = days < 0;
  return (
    <div className={`notice ${expired ? 'notice-danger' : 'notice-warn'}`}>
      {expired
        ? `Warranty expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`
        : `Warranty expires in ${days} day${days === 1 ? '' : 's'}.`}
    </div>
  );
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
