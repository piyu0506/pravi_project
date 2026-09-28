const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  department: { type: String, trim: true },
  organization: { type: String, trim: true },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
}, { _id: false });

const procurementSchema = new mongoose.Schema({
  purchaseDate: Date,
  purchaseCost: { type: Number, min: 0 },
  vendor: { type: String, trim: true },
  warrantyEnd: Date,
}, { _id: false });

const lifecycleSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PURCHASED', 'RECEIVED', 'DEPLOYED', 'ACTIVE', 'MAINTENANCE', 'RETIRED', 'DISPOSED'],
  },
  installationDate: Date,
  expectedLifeYears: { type: Number, min: 0 },
}, { _id: false });

const healthSchema = new mongoose.Schema({
  score: { type: Number, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
}, { _id: false });

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, trim: true },
  category: { type: String, enum: ['IT', 'POWER', 'TELECOM', 'FACILITY', 'TRANSPORT'] },
  type: { type: String, trim: true },
  description: { type: String, trim: true },
  owner: ownerSchema,
  location: locationSchema,
  procurement: procurementSchema,
  lifecycle: lifecycleSchema,
  health: healthSchema,
  specifications: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);