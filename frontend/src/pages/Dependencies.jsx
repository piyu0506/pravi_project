import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { fetchAllAssets, api } from '../api/client';
import { Can } from '../components/Can';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../components/Feedback';
import { RiskBadge } from '../components/StatusBadges';
import { useNotify } from '../context/NotificationContext';
import { CRITICALITIES, RELATIONSHIP_TYPES } from '../constants';

function assetIdOf(value) {
  if (!value) return '';
  return String(value._id || value);
}

function wouldCreateCycle(edges, source, target) {
  if (source === target) return true;
  const adjacency = {};
  edges.forEach((edge) => {
    const from = assetIdOf(edge.sourceAsset);
    const to = assetIdOf(edge.targetAsset);
    if (!from || !to || from === to) return;
    (adjacency[from] ||= []).push(to);
  });
  const seen = new Set();
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    if (current === source) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    (adjacency[current] || []).forEach((next) => stack.push(next));
  }
  return false;
}

function GraphNode({ data }) {
  return (
    <div className={`graph-node risk-${(data.riskLevel || 'NONE').toLowerCase()}`}>
      <Handle type="target" position={Position.Left} />
      <strong>{data.assetId}</strong>
      <span>{data.name}</span>
      <RiskBadge level={data.riskLevel} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { asset: GraphNode };

function DependencyCanvas() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [edgesRaw, setEdgesRaw] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    sourceAsset: '',
    targetAsset: '',
    relationshipType: 'SUPPORTS',
    criticality: 'MEDIUM',
    description: '',
  });
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setStatus('loading');
    setError('');
    try {
      const [depRes, assetRes] = await Promise.all([
        api.listDependencies(),
        fetchAllAssets(),
      ]);
      setEdgesRaw(depRes.data || []);
      setAssets(assetRes.assets);
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => { load(); }, []);

  const { nodes, edges } = useMemo(() => {
    const unique = new Map();
    const safeEdges = [];
    const seenEdge = new Set();
    const adjacency = {};

    (edgesRaw || []).forEach((edge) => {
      const source = edge.sourceAsset;
      const target = edge.targetAsset;
      if (!source?._id || !target?._id) return;
      const sourceId = String(source._id);
      const targetId = String(target._id);
      if (sourceId === targetId) return;
      const key = `${sourceId}->${targetId}`;
      if (seenEdge.has(key)) return;
      const createsCycle = (() => {
        const seen = new Set();
        const stack = [targetId];
        const nextAdj = { ...adjacency, [sourceId]: [...(adjacency[sourceId] || []), targetId] };
        while (stack.length) {
          const current = stack.pop();
          if (current === sourceId) return true;
          if (seen.has(current)) continue;
          seen.add(current);
          (nextAdj[current] || []).forEach((item) => stack.push(item));
        }
        return false;
      })();
      if (createsCycle) return;
      seenEdge.add(key);
      (adjacency[sourceId] ||= []).push(targetId);
      unique.set(sourceId, source);
      unique.set(targetId, target);
      safeEdges.push(edge);
    });

    const levels = {};
    unique.forEach((_, id) => { levels[id] = 0; });
    const incoming = {};
    safeEdges.forEach((edge) => {
      const targetId = String(edge.targetAsset._id);
      incoming[targetId] = (incoming[targetId] || 0) + 1;
    });
    const queue = [...unique.keys()].filter((id) => !incoming[id]);
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      (adjacency[current] || []).forEach((next) => {
        levels[next] = Math.max(levels[next] || 0, (levels[current] || 0) + 1);
        queue.push(next);
      });
    }

    const buckets = {};
    [...unique.values()].forEach((asset) => {
      const level = levels[String(asset._id)] || 0;
      (buckets[level] ||= []).push(asset);
    });

    const flowNodes = Object.entries(buckets).flatMap(([level, group]) => group.map((asset, index) => ({
      id: String(asset._id),
      type: 'asset',
      position: { x: Number(level) * 260 + 40, y: index * 130 + 40 },
      data: {
        assetId: asset.assetId,
        name: asset.name,
        riskLevel: asset.health?.riskLevel,
      },
    })));

    const flowEdges = safeEdges.map((edge) => ({
      id: edge._id,
      source: String(edge.sourceAsset._id),
      target: String(edge.targetAsset._id),
      label: `${edge.relationshipType} · ${edge.criticality}`,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: edge,
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [edgesRaw]);

  const onNodeClick = useCallback((_, node) => {
    navigate(`/assets/${node.id}`);
  }, [navigate]);

  async function addDependency(event) {
    event.preventDefault();
    if (wouldCreateCycle(edgesRaw, form.sourceAsset, form.targetAsset)) {
      notify.error('That dependency would create a cycle or self-link.');
      return;
    }
    try {
      await api.createDependency({
        sourceAsset: form.sourceAsset,
        targetAsset: form.targetAsset,
        relationshipType: form.relationshipType,
        criticality: form.criticality,
        description: form.description || undefined,
      });
      notify.success('Dependency added.');
      await load();
    } catch (createError) {
      notify.error(createError.message);
    }
  }

  async function removeDependency() {
    try {
      await api.deleteDependency(pendingDelete);
      notify.success('Dependency removed.');
      setPendingDelete(null);
      await load();
    } catch (deleteError) {
      notify.error(deleteError.message);
    }
  }

  if (status === 'loading') return <LoadingState label="Loading dependency graph…" />;
  if (status === 'error') return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Relationships</p>
          <h1>Dependency graph</h1>
          <p className="muted">Arrows go from source to dependent target. Cycles are omitted in the view and blocked on create.</p>
        </div>
      </div>

      <Can permission="dependencies">
        <form className="card form-grid" onSubmit={addDependency}>
          <label>Source
            <select required value={form.sourceAsset} onChange={(event) => setForm({ ...form, sourceAsset: event.target.value })}>
              <option value="">Select source</option>
              {assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.assetId} — {asset.name}</option>)}
            </select>
          </label>
          <label>Target (depends on source)
            <select required value={form.targetAsset} onChange={(event) => setForm({ ...form, targetAsset: event.target.value })}>
              <option value="">Select target</option>
              {assets.map((asset) => <option key={asset._id} value={asset._id}>{asset.assetId} — {asset.name}</option>)}
            </select>
          </label>
          <label>Relationship
            <select value={form.relationshipType} onChange={(event) => setForm({ ...form, relationshipType: event.target.value })}>
              {RELATIONSHIP_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Criticality
            <select value={form.criticality} onChange={(event) => setForm({ ...form, criticality: event.target.value })}>
              {CRITICALITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="wide">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <button type="submit" className="btn btn-primary">Add dependency</button>
        </form>
      </Can>

      <article className="card graph-card">
        {nodes.length === 0 ? (
          <EmptyState title="No dependency data" message="Add a source → target relationship to populate the graph." />
        ) : (
          <div className="graph-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              minZoom={0.3}
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        )}
      </article>

      <article className="card">
        <h2>Edges</h2>
        {edgesRaw.length === 0 ? <EmptyState title="No edges" /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Source</th><th>Relationship</th><th>Target</th><th>Criticality</th><th /></tr>
              </thead>
              <tbody>
                {edgesRaw.map((edge) => (
                  <tr key={edge._id}>
                    <td>{edge.sourceAsset?.assetId}</td>
                    <td>{edge.relationshipType}</td>
                    <td>{edge.targetAsset?.assetId}</td>
                    <td><RiskBadge level={edge.criticality} /></td>
                    <td>
                      <Can permission="dependencies">
                        <button type="button" className="btn btn-danger" onClick={() => setPendingDelete(edge._id)}>Delete</button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete dependency?"
        message="This removes the relationship. Assets themselves are not changed."
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={removeDependency}
      />
    </div>
  );
}

export default function Dependencies() {
  return (
    <ReactFlowProvider>
      <DependencyCanvas />
    </ReactFlowProvider>
  );
}
