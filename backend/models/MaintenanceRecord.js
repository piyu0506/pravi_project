const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  maintenanceType: { type: String, enum: ['Preventive', 'Corrective', 'Emergency'] },
  date: { type: Date, required: true },
  issue: { type: String, trim: true },
  description: { type: String, trim: true },
  performedBy: { type: String, trim: true },
  cost: { type: Number, min: 0 },
  downtimeHours: { type: Number, min: 0 },
  nextMaintenanceDate: Date,
  status: { type: String, enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
}, { timestamps: true });

maintenanceRecordSchema.index({ asset: 1, date: 1, createdAt: 1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);