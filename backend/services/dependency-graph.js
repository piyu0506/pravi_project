const AssetDependency = require('../models/AssetDependency');

function assetSummary(asset) {
  return {
    _id: asset._id,
    assetId: asset.assetId,
    name: asset.name,
    category: asset.category,
    health: asset.health,
    lifecycle: asset.lifecycle,
  };
}

async function loadDependencyEdges(sourceIds) {
  return AssetDependency.find({ sourceAsset: { $in: sourceIds } })
    .populate({ path: 'targetAsset', select: 'assetId name category health lifecycle' })
    .lean();
}

async function traverseDownstream(rootAsset, { maxDepth = 4, loadEdges = loadDependencyEdges } = {}) {
  const rootId = String(rootAsset._id);
  const visited = new Set([rootId]);
  let frontier = [{ asset: rootAsset, depth: 0, path: [] }];
  const nodes = [];

  for (let depth = 1; depth <= maxDepth && frontier.length; depth += 1) {
    const sourceNodes = new Map(frontier.map((node) => [String(node.asset._id), node]));
    const edges = await loadEdges([...sourceNodes.keys()]);
    const nextFrontier = [];

    for (const edge of edges) {
      const target = edge.targetAsset;
      if (!target) continue;
      const targetId = String(target._id);
      if (visited.has(targetId)) continue;
      const source = sourceNodes.get(String(edge.sourceAsset));
      if (!source) continue;

      visited.add(targetId);
      const pathEntry = {
        sourceAsset: assetSummary(source.asset),
        relationshipType: edge.relationshipType,
        criticality: edge.criticality,
        targetAsset: assetSummary(target),
      };
      const node = { asset: target, depth, path: [...source.path, pathEntry], edge: pathEntry };
      nodes.push(node);
      nextFrontier.push(node);
    }
    frontier = nextFrontier;
  }

  return { nodes, maxDepth: nodes.reduce((depth, node) => Math.max(depth, node.depth), 0) };
}

function retirementImpactLevel(nodes, dependencyDepth) {
  const affectedCount = nodes.length;
  const hasCritical = nodes.some((node) => node.asset.health?.riskLevel === 'CRITICAL');
  const hasHighOrCritical = nodes.some((node) => ['HIGH', 'CRITICAL'].includes(node.asset.health?.riskLevel));
  if (hasCritical || dependencyDepth >= 4 || affectedCount >= 8) return 'CRITICAL';
  if (dependencyDepth >= 3 || affectedCount >= 4 || hasHighOrCritical) return 'HIGH';
  if (dependencyDepth >= 2 || affectedCount >= 2) return 'MEDIUM';
  return 'LOW';
}

function createRetirementImpact(asset, traversal) {
  const { nodes, maxDepth } = traversal;
  const criticalityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const criticalNode = [...nodes].sort((left, right) => {
    const riskDifference = (criticalityRank[right.asset.health?.riskLevel] || 0)
      - (criticalityRank[left.asset.health?.riskLevel] || 0);
    return riskDifference || right.depth - left.depth;
  })[0];

  return {
    asset,
    directDependents: nodes.filter((node) => node.depth === 1).map((node) => ({ ...assetSummary(node.asset), depth: node.depth })),
    indirectDependents: nodes.filter((node) => node.depth > 1).map((node) => ({ ...assetSummary(node.asset), depth: node.depth })),
    allAffectedAssets: nodes.map((node) => ({ ...assetSummary(node.asset), depth: node.depth })),
    totalAffectedCount: nodes.length,
    dependencyDepth: maxDepth,
    impactLevel: retirementImpactLevel(nodes, maxDepth),
    criticalChain: criticalNode?.path || [],
  };
}

module.exports = {
  createRetirementImpact,
  retirementImpactLevel,
  traverseDownstream,
};