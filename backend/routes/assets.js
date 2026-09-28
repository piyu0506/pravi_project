const express = require('express');
const Asset = require('../models/Asset');

const router = express.Router();
const categories = ['IT', 'POWER', 'TELECOM', 'FACILITY', 'TRANSPORT'];
const lifecycleStatuses = ['PURCHASED', 'RECEIVED', 'DEPLOYED', 'ACTIVE', 'MAINTENANCE', 'RETIRED', 'DISPOSED'];
const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const writableFields = new Set([
  'assetId', 'name', 'category', 'type', 'description', 'owner', 'location',
  'procurement', 'lifecycle', 'health', 'specifications',
]);

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

router.post('/', async (req, res) => {
  if (!isObjectPayload(req.body)) {
    return badRequest(res, 'Request body must be a JSON object');
  }

  const asset = await Asset.create(req.body);
  return res.status(201).json({ success: true, data: asset });
});

router.get('/', async (req, res) => {
  const { category, lifecycleStatus, riskLevel, city, state, search } = req.query;
  if (category !== undefined && (typeof category !== 'string' || !categories.includes(category))) {
    return badRequest(res, 'Invalid category filter');
  }
  if (lifecycleStatus !== undefined && (typeof lifecycleStatus !== 'string' || !lifecycleStatuses.includes(lifecycleStatus))) {
    return badRequest(res, 'Invalid lifecycleStatus filter');
  }
  if (riskLevel !== undefined && (typeof riskLevel !== 'string' || !riskLevels.includes(riskLevel))) {
    return badRequest(res, 'Invalid riskLevel filter');
  }
  for (const [name, value] of [['city', city], ['state', state], ['search', search]]) {
    if (value !== undefined && typeof value !== 'string') {
      return badRequest(res, `${name} must be a string`);
    }
  }

  const pageValue = req.query.page ?? '1';
  const limitValue = req.query.limit ?? '20';
  if (!/^\d+$/.test(pageValue) || !/^\d+$/.test(limitValue)) {
    return badRequest(res, 'page and limit must be positive integers');
  }
  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return badRequest(res, 'page must be positive and limit must be between 1 and 100');
  }

  const filter = {};
  if (category) filter.category = category;
  if (lifecycleStatus) filter['lifecycle.status'] = lifecycleStatus;
  if (riskLevel) filter['health.riskLevel'] = riskLevel;
  if (city) filter['location.city'] = new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
  if (state) filter['location.state'] = new RegExp(`^${escapeRegex(state.trim())}$`, 'i');
  if (search?.trim()) {
    const expression = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = ['assetId', 'name', 'type', 'description'].map((field) => ({ [field]: expression }));
  }

  const [assets, total] = await Promise.all([
    Asset.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Asset.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: assets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return badRequest(res, 'Invalid asset ID');
  }

  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }
  return res.json({ success: true, data: asset });
});

router.put('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return badRequest(res, 'Invalid asset ID');
  }
  if (!isObjectPayload(req.body)) {
    return badRequest(res, 'Request body must be a JSON object');
  }

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([field]) => writableFields.has(field)),
  );
  if (Object.keys(updates).length === 0) {
    return badRequest(res, 'Request body contains no updatable asset fields');
  }

  const asset = await Asset.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }
  return res.json({ success: true, data: asset });
});

router.delete('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return badRequest(res, 'Invalid asset ID');
  }

  const asset = await Asset.findByIdAndDelete(req.params.id);
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }
  return res.json({ success: true, message: 'Asset deleted', data: asset });
});

router.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Asset ID already exists' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Asset API error:', error.message);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;