import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Can } from '../components/Can';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import {
  HealthMeter,
  ImpactBadge,
  LifecycleBadge,
  RiskBadge,
  StatusBadge,
  WarrantyNotice,
  formatDate,
} from '../components/StatusBadges';
import { useNotify } from '../context/NotificationContext';
import { useRole } from '../context/RoleContext';
import {
  CONDITIONS,
  LIFECYCLE_EVENTS,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  SAFETY_STATUSES,
  SECURITY_STATUSES,
} from '../constants';
import { AssetFields, assetToForm, buildPayload } from './AssetNew';

function Field({ label, value }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );
}

function numberOrUndefined(value) {
  if (value === '' || value === undefined || value === null) return undefined;
  return Number(value);
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { role, can } = useRole();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [asset, setAsset] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [lifecycle, setLifecycle] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [dependencies, setDependencies] = useState(null);
  const [healthDetail, setHealthDetail] = useState(null);
  const [impact, setImpact] = useState(null);
  const [requests, setRequests] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState('');
  const [lifecycleForm, setLifecycleForm] = useState({
    eventType: 'INSPECTION',
    date: '',
    performedBy: '',
    department: '',
    description: '',
    cost: '',
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: 'Preventive',
    date: '',
    issue: '',
    description: '',
    performedBy: '',
    cost: '',
    downtimeHours: '',
    nextMaintenanceDate: '',
    status: 'SCHEDULED',
  });
  const [inspectionForm, setInspectionForm] = useState({
    inspectionDate: '',
    inspector: '',
    condition: 'GOOD',
    issuesFound: '',
    safetyStatus: 'SAFE',
    securityStatus: 'SECURE',
    utilization: '',
    notes: '',
  });

  async function load() {
    setStatus('loading');
    setError('');
    try {
      const [assetRes, lifeRes, maintRes, inspRes, depRes, reqRes] = await Promise.all([
        api.getAsset(id),
        api.getLifecycle(id),
        api.getMaintenance(id),
        api.getInspections(id),
        api.getAssetDependencies(id).catch(() => ({ data: null })),
        can('viewRetirement') ? api.listRetirementRequests() : Promise.resolve({ data: [] }),
      ]);
      const nextAsset = assetRes.data;
      setAsset(nextAsset);
      setForm(assetToForm(nextAsset));
      setLifecycle(lifeRes.data || []);
      setMaintenance(maintRes.data || []);
      setInspections(inspRes.data || []);
      setDependencies(depRes.data);
      setRequests((reqRes.data || []).filter((item) => {
        const assetId = item.asset?._id || item.asset;
        return String(assetId) === String(nextAsset._id);
      }));
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(); }, [id, role]);

  async function refreshHealth() {
    try {
      const result = await api.getHealth(id);
      setHealthDetail(result);
      notify.success('Health score refreshed.');
      const assetRes = await api.getAsset(id);
      setAsset(assetRes.data);
    } catch (refreshError) {
      notify.error(refreshError.message);
    }
  }

  async function saveAsset(event) {
    event.preventDefault();
    try {
      const response = await api.updateAsset(id, buildPayload(form));
      setAsset(response.data);
      setEditing(false);
      notify.success('Asset updated.');
    } catch (saveError) {
      notify.error(saveError.message);
    }
  }

  async function removeAsset() {
    try {
      await api.deleteAsset(id);
      notify.success('Asset deleted.');
      navigate('/assets');
    } catch (deleteError) {
      notify.error(deleteError.message);
    }
  }

  async function submitLifecycle(event) {
    event.preventDefault();
    try {
      await api.addLifecycle(id, {
        eventType: lifecycleForm.eventType,
        date: lifecycleForm.date,
        performedBy: lifecycleForm.performedBy || undefined,
        department: lifecycleForm.department || undefined,
        description: lifecycleForm.description || undefined,
        cost: numberOrUndefined(lifecycleForm.cost),
      });
      notify.success('Lifecycle event recorded.');
      await load();
    } catch (submitError) {
      notify.error(submitError.message);
    }
  }

  async function submitMaintenance(event) {
    event.preventDefault();
    try {
      await api.addMaintenance(id, {
        maintenanceType: maintenanceForm.maintenanceType,
        date: maintenanceForm.date,
        issue: maintenanceForm.issue || undefined,
        description: maintenanceForm.description || undefined,
        performedBy: maintenanceForm.performedBy || undefined,
        cost: numberOrUndefined(maintenanceForm.cost),
        downtimeHours: numberOrUndefined(maintenanceForm.downtimeHours),
        nextMaintenanceDate: maintenanceForm.nextMaintenanceDate || undefined,
        status: maintenanceForm.status,
      });
      notify.success('Maintenance record added.');
      await load();
      if (can('viewHealth')) await refreshHealth();
    } catch (submitError) {
      notify.error(submitError.message);
    }
  }

  async function submitInspection(event) {
    event.preventDefault();
    try {
      await api.addInspection(id, {
        inspectionDate: inspectionForm.inspectionDate,
        inspector: inspectionForm.inspector || undefined,
        condition: inspectionForm.condition,
        issuesFound: inspectionForm.issuesFound || undefined,
        safetyStatus: inspectionForm.safetyStatus,
        securityStatus: inspectionForm.securityStatus,
        utilization: numberOrUndefined(inspectionForm.utilization),
        notes: inspectionForm.notes || undefined,
      });
      notify.success('Inspection recorded.');
      await load();
      if (can('viewHealth')) await refreshHealth();
    } catch (submitError) {
      notify.error(submitError.message);
    }
  }

  async function analyzeImpact() {
    try {
      const result = await api.getRetirementImpact(id);
      setImpact(result.data);
      notify.success('Retirement impact analyzed. Asset was not retired.');
    } catch (analyzeError) {
      notify.error(analyzeError.message);
    }
  }

  async function requestRetirement(event) {
    event.preventDefault();
    try {
      await api.createRetirementRequest({
        asset: id,
        requestedBy: role,
        reason,
      });
      notify.success('Retirement request submitted.');
      setReason('');
      await load();
    } catch (requestError) {
      notify.error(requestError.message);
    }
  }

  async function decide(requestId, decision) {
    try {
      await api.decideRetirement(requestId, {
        decision,
        decidedBy: role,
        decisionNotes: `${decision} in demo mode`,
      });
      notify.success(`Request ${decision.toLowerCase()}.`);
      setImpact(null);
      await load();
    } catch (decideError) {
      notify.error(decideError.message);
    }
  }

  if (status === 'loading') return <LoadingState label="Loading asset…" />;
  if (status === 'error') return <ErrorState message={error} onRetry={load} />;
  if (!asset) return <EmptyState title="Asset not found" />;

  const terminal = ['RETIRED', 'DISPOSED'].includes(asset.lifecycle?.status);
  const pending = requests.find((item) => item.status === 'REQUESTED');
  const specs = asset.specifications && typeof asset.specifications === 'object'
    ? Object.entries(asset.specifications)
    : [];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Asset detail</p>
          <h1>{asset.name || asset.assetId}</h1>
          <p className="muted">{asset.assetId} · {asset.category || 'Uncategorized'}</p>
        </div>
        <div className="header-actions">
          <Link className="btn" to="/assets">Inventory</Link>
          <Can permission="assetCrud">
            <button type="button" className="btn" onClick={() => setEditing((value) => !value)}>
              {editing ? 'Cancel edit' : 'Edit'}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          </Can>
        </div>
      </div>

      <WarrantyNotice warrantyEnd={asset.procurement?.warrantyEnd} />

      {editing ? (
        <form className="card stack" onSubmit={saveAsset}>
          <AssetFields form={form} setForm={setForm} />
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      ) : (
        <section className="grid-2">
          <article className="card">
            <h2>Basic information</h2>
            <Field label="Asset ID" value={asset.assetId} />
            <Field label="Name" value={asset.name} />
            <Field label="Category" value={asset.category} />
            <Field label="Type" value={asset.type} />
            <Field label="Description" value={asset.description} />
          </article>
          <article className="card">
            <h2>Owner</h2>
            <Field label="Department" value={asset.owner?.department} />
            <Field label="Organization" value={asset.owner?.organization} />
          </article>
          <article className="card">
            <h2>Location</h2>
            <Field label="City" value={asset.location?.city} />
            <Field label="State" value={asset.location?.state} />
            <Field label="Latitude" value={asset.location?.latitude} />
            <Field label="Longitude" value={asset.location?.longitude} />
          </article>
          <article className="card">
            <h2>Procurement</h2>
            <Field label="Purchase date" value={formatDate(asset.procurement?.purchaseDate)} />
            <Field label="Purchase cost" value={asset.procurement?.purchaseCost} />
            <Field label="Vendor" value={asset.procurement?.vendor} />
          </article>
          <article className="card">
            <h2>Warranty</h2>
            <Field label="Warranty end" value={formatDate(asset.procurement?.warrantyEnd)} />
          </article>
          <article className="card">
            <h2>Lifecycle</h2>
            <Field label="Status" value={<LifecycleBadge status={asset.lifecycle?.status} />} />
            <Field label="Installation" value={formatDate(asset.lifecycle?.installationDate)} />
            <Field label="Expected life" value={asset.lifecycle?.expectedLifeYears} />
          </article>
        </section>
      )}

      <section className="grid-2">
        <article className="card">
          <div className="card-head">
            <h2>Health</h2>
            <Can permission="viewHealth">
              <button type="button" className="btn" onClick={refreshHealth}>Recalculate</button>
            </Can>
          </div>
          <HealthMeter score={healthDetail?.score ?? asset.health?.score} riskLevel={healthDetail?.riskLevel ?? asset.health?.riskLevel} />
          {healthDetail?.factors ? (
            <ul className="factor-list">
              {healthDetail.factors.map((factor) => (
                <li key={factor.factor}>
                  <span>{factor.factor}</span>
                  <strong>{factor.factorScore}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Stored score is shown. Recalculate to view factor breakdown.</p>
          )}
        </article>
        <article className="card">
          <h2>Specifications</h2>
          {specs.length === 0 ? (
            <EmptyState title="No specifications" />
          ) : (
            specs.map(([key, value]) => (
              <Field key={key} label={key} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
            ))
          )}
        </article>
      </section>

      <article className="card">
        <h2>Lifecycle timeline</h2>
        {lifecycle.length === 0 ? <EmptyState title="No lifecycle events" /> : (
          <ol className="timeline">
            {lifecycle.map((event) => (
              <li key={event._id}>
                <LifecycleBadge status={event.eventType} />
                <div>
                  <strong>{formatDate(event.date)}</strong>
                  <p>{event.description || 'No description'}</p>
                  <p className="muted">{event.performedBy || '—'} · {event.department || '—'}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <Can permission="lifecycle">
          <form className="subform" onSubmit={submitLifecycle}>
            <h3>Record lifecycle event</h3>
            <div className="form-grid">
              <label>Event type
                <select value={lifecycleForm.eventType} onChange={(event) => setLifecycleForm({ ...lifecycleForm, eventType: event.target.value })}>
                  {LIFECYCLE_EVENTS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Date<input required type="datetime-local" value={lifecycleForm.date} onChange={(event) => setLifecycleForm({ ...lifecycleForm, date: event.target.value })} /></label>
              <label>Performed by<input value={lifecycleForm.performedBy} onChange={(event) => setLifecycleForm({ ...lifecycleForm, performedBy: event.target.value })} /></label>
              <label>Department<input value={lifecycleForm.department} onChange={(event) => setLifecycleForm({ ...lifecycleForm, department: event.target.value })} /></label>
              <label className="wide">Description<textarea value={lifecycleForm.description} onChange={(event) => setLifecycleForm({ ...lifecycleForm, description: event.target.value })} /></label>
              <label>Cost<input type="number" min="0" value={lifecycleForm.cost} onChange={(event) => setLifecycleForm({ ...lifecycleForm, cost: event.target.value })} /></label>
            </div>
            <button type="submit" className="btn btn-primary">Add event</button>
          </form>
        </Can>
      </article>

      <article className="card">
        <h2>Maintenance history</h2>
        {maintenance.length === 0 ? <EmptyState title="No maintenance records" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Issue</th><th>Status</th><th>Cost</th></tr>
              </thead>
              <tbody>
                {maintenance.map((record) => (
                  <tr key={record._id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.maintenanceType || '—'}</td>
                    <td>{record.issue || record.description || '—'}</td>
                    <td><StatusBadge status={record.status} /></td>
                    <td>{record.cost ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Can permission="maintenance">
          <form className="subform" onSubmit={submitMaintenance}>
            <h3>Add maintenance</h3>
            <div className="form-grid">
              <label>Type
                <select value={maintenanceForm.maintenanceType} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: event.target.value })}>
                  {MAINTENANCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Date<input required type="date" value={maintenanceForm.date} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, date: event.target.value })} /></label>
              <label>Issue<input value={maintenanceForm.issue} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, issue: event.target.value })} /></label>
              <label>Performed by<input value={maintenanceForm.performedBy} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, performedBy: event.target.value })} /></label>
              <label className="wide">Description<textarea value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} /></label>
              <label>Cost<input type="number" min="0" value={maintenanceForm.cost} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })} /></label>
              <label>Downtime hours<input type="number" min="0" value={maintenanceForm.downtimeHours} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, downtimeHours: event.target.value })} /></label>
              <label>Next maintenance<input type="date" value={maintenanceForm.nextMaintenanceDate} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, nextMaintenanceDate: event.target.value })} /></label>
              <label>Status
                <select value={maintenanceForm.status} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, status: event.target.value })}>
                  {MAINTENANCE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className="btn btn-primary">Add maintenance</button>
          </form>
        </Can>
      </article>

      <article className="card">
        <h2>Inspection history</h2>
        {inspections.length === 0 ? <EmptyState title="No inspections" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Inspector</th><th>Condition</th><th>Safety</th><th>Security</th><th>Utilization</th></tr>
              </thead>
              <tbody>
                {inspections.map((record) => (
                  <tr key={record._id}>
                    <td>{formatDate(record.inspectionDate)}</td>
                    <td>{record.inspector || '—'}</td>
                    <td><RiskBadge level={record.condition} /></td>
                    <td>{record.safetyStatus || '—'}</td>
                    <td>{record.securityStatus || '—'}</td>
                    <td>{record.utilization ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Can permission="inspections">
          <form className="subform" onSubmit={submitInspection}>
            <h3>Add inspection</h3>
            <div className="form-grid">
              <label>Inspection date<input required type="date" value={inspectionForm.inspectionDate} onChange={(event) => setInspectionForm({ ...inspectionForm, inspectionDate: event.target.value })} /></label>
              <label>Inspector<input value={inspectionForm.inspector} onChange={(event) => setInspectionForm({ ...inspectionForm, inspector: event.target.value })} /></label>
              <label>Condition
                <select value={inspectionForm.condition} onChange={(event) => setInspectionForm({ ...inspectionForm, condition: event.target.value })}>
                  {CONDITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Utilization %<input type="number" min="0" max="100" value={inspectionForm.utilization} onChange={(event) => setInspectionForm({ ...inspectionForm, utilization: event.target.value })} /></label>
              <label className="wide">Issues found<textarea value={inspectionForm.issuesFound} onChange={(event) => setInspectionForm({ ...inspectionForm, issuesFound: event.target.value })} /></label>
              <label>Safety
                <select value={inspectionForm.safetyStatus} onChange={(event) => setInspectionForm({ ...inspectionForm, safetyStatus: event.target.value })}>
                  {SAFETY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Security
                <select value={inspectionForm.securityStatus} onChange={(event) => setInspectionForm({ ...inspectionForm, securityStatus: event.target.value })}>
                  {SECURITY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="wide">Notes<textarea value={inspectionForm.notes} onChange={(event) => setInspectionForm({ ...inspectionForm, notes: event.target.value })} /></label>
            </div>
            <button type="submit" className="btn btn-primary">Add inspection</button>
          </form>
        </Can>
      </article>

      <article className="card">
        <div className="card-head">
          <h2>Dependencies</h2>
          <Link className="btn" to="/dependencies">Open graph</Link>
        </div>
        {!dependencies?.dependents?.length ? (
          <EmptyState title="No downstream dependents" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Asset</th><th>Depth</th><th>Risk</th><th>Lifecycle</th></tr>
              </thead>
              <tbody>
                {dependencies.dependents.map((item) => (
                  <tr key={item._id}>
                    <td><Link to={`/assets/${item._id}`}>{item.assetId || item.name}</Link></td>
                    <td>{item.depth}</td>
                    <td><RiskBadge level={item.health?.riskLevel} /></td>
                    <td><LifecycleBadge status={item.lifecycle?.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {!terminal ? (
        <article className="card impact-card">
          <div className="card-head">
            <h2>Retirement impact</h2>
            <Can permission="retirementImpact">
              <button type="button" className="btn btn-primary" onClick={analyzeImpact}>Analyze Retirement Impact</button>
            </Can>
          </div>
          {impact ? (
            <div className="stack">
              <div className="notice notice-warn">Analysis only — asset has NOT been retired.</div>
              <div className="stat-grid compact">
                <div><p className="muted">Impact</p><ImpactBadge level={impact.impactLevel} /></div>
                <div><p className="muted">Affected</p><strong>{impact.allAffectedAssets?.length || 0}</strong></div>
                <div><p className="muted">Depth</p><strong>{impact.dependencyDepth || 0}</strong></div>
                <div><p className="muted">Direct</p><strong>{impact.directDependents?.length || 0}</strong></div>
              </div>
              <h3>Direct dependents</h3>
              <DependentList items={impact.directDependents} />
              <h3>Indirect dependents</h3>
              <DependentList items={impact.indirectDependents} />
              <h3>Critical chain</h3>
              {impact.criticalChain?.length ? (
                <ol className="chain">
                  {impact.criticalChain.map((link, index) => (
                    <li key={index}>
                      {link.sourceAsset?.assetId} → {link.relationshipType} → {link.targetAsset?.assetId}
                      <RiskBadge level={link.targetAsset?.health?.riskLevel} />
                    </li>
                  ))}
                </ol>
              ) : <p className="muted">No critical chain.</p>}
              <Can permission="retirementRequest">
                <form className="subform" onSubmit={requestRetirement}>
                  <h3>Request Retirement</h3>
                  <label>Reason<textarea required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
                  <p className="muted">Requested by: {role}</p>
                  <button type="submit" className="btn btn-danger">Submit retirement request</button>
                </form>
              </Can>
            </div>
          ) : (
            <p className="muted">Run analysis to see downstream impact before any retirement request.</p>
          )}
          {pending ? (
            <div className="notice">
              Active request: {pending.impactLevel} · {pending.reason}
              <Can permission="retirementDecide">
                <div className="modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => decide(pending._id, 'APPROVED')}>Approve</button>
                  <button type="button" className="btn btn-danger" onClick={() => decide(pending._id, 'REJECTED')}>Reject</button>
                </div>
              </Can>
            </div>
          ) : null}
        </article>
      ) : (
        <article className="card">
          <h2>Retirement</h2>
          <p>This asset is already {asset.lifecycle.status}.</p>
        </article>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete asset?"
        message="This removes the asset record. This action cannot be undone from the UI."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeAsset}
      />
    </div>
  );
}

function DependentList({ items = [] }) {
  if (!items.length) return <p className="muted">None</p>;
  return (
    <ul className="chip-list">
      {items.map((item) => (
        <li key={item._id}>
          <Link to={`/assets/${item._id}`}>{item.assetId || item.name}</Link>
          <RiskBadge level={item.health?.riskLevel} />
        </li>
      ))}
    </ul>
  );
}
