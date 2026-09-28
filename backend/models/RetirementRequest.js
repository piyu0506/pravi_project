const mongoose = require('mongoose');

const impactLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const statuses = ['REQUESTED', 'APPROVED', 'REJECTED'];

const retirementRequestSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  requestedBy: { type: String, required: true, trim: true },
  requestDate: { type: Date, default: Date.now },
  impactLevel: { type: String, enum: impactLevels },
  impactSummary: { type: String, trim: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, required: true, enum: statuses, default: 'REQUESTED' },
  decidedBy: { type: String, trim: true },
  decisionDate: Date,
  decisionNotes: { type: String, trim: true },
}, { timestamps: true });

retirementRequestSchema.index(
  { asset: 1 },
  { unique: true, partialFilterExpression: { status: 'REQUESTED' } },
);

module.exports = mongoose.model('RetirementRequest', retirementRequestSchema);
