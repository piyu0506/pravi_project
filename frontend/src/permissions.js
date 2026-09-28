export const PERMISSIONS = {
  dashboard: ['USER', 'GOV_ADMIN', 'ASSET_MANAGER', 'MAINTENANCE', 'INSPECTOR', 'DECISION_MAKER'],
  viewAssets: ['USER', 'GOV_ADMIN', 'ASSET_MANAGER', 'MAINTENANCE', 'INSPECTOR', 'DECISION_MAKER'],
  assetCrud: ['GOV_ADMIN', 'ASSET_MANAGER'],
  lifecycle: ['GOV_ADMIN', 'ASSET_MANAGER'],
  maintenance: ['GOV_ADMIN', 'ASSET_MANAGER', 'MAINTENANCE'],
  inspections: ['GOV_ADMIN', 'ASSET_MANAGER', 'MAINTENANCE', 'INSPECTOR'],
  viewHealth: ['GOV_ADMIN', 'ASSET_MANAGER', 'MAINTENANCE', 'INSPECTOR'],
  dependencies: ['GOV_ADMIN', 'ASSET_MANAGER'],
  viewDependencies: ['GOV_ADMIN', 'ASSET_MANAGER', 'DECISION_MAKER'],
  retirementImpact: ['GOV_ADMIN', 'ASSET_MANAGER', 'DECISION_MAKER'],
  retirementRequest: ['GOV_ADMIN', 'ASSET_MANAGER'],
  retirementDecide: ['GOV_ADMIN', 'DECISION_MAKER'],
  viewRetirement: ['GOV_ADMIN', 'ASSET_MANAGER', 'DECISION_MAKER'],
};

export function hasPermission(role, permission) {
  if (role === 'GOV_ADMIN') return true;
  return PERMISSIONS[permission]?.includes(role) ?? false;
}
