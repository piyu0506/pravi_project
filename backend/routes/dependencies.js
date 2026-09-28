const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const AssetDependency = require('../models/AssetDependency');
const { traverseDownstream } = require('../services/dependency-graph');

const router = express.Router();
const relationshipTypes = ['POWERS', 'USES', 'DEPENDS_ON', 'CONNECTS_TO', 'HOSTS', 'SUPPORTS', 'LOCATED_IN'];
const criticalities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

router.post('/dependencies', async (req, res) => {
  if (!isObjectPayload(req.body)) {
    return res.status(400).json({ success: false, message: 'Request body must be a JSON object' });
  }
  const { sourceAsset, targetAsset, relationshipType, description, criticality = 'MEDIUM' } = req.body;
  if (!isObjectId(sourceAsset) || !isObjectId(targetAsset)) {
    return res.status(400).json({ success: false, message: 'Valid sourceAsset and targetAsset IDs are required' });
  }
  if (sourceAsset === targetAsset) {
    return res.status(400).json({ success: false, message: 'An asset cannot depend on itself' });
  }
  if (!relationshipTypes.includes(relationshipType)) {
    return res.status(400).json({ success: false, message: 'Invalid relationshipType' });
  }
  if (!criticalities.includes(criticality)) {
    return res.status(400).json({ success: false, message: 'Invalid criticality' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ success: false, message: 'description must be a string' });
  }

  const assets = await Asset.find({ _id: { $in: [sourceAsset, targetAsset] } }).select('_id');
  if (assets.length !== 2) {
    return res.status(404).json({ success: false, message: 'Source or target asset not found' });
  }
  const duplicate = await AssetDependency.exists({ sourceAsset, targetAsset });
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'Dependency already exists' });
  }

  const dependency = await AssetDependency.create({ sourceAsset, targetAsset, relationshipType, description, criticality });
  return res.status(201).json({ success: true, data: dependency });
});

router.get('/dependencies', async (req, res) => {
  const dependencies = await AssetDependency.find()
    .populate({ path: 'sourceAsset', select: 'assetId name category health lifecycle' })
    .populate({ path: 'targetAsset', select: 'assetId name category health lifecycle' })
    .sort({ createdAt: 1 });
  return res.json({ success: true, data: dependencies });
});

router.delete('/dependencies/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid dependency ID' });
  }
  const dependency = await AssetDependency.findByIdAndDelete(req.params.id);
  if (!dependency) {
    return res.status(404).json({ success: false, message: 'Dependency not found' });
  }
  return res.json({ success: true, data: dependency });
});

router.get('/assets/:id/dependencies', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid asset ID' });
  }
  const asset = await Asset.findById(req.params.id).lean();
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }
  const traversal = await traverseDownstream(asset, { maxDepth: 4 });
  return res.json({
    success: true,
    data: {
      asset,
      dependents: traversal.nodes.map((node) => ({ ...node.asset, depth: node.depth })),
      edges: traversal.nodes.map((node) => node.edge),
      dependencyDepth: traversal.maxDepth,
    },
  });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Dependency already exists' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Dependencies API error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;