import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fetchAllAssets } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { LifecycleBadge, formatDate } from '../components/StatusBadges';
import { CATEGORIES, LIFECYCLE_STATUSES, OPERATIONAL_STATUSES, RISK_LEVELS } from '../constants';

function countBy(items, getKey, keys) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  items.forEach((item) => {
    const key = getKey(item);
    if (key in counts) counts[key] += 1;
  });
  return counts;
}

function BarList({ data, max }) {
  const ceiling = max || 1;
  return (
    <ul className="bar-list">
      {Object.entries(data).map(([label, value]) => (
        <li key={label}>
          <span>{label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(value / ceiling) * 100}%` }} />
          </div>
          <strong>{value}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [assets, setAssets] = useState([]);
  const [activity, setActivity] = useState([]);

  async function load() {
    setStatus('loading');
    setError('');
    try {
      const { assets: rows } = await fetchAllAssets();
      setAssets(rows);
      const recentAssets = [...rows]
        .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
        .slice(0, 8);
      const histories = await Promise.all(recentAssets.map(async (asset) => {
        try {
          const response = await api.getLifecycle(asset._id);
          return (response.data || []).map((event) => ({ ...event, asset }));
        } catch {
          return [];
        }
      }));
      setActivity(
        histories.flat()
          .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
          .slice(0, 8),
      );
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: assets.length,
    operational: assets.filter((asset) => OPERATIONAL_STATUSES.includes(asset.lifecycle?.status)).length,
    maintenance: assets.filter((asset) => asset.lifecycle?.status === 'MAINTENANCE').length,
    atRisk: assets.filter((asset) => asset.health?.riskLevel === 'HIGH').length,
    critical: assets.filter((asset) => asset.health?.riskLevel === 'CRITICAL').length,
    retired: assets.filter((asset) => asset.lifecycle?.status === 'RETIRED').length,
  }), [assets]);

  const byCategory = useMemo(() => countBy(assets, (asset) => asset.category, CATEGORIES), [assets]);
  const byLifecycle = useMemo(() => countBy(assets, (asset) => asset.lifecycle?.status, LIFECYCLE_STATUSES), [assets]);
  const byRisk = useMemo(() => countBy(assets, (asset) => asset.health?.riskLevel, RISK_LEVELS), [assets]);
  const maxCategory = Math.max(1, ...Object.values(byCategory));

  if (status === 'loading') return <LoadingState label="Loading dashboard…" />;
  if (status === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>National asset dashboard</h1>
        </div>
      </div>

      <section className="stat-grid">
        {[
          ['Total Assets', stats.total],
          ['Operational Assets', stats.operational],
          ['Maintenance Due', stats.maintenance],
          ['At Risk', stats.atRisk],
          ['Critical', stats.critical],
          ['Retired', stats.retired],
        ].map(([label, value]) => (
          <article className="card stat-card" key={label}>
            <p className="muted">{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      {assets.length === 0 ? (
        <EmptyState title="No assets yet" message="Create the first asset to populate the dashboard." />
      ) : (
        <section className="grid-3">
          <article className="card">
            <h2>Assets by category</h2>
            <BarList data={byCategory} max={maxCategory} />
          </article>
          <article className="card">
            <h2>Assets by lifecycle</h2>
            <BarList data={byLifecycle} max={Math.max(1, ...Object.values(byLifecycle))} />
          </article>
          <article className="card">
            <h2>Assets by risk</h2>
            <BarList data={byRisk} max={Math.max(1, ...Object.values(byRisk))} />
          </article>
        </section>
      )}

      <article className="card">
        <h2>Recent lifecycle activity</h2>
        {activity.length === 0 ? (
          <EmptyState title="No recent activity" message="Lifecycle events will appear here as they are recorded." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Event</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((event) => (
                  <tr key={event._id}>
                    <td>{formatDate(event.date)}</td>
                    <td>
                      <Link to={`/assets/${event.asset._id}`}>{event.asset.assetId || event.asset.name}</Link>
                    </td>
                    <td><LifecycleBadge status={event.eventType} /></td>
                    <td>{event.performedBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
