const mongoose = require('mongoose');

const assetDependencySchema = new mongoose.Schema({
  sourceAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  targetAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  relationshipType: {
    type: String,
    required: true,
    enum: ['POWERS', 'USES', 'DEPENDS_ON', 'CONNECTS_TO', 'HOSTS', 'SUPPORTS', 'LOCATED_IN'],
  },
  description: { type: String, trim: true },
  criticality: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
}, { timestamps: true });

assetDependencySchema.index({ sourceAsset: 1, targetAsset: 1 }, { unique: true });

module.exports = mongoose.model('AssetDependency', assetDependencySchema);