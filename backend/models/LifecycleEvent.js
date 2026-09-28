const mongoose = require('mongoose');

const eventTypes = [
  'PURCHASED',
  'RECEIVED',
  'DEPLOYED',
  'ACTIVATED',
  'INSPECTION',
  'MAINTENANCE',
  'REPAIRED',
  'RETIRED',
  'DISPOSED',
];

const lifecycleEventSchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  eventType: { type: String, required: true, enum: eventTypes },
  date: { type: Date, required: true },
  performedBy: { type: String, trim: true },
  department: { type: String, trim: true },
  description: { type: String, trim: true },
  cost: { type: Number, min: 0 },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    validate: {
      validator: (value) => value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value)),
      message: 'Metadata must be an object',
    },
  },
}, { timestamps: true });

lifecycleEventSchema.index({ asset: 1, date: 1, createdAt: 1 });

module.exports = mongoose.model('LifecycleEvent', lifecycleEventSchema);