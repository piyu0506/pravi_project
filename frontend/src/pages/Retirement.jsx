import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Can } from '../components/Can';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { ImpactBadge, StatusBadge, formatDate } from '../components/StatusBadges';
import { useNotify } from '../context/NotificationContext';
import { useRole } from '../context/RoleContext';

export default function Retirement() {
  const { role } = useRole();
  const notify = useNotify();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [decision, setDecision] = useState(null);

  async function load() {
    setStatus('loading');
    setError('');
    try {
      const response = await api.listRetirementRequests();
      setRows(response.data || []);
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(); }, []);

  async function confirmDecision() {
    try {
      await api.decideRetirement(decision.id, {
        decision: decision.type,
        decidedBy: role,
        decisionNotes: decision.notes || `${decision.type} from retirement queue`,
      });
      notify.success(`Request ${decision.type.toLowerCase()}.`);
      setDecision(null);
      await load();
    } catch (decideError) {
      notify.error(decideError.message);
    }
  }

  if (status === 'loading') return <LoadingState label="Loading retirement requests…" />;
  if (status === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Retirement requests</h1>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No retirement requests" message="Analyze impact on an asset, then submit a request." />
      ) : (
        <article className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Impact</th>
                  <th>Reason</th>
                  <th>Requested by</th>
                  <th>Request date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const asset = row.asset || {};
                  return (
                    <tr key={row._id}>
                      <td>
                        {asset._id ? <Link to={`/assets/${asset._id}`}>{asset.assetId || asset.name}</Link> : '—'}
                      </td>
                      <td><ImpactBadge level={row.impactLevel} /></td>
                      <td>{row.reason}</td>
                      <td>{row.requestedBy}</td>
                      <td>{formatDate(row.requestDate)}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>
                        {row.status === 'REQUESTED' ? (
                          <Can permission="retirementDecide">
                            <div className="inline-actions">
                              <button type="button" className="btn btn-primary" onClick={() => setDecision({ id: row._id, type: 'APPROVED' })}>Approve</button>
                              <button type="button" className="btn btn-danger" onClick={() => setDecision({ id: row._id, type: 'REJECTED' })}>Reject</button>
                            </div>
                          </Can>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      )}

      <ConfirmDialog
        open={Boolean(decision)}
        title={decision?.type === 'APPROVED' ? 'Approve retirement?' : 'Reject request?'}
        message={decision?.type === 'APPROVED'
          ? 'Approval will retire the asset through the backend workflow. The UI will not change lifecycle status directly.'
          : 'The request will be rejected. The asset lifecycle will not change.'}
        confirmLabel={decision?.type === 'APPROVED' ? 'Approve' : 'Reject'}
        danger={decision?.type === 'REJECTED'}
        onCancel={() => setDecision(null)}
        onConfirm={confirmDecision}
      />
    </div>
  );
}
