const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./db');
const assetsRouter = require('./routes/assets');
const lifecycleRouter = require('./routes/lifecycle');
const assetRecordsRouter = require('./routes/asset-records');
const healthRouter = require('./routes/health');
const dependenciesRouter = require('./routes/dependencies');
const retirementImpactRouter = require('./routes/retirement-impact');
const retirementRequestsRouter = require('./routes/retirement-requests');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', dependenciesRouter);
app.use('/api/assets', retirementImpactRouter);
app.use('/api/retirement-requests', retirementRequestsRouter);
app.use('/api/assets', healthRouter);
app.use('/api/assets', assetRecordsRouter);
app.use('/api/assets', lifecycleRouter);
app.use('/api/assets', assetsRouter);

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: 'GoI Asset Inventory API is running',
    dbStatus: connected ? 'connected' : 'disconnected',
  });
});

async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`GoI Asset Inventory API listening on port ${port}`);
  });
}

startServer().catch(() => {
  process.exitCode = 1;
});