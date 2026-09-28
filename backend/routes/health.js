const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const LifecycleEvent = require('../models/LifecycleEvent');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Inspection = require('../models/Inspection');
const { calculateHealth } = require('../services/health-scoring');

const router = express.Router();

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

router.get('/:id/health', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid asset ID' });
  }
  const asset = await Asset.findById(req.params.id).lean();
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const [maintenanceRecords, inspections, lifecycleEvents] = await Promise.all([
    MaintenanceRecord.find({ asset: asset._id }).lean(),
    Inspection.find({ asset: asset._id }).lean(),
    LifecycleEvent.find({ asset: asset._id, eventType: { $in: ['REPAIRED', 'MAINTENANCE'] } }).lean(),
  ]);
  const result = calculateHealth({ asset, maintenanceRecords, inspections, lifecycleEvents });
  await Asset.updateOne(
    { _id: asset._id },
    { $set: { 'health.score': result.score, 'health.riskLevel': result.riskLevel } },
    { runValidators: true },
  );

  return res.json({ success: true, assetId: asset.assetId, ...result });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Health API error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;