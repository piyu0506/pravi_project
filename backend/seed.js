const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Asset = require('./models/Asset');
const connectDB = require('./db');

const demoAssets = [
  {
    assetId: 'DEMO-IT-001', name: 'North District Data Center', category: 'IT', type: 'Data Center',
    description: 'Fictional district hosting facility for inventory demonstrations.',
    owner: { department: 'Digital Services', organization: 'GoI Demo Administration' },
    location: { state: 'Delhi', city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 },
    procurement: { purchaseDate: '2019-03-14', purchaseCost: 42000000, vendor: 'Northstar Systems Demo', warrantyEnd: '2024-03-14' },
    lifecycle: { status: 'ACTIVE', installationDate: '2019-09-01', expectedLifeYears: 12 },
    health: { score: 88, riskLevel: 'LOW' },
    specifications: { racks: 48, powerCapacityKw: 900, cooling: 'N+1' },
  },
  {
    assetId: 'DEMO-IT-002', name: 'Coastal Records Storage Array', category: 'IT', type: 'Storage Array',
    description: 'Demo storage cluster for regional records workloads.',
    owner: { department: 'Records Technology', organization: 'Coastal Region Demo' },
    location: { state: 'Tamil Nadu', city: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
    procurement: { purchaseDate: '2024-06-20', purchaseCost: 7800000, vendor: 'Cloudline Hardware Demo', warrantyEnd: '2029-06-20' },
    lifecycle: { status: 'DEPLOYED', installationDate: '2025-01-15', expectedLifeYears: 8 },
    health: { score: 94, riskLevel: 'LOW' },
    specifications: { usableCapacityTb: 1200, interface: 'NVMe', redundancy: 'dual-controller' },
  },
  {
    assetId: 'DEMO-IT-003', name: 'Central Office Network Core', category: 'IT', type: 'Network Switch',
    description: 'Fictional campus core switch used in sample inventory records.',
    owner: { department: 'Network Operations', organization: 'Central Services Demo' },
    location: { state: 'Maharashtra', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
    procurement: { purchaseDate: '2022-11-05', purchaseCost: 1650000, vendor: 'PacketWorks Demo', warrantyEnd: '2027-11-05' },
    lifecycle: { status: 'MAINTENANCE', installationDate: '2023-02-10', expectedLifeYears: 10 },
    health: { score: 58, riskLevel: 'HIGH' },
    specifications: { ports: 96, throughputTbps: 12.8, firmware: 'demo-4.2' },
  },
  {
    assetId: 'DEMO-IT-004', name: 'Hill Region Backup Appliance', category: 'IT', type: 'Backup Appliance',
    description: 'Offline backup unit awaiting delivery to the demo region.',
    owner: { department: 'Cyber Resilience', organization: 'Himalayan Region Demo' },
    location: { state: 'Uttarakhand', city: 'Dehradun', latitude: 30.3165, longitude: 78.0322 },
    procurement: { purchaseDate: '2026-04-12', purchaseCost: 2450000, vendor: 'Evergreen Compute Demo', warrantyEnd: '2031-04-12' },
    lifecycle: { status: 'PURCHASED', expectedLifeYears: 7 },
    health: { score: 100, riskLevel: 'LOW' },
    specifications: { capacityTb: 500, encryption: true, deliveryWindow: '2026-Q4' },
  },
  {
    assetId: 'DEMO-IT-005', name: 'Legacy Archive Server', category: 'IT', type: 'Rack Server',
    description: 'Retired fictional server retained for lifecycle reporting demos.',
    owner: { department: 'Digital Archives', organization: 'Eastern Region Demo' },
    location: { state: 'West Bengal', city: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
    procurement: { purchaseDate: '2012-02-01', purchaseCost: 960000, vendor: 'Oldtown Devices Demo', warrantyEnd: '2015-02-01' },
    lifecycle: { status: 'RETIRED', installationDate: '2012-04-10', expectedLifeYears: 8 },
    health: { score: 18, riskLevel: 'CRITICAL' },
    specifications: { processors: 2, memoryGb: 64, retirementReason: 'End of support' },
  },
  {
    assetId: 'DEMO-POWER-001', name: 'Riverbend Solar Microgrid', category: 'POWER', type: 'Solar Microgrid',
    description: 'Demonstration solar generation and storage installation.',
    owner: { department: 'Renewable Energy', organization: 'Riverbend Demo District' },
    location: { state: 'Rajasthan', city: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
    procurement: { purchaseDate: '2021-01-18', purchaseCost: 28500000, vendor: 'Sunfield Energy Demo', warrantyEnd: '2031-01-18' },
    lifecycle: { status: 'ACTIVE', installationDate: '2021-10-02', expectedLifeYears: 25 },
    health: { score: 91, riskLevel: 'LOW' },
    specifications: { capacityMw: 4.5, batteryMwh: 12, panelCount: 7800 },
  },
  {
    assetId: 'DEMO-POWER-002', name: 'Western Grid Transformer T-17', category: 'POWER', type: 'Power Transformer',
    description: 'Fictional substation transformer for maintenance workflow demos.',
    owner: { department: 'Grid Assets', organization: 'Western Grid Demo' },
    location: { state: 'Gujarat', city: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
    procurement: { purchaseDate: '2016-08-09', purchaseCost: 11200000, vendor: 'Voltcraft Heavy Demo', warrantyEnd: '2021-08-09' },
    lifecycle: { status: 'MAINTENANCE', installationDate: '2017-01-22', expectedLifeYears: 30 },
    health: { score: 47, riskLevel: 'HIGH' },
    specifications: { capacityMva: 160, cooling: 'ONAN/ONAF', voltageKv: '220/66' },
  },
  {
    assetId: 'DEMO-POWER-003', name: 'Deccan Emergency Generator', category: 'POWER', type: 'Diesel Generator',
    description: 'Standby generator received and awaiting commissioning.',
    owner: { department: 'Facilities Engineering', organization: 'Deccan Region Demo' },
    location: { state: 'Telangana', city: 'Hyderabad', latitude: 17.3850, longitude: 78.4867 },
    procurement: { purchaseDate: '2025-09-10', purchaseCost: 3800000, vendor: 'Ironleaf Power Demo', warrantyEnd: '2028-09-10' },
    lifecycle: { status: 'RECEIVED', expectedLifeYears: 18 },
    health: { score: 97, riskLevel: 'LOW' },
    specifications: { capacityKva: 1250, fuel: 'diesel', enclosure: 'weatherproof' },
  },
  {
    assetId: 'DEMO-POWER-004', name: 'Eastern Feeder Switchgear', category: 'POWER', type: 'Switchgear',
    description: 'Sample medium-voltage feeder panel in active service.',
    owner: { department: 'Distribution Operations', organization: 'Eastern Power Demo' },
    location: { state: 'Odisha', city: 'Bhubaneswar', latitude: 20.2961, longitude: 85.8245 },
    procurement: { purchaseDate: '2020-05-25', purchaseCost: 2250000, vendor: 'Brightline Electric Demo', warrantyEnd: '2025-05-25' },
    lifecycle: { status: 'ACTIVE', installationDate: '2020-11-03', expectedLifeYears: 22 },
    health: { score: 73, riskLevel: 'MEDIUM' },
    specifications: { ratedVoltageKv: 33, panelCount: 14, insulation: 'vacuum' },
  },
  {
    assetId: 'DEMO-POWER-005', name: 'Northern Substation Capacitor Bank', category: 'POWER', type: 'Capacitor Bank',
    description: 'Decommissioned fictional power-factor correction equipment.',
    owner: { department: 'Grid Planning', organization: 'Northern Grid Demo' },
    location: { state: 'Punjab', city: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
    procurement: { purchaseDate: '2008-07-12', purchaseCost: 740000, vendor: 'Peak Current Demo', warrantyEnd: '2011-07-12' },
    lifecycle: { status: 'DISPOSED', installationDate: '2008-12-01', expectedLifeYears: 15 },
    health: { score: 0, riskLevel: 'CRITICAL' },
    specifications: { ratingMvar: 18, disposedDate: '2025-03-31', disposalMethod: 'recycling' },
  },
  {
    assetId: 'DEMO-TELECOM-001', name: 'Capital Fiber Exchange', category: 'TELECOM', type: 'Fiber Exchange',
    description: 'Fictional metropolitan fiber aggregation site.',
    owner: { department: 'Telecom Infrastructure', organization: 'Capital Network Demo' },
    location: { state: 'Delhi', city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 },
    procurement: { purchaseDate: '2023-02-16', purchaseCost: 9100000, vendor: 'Opticway Networks Demo', warrantyEnd: '2028-02-16' },
    lifecycle: { status: 'ACTIVE', installationDate: '2023-08-30', expectedLifeYears: 15 },
    health: { score: 86, riskLevel: 'LOW' },
    specifications: { fiberPairs: 96, throughputTbps: 3.2, protection: 'ring' },
  },
  {
    assetId: 'DEMO-TELECOM-002', name: 'Coastal Tower Cluster C-4', category: 'TELECOM', type: 'Telecom Tower',
    description: 'Sample tower cluster providing demo coastal coverage.',
    owner: { department: 'Wireless Services', organization: 'Coastal Telecom Demo' },
    location: { state: 'Kerala', city: 'Kochi', latitude: 9.9312, longitude: 76.2673 },
    procurement: { purchaseDate: '2018-12-02', purchaseCost: 6800000, vendor: 'Signal Ridge Demo', warrantyEnd: '2023-12-02' },
    lifecycle: { status: 'DEPLOYED', installationDate: '2019-04-18', expectedLifeYears: 20 },
    health: { score: 78, riskLevel: 'MEDIUM' },
    specifications: { heightMeters: 42, radios: 18, backupHours: 8 },
  },
  {
    assetId: 'DEMO-TELECOM-003', name: 'Central Microwave Relay R-12', category: 'TELECOM', type: 'Microwave Relay',
    description: 'Aging relay link under inspection in the demo network.',
    owner: { department: 'Transmission Engineering', organization: 'Central Telecom Demo' },
    location: { state: 'Madhya Pradesh', city: 'Bhopal', latitude: 23.2599, longitude: 77.4126 },
    procurement: { purchaseDate: '2015-04-22', purchaseCost: 1850000, vendor: 'Skybridge Telecom Demo', warrantyEnd: '2018-04-22' },
    lifecycle: { status: 'MAINTENANCE', installationDate: '2015-10-11', expectedLifeYears: 12 },
    health: { score: 39, riskLevel: 'HIGH' },
    specifications: { frequencyGhz: 18, channelWidthMhz: 56, hopLengthKm: 24 },
  },
  {
    assetId: 'DEMO-TELECOM-004', name: 'Island District Optical Terminal', category: 'TELECOM', type: 'Optical Terminal',
    description: 'New optical terminal purchased for a fictional island district.',
    owner: { department: 'Broadband Access', organization: 'Island District Demo' },
    location: { state: 'Andaman and Nicobar Islands', city: 'Port Blair', latitude: 11.6234, longitude: 92.7265 },
    procurement: { purchaseDate: '2026-07-03', purchaseCost: 1340000, vendor: 'Blue Current Fiber Demo', warrantyEnd: '2031-07-03' },
    lifecycle: { status: 'PURCHASED', expectedLifeYears: 10 },
    health: { score: 100, riskLevel: 'LOW' },
    specifications: { ports: 64, uplinkGbps: 400, environmentalRating: 'IP65' },
  },
  {
    assetId: 'DEMO-TELECOM-005', name: 'Legacy Rural Exchange RX-08', category: 'TELECOM', type: 'Telephone Exchange',
    description: 'Retired exchange kept for historical lifecycle demonstrations.',
    owner: { department: 'Legacy Networks', organization: 'Rural Services Demo' },
    location: { state: 'Bihar', city: 'Patna', latitude: 25.5941, longitude: 85.1376 },
    procurement: { purchaseDate: '2005-09-19', purchaseCost: 520000, vendor: 'Dialtone Works Demo', warrantyEnd: '2008-09-19' },
    lifecycle: { status: 'RETIRED', installationDate: '2006-01-15', expectedLifeYears: 14 },
    health: { score: 12, riskLevel: 'CRITICAL' },
    specifications: { subscriberLines: 2400, technology: 'legacy digital', retirementReason: 'Network modernization' },
  },
  {
    assetId: 'DEMO-FACILITY-001', name: 'South Operations Office', category: 'FACILITY', type: 'Office Building',
    description: 'Fictional regional office used for facilities inventory demos.',
    owner: { department: 'Property Services', organization: 'South Region Demo' },
    location: { state: 'Karnataka', city: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
    procurement: { purchaseDate: '2017-06-01', purchaseCost: 68000000, vendor: 'Cedarstone Projects Demo', warrantyEnd: '2022-06-01' },
    lifecycle: { status: 'ACTIVE', installationDate: '2018-01-05', expectedLifeYears: 50 },
    health: { score: 83, riskLevel: 'LOW' },
    specifications: { floorAreaSqm: 8400, floors: 7, occupancy: 620, greenRating: 'demo-gold' },
  },
  {
    assetId: 'DEMO-FACILITY-002', name: 'Eastern Records Annex', category: 'FACILITY', type: 'Archive Facility',
    description: 'Sample archive facility received after a renovation project.',
    owner: { department: 'Records Management', organization: 'Eastern Region Demo' },
    location: { state: 'Assam', city: 'Guwahati', latitude: 26.1445, longitude: 91.7362 },
    procurement: { purchaseDate: '2025-03-07', purchaseCost: 19200000, vendor: 'Riverstone Build Demo', warrantyEnd: '2030-03-07' },
    lifecycle: { status: 'RECEIVED', expectedLifeYears: 40 },
    health: { score: 96, riskLevel: 'LOW' },
    specifications: { floorAreaSqm: 3100, floors: 3, fireSuppression: 'clean agent' },
  },
  {
    assetId: 'DEMO-FACILITY-003', name: 'Central Water Treatment Plant', category: 'FACILITY', type: 'Water Treatment Plant',
    description: 'Demo utility facility with a pending pump maintenance work order.',
    owner: { department: 'Civic Utilities', organization: 'Central District Demo' },
    location: { state: 'Uttar Pradesh', city: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
    procurement: { purchaseDate: '2014-10-26', purchaseCost: 35500000, vendor: 'Clearwater Engineering Demo', warrantyEnd: '2019-10-26' },
    lifecycle: { status: 'MAINTENANCE', installationDate: '2015-05-12', expectedLifeYears: 35 },
    health: { score: 52, riskLevel: 'HIGH' },
    specifications: { capacityMld: 48, treatmentStages: 5, pumps: 12 },
  },
  {
    assetId: 'DEMO-FACILITY-004', name: 'Western Emergency Operations Center', category: 'FACILITY', type: 'Operations Center',
    description: 'Newly commissioned emergency coordination center for demo records.',
    owner: { department: 'Emergency Planning', organization: 'Western Region Demo' },
    location: { state: 'Goa', city: 'Panaji', latitude: 15.4909, longitude: 73.8278 },
    procurement: { purchaseDate: '2022-08-15', purchaseCost: 27400000, vendor: 'Harborlight Construction Demo', warrantyEnd: '2027-08-15' },
    lifecycle: { status: 'DEPLOYED', installationDate: '2023-06-21', expectedLifeYears: 45 },
    health: { score: 89, riskLevel: 'LOW' },
    specifications: { floorAreaSqm: 4200, backupPowerHours: 72, controlRooms: 3 },
  },
  {
    assetId: 'DEMO-FACILITY-005', name: 'Old North Depot', category: 'FACILITY', type: 'Storage Depot',
    description: 'Disposed storage building retained as a demo lifecycle record.',
    owner: { department: 'Logistics Property', organization: 'North Region Demo' },
    location: { state: 'Haryana', city: 'Gurugram', latitude: 28.4595, longitude: 77.0266 },
    procurement: { purchaseDate: '1989-04-03', purchaseCost: 1250000, vendor: 'Fieldstone Works Demo', warrantyEnd: '1992-04-03' },
    lifecycle: { status: 'DISPOSED', installationDate: '1990-01-10', expectedLifeYears: 30 },
    health: { score: 0, riskLevel: 'CRITICAL' },
    specifications: { floorAreaSqm: 1800, floors: 1, disposedDate: '2024-12-20' },
  },
  {
    assetId: 'DEMO-TRANSPORT-001', name: 'Metro Inspection Vehicle V-21', category: 'TRANSPORT', type: 'Inspection Vehicle',
    description: 'Fictional electric inspection vehicle assigned to a demo metro area.',
    owner: { department: 'Field Inspections', organization: 'Metro Region Demo' },
    location: { state: 'Maharashtra', city: 'Pune', latitude: 18.5204, longitude: 73.8567 },
    procurement: { purchaseDate: '2023-05-08', purchaseCost: 2450000, vendor: 'Greenway Mobility Demo', warrantyEnd: '2028-05-08' },
    lifecycle: { status: 'ACTIVE', installationDate: '2023-07-01', expectedLifeYears: 12 },
    health: { score: 92, riskLevel: 'LOW' },
    specifications: { powertrain: 'electric', rangeKm: 340, seating: 5 },
  },
  {
    assetId: 'DEMO-TRANSPORT-002', name: 'River District Utility Ferry', category: 'TRANSPORT', type: 'Utility Ferry',
    description: 'Demo service vessel received for planned river crossing operations.',
    owner: { department: 'Waterway Operations', organization: 'River District Demo' },
    location: { state: 'Assam', city: 'Dibrugarh', latitude: 27.4728, longitude: 94.9120 },
    procurement: { purchaseDate: '2025-11-17', purchaseCost: 15800000, vendor: 'Bluewake Marine Demo', warrantyEnd: '2030-11-17' },
    lifecycle: { status: 'RECEIVED', expectedLifeYears: 25 },
    health: { score: 98, riskLevel: 'LOW' },
    specifications: { lengthMeters: 28, passengerCapacity: 80, propulsion: 'hybrid' },
  },
  {
    assetId: 'DEMO-TRANSPORT-003', name: 'Hill Route Maintenance Truck', category: 'TRANSPORT', type: 'Maintenance Truck',
    description: 'Aging route maintenance truck awaiting replacement parts.',
    owner: { department: 'Road Maintenance', organization: 'Hill District Demo' },
    location: { state: 'Himachal Pradesh', city: 'Shimla', latitude: 31.1048, longitude: 77.1734 },
    procurement: { purchaseDate: '2013-01-28', purchaseCost: 4600000, vendor: 'Granite Road Vehicles Demo', warrantyEnd: '2016-01-28' },
    lifecycle: { status: 'MAINTENANCE', installationDate: '2013-04-15', expectedLifeYears: 12 },
    health: { score: 34, riskLevel: 'HIGH' },
    specifications: { grossWeightTonnes: 16, drive: '4x4', odometerKm: 286400 },
  },
  {
    assetId: 'DEMO-TRANSPORT-004', name: 'Central Survey Drone Fleet D-06', category: 'TRANSPORT', type: 'Survey Drone',
    description: 'Recently deployed unmanned survey fleet for fictional infrastructure mapping.',
    owner: { department: 'Geospatial Services', organization: 'Central Survey Demo' },
    location: { state: 'Chhattisgarh', city: 'Raipur', latitude: 21.2514, longitude: 81.6296 },
    procurement: { purchaseDate: '2024-02-12', purchaseCost: 1280000, vendor: 'Skyplot Robotics Demo', warrantyEnd: '2026-02-12' },
    lifecycle: { status: 'DEPLOYED', installationDate: '2024-05-20', expectedLifeYears: 6 },
    health: { score: 68, riskLevel: 'MEDIUM' },
    specifications: { aircraftCount: 6, flightTimeMinutes: 52, payload: 'survey lidar' },
  },
  {
    assetId: 'DEMO-TRANSPORT-005', name: 'Retired East Service Coach', category: 'TRANSPORT', type: 'Service Bus',
    description: 'Retired fleet vehicle retained for sample disposal reporting.',
    owner: { department: 'Fleet Services', organization: 'East Region Demo' },
    location: { state: 'Jharkhand', city: 'Ranchi', latitude: 23.3441, longitude: 85.3096 },
    procurement: { purchaseDate: '2009-06-30', purchaseCost: 2850000, vendor: 'Redbrick Transit Demo', warrantyEnd: '2012-06-30' },
    lifecycle: { status: 'RETIRED', installationDate: '2009-09-03', expectedLifeYears: 12 },
    health: { score: 9, riskLevel: 'CRITICAL' },
    specifications: { seating: 42, fuel: 'diesel', retirementReason: 'Fleet replacement' },
  },
];

async function seed() {
  try {
    console.log(`Seed records: ${demoAssets.length}`);

    await connectDB();
    console.log('MongoDB connected');

    const operations = demoAssets.map((asset) => ({
      updateOne: {
        filter: { assetId: asset.assetId },
        update: { $set: asset },
        upsert: true,
      },
    }));

    console.log('Starting bulkWrite...');

    const result = await Asset.bulkWrite(operations, {
      ordered: false,
    });

    console.log('Bulk write completed');
    console.log('Acknowledged:', result.acknowledged);
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);
    console.log('Upserted:', result.upsertedCount);

    const finalCount = await Asset.countDocuments();

    console.log(`Final Asset count: ${finalCount}`);

    if (finalCount < demoAssets.length) {
      console.error(
        `WARNING: Expected at least ${demoAssets.length} assets, but found ${finalCount}.`
      );
      process.exitCode = 1;
    } else {
      console.log(
        `Phase 3 seed verification passed: ${finalCount} assets exist.`
      );
    }
  } catch (error) {
    console.error('Asset seed failed.');
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch((disconnectError) => {
      console.error('MongoDB disconnect failed:', disconnectError.message);
    });
  }
}

seed();