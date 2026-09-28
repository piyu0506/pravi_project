const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const LifecycleEvent = require('../models/LifecycleEvent');

const router = express.Router();
const eventTypes = new Set([
  'PURCHASED', 'RECEIVED', 'DEPLOYED', 'ACTIVATED', 'INSPECTION',
  'MAINTENANCE', 'REPAIRED', 'RETIRED', 'DISPOSED',
]);
const lifecycleStatusByEvent = {
  PURCHASED: 'PURCHASED',
  RECEIVED: 'RECEIVED',
  DEPLOYED: 'DEPLOYED',
  ACTIVATED: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
};

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

router.post('/:id/lifecycle', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return badRequest(res, 'Invalid asset ID');
  }
  if (!isObjectPayload(req.body)) {
    return badRequest(res, 'Request body must be a JSON object');
  }

  const { eventType, date, performedBy, department, description, cost, metadata } = req.body;
  if (typeof eventType !== 'string' || !eventTypes.has(eventType)) {
    return badRequest(res, 'Invalid eventType');
  }
  if ((typeof date !== 'string' && typeof date !== 'number') || String(date).trim() === '') {
    return badRequest(res, 'A valid date is required');
  }
  const eventDate = new Date(date);
  if (Number.isNaN(eventDate.getTime())) {
    return badRequest(res, 'A valid date is required');
  }
  for (const [field, value] of [['performedBy', performedBy], ['department', department], ['description', description]]) {
    if (value !== undefined && typeof value !== 'string') {
      return badRequest(res, `${field} must be a string`);
    }
  }
  if (cost !== undefined && (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0)) {
    return badRequest(res, 'cost must be a non-negative number');
  }
  if (metadata !== undefined && !isObjectPayload(metadata)) {
    return badRequest(res, 'metadata must be an object');
  }

  const session = await mongoose.startSession();
  let createdEvent;
  try {
    await session.withTransaction(async () => {
      const asset = await Asset.findById(req.params.id).session(session);
      if (!asset) {
        const error = new Error('Asset not found');
        error.status = 404;
        throw error;
      }

      [createdEvent] = await LifecycleEvent.create([{
        asset: asset._id,
        eventType,
        date: eventDate,
        performedBy,
        department,
        description,
        cost,
        metadata,
      }], { session });

      const status = lifecycleStatusByEvent[eventType];
      if (status) {
        await Asset.updateOne(
          { _id: asset._id },
          { $set: { 'lifecycle.status': status } },
          { session, runValidators: true },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return res.status(201).json({ success: true, data: createdEvent });
});

router.get('/:id/lifecycle', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return badRequest(res, 'Invalid asset ID');
  }

  const assetExists = await Asset.exists({ _id: req.params.id });
  if (!assetExists) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }

  const events = await LifecycleEvent.find({ asset: req.params.id })
    .sort({ date: 1, createdAt: 1 });
  return res.json({ success: true, data: events });
});

router.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error('Lifecycle API error:', error);
  if (error.status === 404) {
    return res.status(404).json({ success: false, message: error.message });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;