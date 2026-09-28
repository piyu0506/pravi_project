const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  inspectionDate: { type: Date, required: true },
  inspector: { type: String, trim: true },
  condition: { type: String, enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'] },
  issuesFound: { type: String, trim: true },
  safetyStatus: { type: String, enum: ['SAFE', 'NEEDS_ATTENTION', 'UNSAFE'] },
  securityStatus: { type: String, enum: ['SECURE', 'NEEDS_ATTENTION', 'COMPROMISED'] },
  utilization: { type: Number, min: 0, max: 100 },
  notes: { type: String, trim: true },
}, { timestamps: true });

inspectionSchema.index({ asset: 1, inspectionDate: 1, createdAt: 1 });

module.exports = mongoose.model('Inspection', inspectionSchema);