import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { Can } from '../components/Can';
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { LifecycleBadge, RiskBadge } from '../components/StatusBadges';
import { CATEGORIES, LIFECYCLE_STATUSES, RISK_LEVELS } from '../constants';

const emptyFilters = {
  search: '',
  category: '',
  lifecycleStatus: '',
  riskLevel: '',
  city: '',
  state: '',
};

export default function Assets() {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  async function load(nextPage = page, nextFilters = applied) {
    setStatus('loading');
    setError('');
    try {
      const response = await api.listAssets({ ...nextFilters, page: nextPage, limit: 20 });
      setRows(response.data || []);
      setPagination(response.pagination || { page: nextPage, totalPages: 1, total: 0 });
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(page, applied); }, [page, applied]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Register</p>
          <h1>Asset inventory</h1>
        </div>
        <Can permission="assetCrud">
          <Link className="btn btn-primary" to="/assets/new">
            <Plus size={16} /> Add asset
          </Link>
        </Can>
      </div>

      <form className="card filter-bar" onSubmit={applyFilters}>
        <input
          placeholder="Search ID, name, type…"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={filters.lifecycleStatus} onChange={(event) => setFilters({ ...filters, lifecycleStatus: event.target.value })}>
          <option value="">All lifecycle</option>
          {LIFECYCLE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={filters.riskLevel} onChange={(event) => setFilters({ ...filters, riskLevel: event.target.value })}>
          <option value="">All risk</option>
          {RISK_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          placeholder="City"
          value={filters.city}
          onChange={(event) => setFilters({ ...filters, city: event.target.value })}
        />
        <input
          placeholder="State"
          value={filters.state}
          onChange={(event) => setFilters({ ...filters, state: event.target.value })}
        />
        <button type="submit" className="btn btn-primary">Filter</button>
      </form>

      {status === 'loading' ? <LoadingState label="Loading assets…" /> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={() => load()} /> : null}
      {status === 'ready' && rows.length === 0 ? (
        <EmptyState title="No assets match these filters" message="Try clearing search or filter values." />
      ) : null}
      {status === 'ready' && rows.length > 0 ? (
        <article className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Lifecycle</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((asset) => (
                  <tr key={asset._id}>
                    <td><Link to={`/assets/${asset._id}`}>{asset.assetId}</Link></td>
                    <td>{asset.name || '—'}</td>
                    <td>{asset.category || '—'}</td>
                    <td>{[asset.location?.city, asset.location?.state].filter(Boolean).join(', ') || '—'}</td>
                    <td><LifecycleBadge status={asset.lifecycle?.status} /></td>
                    <td><RiskBadge level={asset.health?.riskLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>{pagination.total} assets</span>
            <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
            <button type="button" className="btn" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </article>
      ) : null}
    </div>
  );
}
