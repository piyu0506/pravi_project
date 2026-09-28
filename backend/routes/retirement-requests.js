const express = require('express');
const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const LifecycleEvent = require('../models/LifecycleEvent');
const RetirementRequest = require('../models/RetirementRequest');
const { analyzeRetirementImpact } = require('./retirement-impact');

const router = express.Router();
const terminalStatuses = new Set(['RETIRED', 'DISPOSED']);
const decisions = new Set(['APPROVED', 'REJECTED']);
const assetPopulate = {
  path: 'asset',
  select: 'assetId name category owner location lifecycle health',
};

function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)
    && mongoose.Types.ObjectId.isValid(value);
}

function isObjectPayload(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    return `${field} is required`;
  }
  return null;
}

function optionalString(value, field) {
  if (value !== undefined && typeof value !== 'string') {
    return `${field} must be a string`;
  }
  return null;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function impactSummaryFrom(impact) {
  const affected = impact.allAffectedAssets.length;
  const direct = impact.directDependents.length;
  const indirect = impact.indirectDependents.length;
  return `${affected} affected asset${affected === 1 ? '' : 's'} (${direct} direct, ${indirect} indirect); depth ${impact.dependencyDepth}; impact ${impact.impactLevel}`;
}

router.post('/', async (req, res) => {
  if (!isObjectPayload(req.body)) {
    return res.status(400).json({ success: false, message: 'Request body must be a JSON object' });
  }

  const { asset: assetId, requestedBy, reason } = req.body;
  if (!isObjectId(assetId)) {
    return res.status(400).json({ success: false, message: 'A valid asset ID is required' });
  }
  const requestedByError = requiredString(requestedBy, 'requestedBy');
  if (requestedByError) return res.status(400).json({ success: false, message: requestedByError });
  const reasonError = requiredString(reason, 'reason');
  if (reasonError) return res.status(400).json({ success: false, message: reasonError });

  const asset = await Asset.findById(assetId).lean();
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Asset not found' });
  }
  if (terminalStatuses.has(asset.lifecycle?.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cannot request retirement for an asset that is already RETIRED or DISPOSED',
    });
  }

  const existing = await RetirementRequest.exists({ asset: asset._id, status: 'REQUESTED' });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An active retirement request already exists for this asset',
    });
  }

  const impact = await analyzeRetirementImpact(asset);
  const request = await RetirementRequest.create({
    asset: asset._id,
    requestedBy: requestedBy.trim(),
    reason: reason.trim(),
    status: 'REQUESTED',
    impactLevel: impact.impactLevel,
    impactSummary: impactSummaryFrom(impact),
  });

  return res.status(201).json({ success: true, data: request });
});

router.get('/', async (req, res) => {
  const requests = await RetirementRequest.find()
    .populate(assetPopulate)
    .sort({ createdAt: -1 });
  return res.json({ success: true, data: requests });
});

router.get('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid retirement request ID' });
  }

  const request = await RetirementRequest.findById(req.params.id).populate(assetPopulate);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Retirement request not found' });
  }
  return res.json({ success: true, data: request });
});

router.put('/:id/decision', async (req, res) => {
  if (!isObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid retirement request ID' });
  }
  if (!isObjectPayload(req.body)) {
    return res.status(400).json({ success: false, message: 'Request body must be a JSON object' });
  }

  const { decision, decidedBy, decisionNotes } = req.body;
  if (typeof decision !== 'string' || !decisions.has(decision)) {
    return res.status(400).json({ success: false, message: 'decision must be APPROVED or REJECTED' });
  }
  const decidedByError = requiredString(decidedBy, 'decidedBy');
  if (decidedByError) return res.status(400).json({ success: false, message: decidedByError });
  const notesError = optionalString(decisionNotes, 'decisionNotes');
  if (notesError) return res.status(400).json({ success: false, message: notesError });

  const session = await mongoose.startSession();
  let updatedRequest;
  try {
    await session.withTransaction(async () => {
      const request = await RetirementRequest.findById(req.params.id).session(session);
      if (!request) throw httpError(404, 'Retirement request not found');
      if (request.status !== 'REQUESTED') {
        throw httpError(409, 'Only a REQUESTED retirement request can be decided');
      }

      const asset = await Asset.findById(request.asset).session(session);
      if (!asset) throw httpError(404, 'Asset not found');

      if (decision === 'APPROVED' && terminalStatuses.has(asset.lifecycle?.status)) {
        throw httpError(400, 'Cannot approve retirement for an asset that is already RETIRED or DISPOSED');
      }

      const decisionDate = new Date();
      request.status = decision;
      request.decidedBy = decidedBy.trim();
      request.decisionDate = decisionDate;
      request.decisionNotes = decisionNotes;
      await request.save({ session });

      if (decision === 'APPROVED') {
        await Asset.updateOne(
          { _id: asset._id },
          { $set: { 'lifecycle.status': 'RETIRED' } },
          { session, runValidators: true },
        );

        const alreadyRetired = await LifecycleEvent.exists({
          asset: asset._id,
          eventType: 'RETIRED',
        }).session(session);
        if (!alreadyRetired) {
          await LifecycleEvent.create([{
            asset: asset._id,
            eventType: 'RETIRED',
            date: decisionDate,
            performedBy: decidedBy.trim(),
            department: asset.owner?.department,
            description: `Asset retired following approved retirement request ${request._id}.`,
          }], { session });
        }
      }

      updatedRequest = request;
    });
  } finally {
    await session.endSession();
  }

  const populated = await RetirementRequest.findById(updatedRequest._id).populate(assetPopulate);
  return res.json({ success: true, data: populated });
});

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'An active retirement request already exists for this asset',
    });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error('Retirement request API error:', error);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;
