export const ROLES = [
  'USER',
  'GOV_ADMIN',
  'ASSET_MANAGER',
  'MAINTENANCE',
  'INSPECTOR',
  'DECISION_MAKER',
];

export const ROLE_LABELS = {
  USER: 'User',
  GOV_ADMIN: 'Gov Admin',
  ASSET_MANAGER: 'Asset Manager',
  MAINTENANCE: 'Maintenance',
  INSPECTOR: 'Inspector',
  DECISION_MAKER: 'Decision Maker',
};

export const ROLE_STORAGE_KEY = 'goi_asset_role';

export const CATEGORIES = ['IT', 'POWER', 'TELECOM', 'FACILITY', 'TRANSPORT'];

export const LIFECYCLE_STATUSES = [
  'PURCHASED',
  'RECEIVED',
  'DEPLOYED',
  'ACTIVE',
  'MAINTENANCE',
  'RETIRED',
  'DISPOSED',
];

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const LIFECYCLE_EVENTS = [
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

export const MAINTENANCE_TYPES = ['Preventive', 'Corrective', 'Emergency'];
export const MAINTENANCE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];
export const SAFETY_STATUSES = ['SAFE', 'NEEDS_ATTENTION', 'UNSAFE'];
export const SECURITY_STATUSES = ['SECURE', 'NEEDS_ATTENTION', 'COMPROMISED'];
export const RELATIONSHIP_TYPES = ['POWERS', 'USES', 'DEPENDS_ON', 'CONNECTS_TO', 'HOSTS', 'SUPPORTS', 'LOCATED_IN'];
export const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED'];

export const OPERATIONAL_STATUSES = ['ACTIVE', 'DEPLOYED'];
