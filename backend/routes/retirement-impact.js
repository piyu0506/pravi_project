const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const { createRetirementImpact, traverseDownstream } = require('../services/dependency-graph');

const router = express.Router();

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

async function analyzeRetirementImpact(asset) {
  const traversal = await traverseDownstream(asset, { maxDepth: 4 });
  return createRetirementImpact(asset, traversal);
}

router.get('/:id/retirement-impact', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid asset ID' });
  }

  const asset = await Asset.findById(req.params.id).lean();
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const impact = await analyzeRetirementImpact(asset);
  return res.json({
    success: true,
    data: {
      asset: impact.asset,
      directDependents: impact.directDependents,
      indirectDependents: impact.indirectDependents,
      allAffectedAssets: impact.allAffectedAssets,
      dependencyDepth: impact.dependencyDepth,
      impactLevel: impact.impactLevel,
      criticalChain: impact.criticalChain,
    },
  });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Retirement impact API error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;
module.exports.analyzeRetirementImpact = analyzeRetirementImpact;
