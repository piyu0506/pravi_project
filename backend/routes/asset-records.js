const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Inspection = require('../models/Inspection');

const router = express.Router();

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseDate(value, field, required) {
  if (value === undefined && !required) return { value: undefined };
  if (value === null && !required) return { value: null };
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    return { error: `${field} must be a valid date` };
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { error: `${field} must be a valid date` }
    : { value: date };
}

function normalizeRecord(body, config) {
  if (!isObjectPayload(body)) return { error: 'Request body must be a JSON object' };

  const record = {};
  const eventDate = parseDate(body[config.dateField], config.dateField, true);
  if (eventDate.error) return eventDate;
  record[config.dateField] = eventDate.value;

  for (const field of config.optionalDateFields || []) {
    if (body[field] === undefined) continue;
    const date = parseDate(body[field], field, false);
    if (date.error) return date;
    record[field] = date.value;
  }

  for (const [field, values] of Object.entries(config.enumFields || {})) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || !values.includes(body[field])) {
      return { error: `Invalid ${field}` };
    }
    record[field] = body[field];
  }

  for (const field of config.stringFields || []) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string') return { error: `${field} must be a string` };
    record[field] = body[field];
  }

  for (const [field, bounds] of Object.entries(config.numberFields || {})) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (typeof value !== 'number' || !Number.isFinite(value)
      || (bounds.min !== undefined && value < bounds.min)
      || (bounds.max !== undefined && value > bounds.max)) {
      return { error: `${field} is outside its valid range` };
    }
    record[field] = value;
  }

  return { record };
}

function registerRecordRoutes(path, config) {
  router.post(`/:id/${path}`, async (req, res) => {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }

    const parsed = normalizeRecord(req.body, config);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const asset = await Asset.findById(req.params.id).select('_id');
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const record = await config.model.create({ ...parsed.record, asset: asset._id });
    return res.status(201).json({ success: true, data: record });
  });

  router.get(`/:id/${path}`, async (req, res) => {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }

    const assetExists = await Asset.exists({ _id: req.params.id });
    if (!assetExists) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const records = await config.model.find({ asset: req.params.id })
      .sort({ [config.dateField]: 1, createdAt: 1 });
    return res.json({ success: true, data: records });
  });
}

registerRecordRoutes('maintenance', {
  model: MaintenanceRecord,
  dateField: 'date',
  optionalDateFields: ['nextMaintenanceDate'],
  enumFields: {
    maintenanceType: ['Preventive', 'Corrective', 'Emergency'],
    status: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  },
  stringFields: ['issue', 'description', 'performedBy'],
  numberFields: { cost: { min: 0 }, downtimeHours: { min: 0 } },
});

registerRecordRoutes('inspections', {
  model: Inspection,
  dateField: 'inspectionDate',
  enumFields: {
    condition: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'],
    safetyStatus: ['SAFE', 'NEEDS_ATTENTION', 'UNSAFE'],
    securityStatus: ['SECURE', 'NEEDS_ATTENTION', 'COMPROMISED'],
  },
  stringFields: ['inspector', 'issuesFound', 'notes'],
  numberFields: { utilization: { min: 0, max: 100 } },
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Asset records API error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;