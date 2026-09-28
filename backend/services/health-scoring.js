const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365.2425;
const weights = {
  Age: 20,
  Warranty: 10,
  Maintenance: 20,
  'Failures/issues': 15,
  Inspection: 20,
  'Safety/security': 10,
  Utilization: 5,
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function validDate(value) {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function newestByDate(records, field) {
  return records
    .map((record) => ({ record, date: validDate(record[field]) }))
    .filter((item) => item.date)
    .sort((left, right) => right.date - left.date)[0] || null;
}

function ageFactor(asset, now) {
  const purchaseDate = validDate(asset.procurement?.purchaseDate);
  const installationDate = validDate(asset.lifecycle?.installationDate);
  const startDate = purchaseDate || installationDate;
  if (!startDate) {
    return { score: 70, rawValue: { ageYears: null, expectedLifeYears: asset.lifecycle?.expectedLifeYears || null }, description: 'No purchase or installation date; a neutral score is used.' };
  }
  const ageYears = Math.max(0, (now - startDate) / DAY_MS / YEAR_DAYS);
  const expectedLifeYears = Number.isFinite(asset.lifecycle?.expectedLifeYears) && asset.lifecycle.expectedLifeYears > 0
    ? asset.lifecycle.expectedLifeYears
    : 20;
  const lifeRatio = ageYears / expectedLifeYears;
  const score = Math.round(clamp(150 - lifeRatio * 100));
  return {
    score,
    rawValue: { ageYears: round(ageYears), expectedLifeYears, lifeRatio: round(lifeRatio) },
    description: `Estimated age is ${round(ageYears)} years against an expected life of ${expectedLifeYears} years.`,
  };
}

function warrantyFactor(asset, now) {
  const warrantyEnd = validDate(asset.procurement?.warrantyEnd);
  if (!warrantyEnd) {
    return { score: 70, rawValue: null, description: 'Warranty end date is unavailable; a neutral score is used.' };
  }
  const daysRemaining = Math.ceil((warrantyEnd - now) / DAY_MS);
  const score = daysRemaining >= 0
    ? 100
    : Math.round(clamp(100 - (Math.abs(daysRemaining) / YEAR_DAYS) * 20));
  return {
    score,
    rawValue: { warrantyEnd: warrantyEnd.toISOString(), daysRemaining },
    description: daysRemaining >= 0 ? 'Warranty is currently valid.' : `Warranty expired ${Math.abs(daysRemaining)} days ago.`,
  };
}

function maintenanceFactor(records, now) {
  const preventiveRecords = records.filter((record) => record.maintenanceType === 'Preventive');
  const latest = newestByDate(preventiveRecords, 'date');
  if (!latest) {
    return {
      score: 65,
      rawValue: { preventiveRecordCount: preventiveRecords.length, latestDate: null },
      description: 'No dated preventive maintenance record is available; a neutral score is used.',
    };
  }

  const { record, date } = latest;
  const nextDate = validDate(record.nextMaintenanceDate);
  let score;
  if (record.status === 'CANCELLED') {
    score = 40;
  } else if (record.status === 'IN_PROGRESS') {
    score = 70;
  } else if (record.status === 'SCHEDULED') {
    score = nextDate && nextDate > now ? 85 : 45;
  } else if (nextDate) {
    const overdueDays = Math.max(0, (now - nextDate) / DAY_MS);
    score = Math.round(clamp(100 - overdueDays / 30 * 5));
  } else {
    const daysSince = Math.max(0, (now - date) / DAY_MS);
    score = Math.round(clamp(100 - Math.max(0, daysSince - 180) * 0.15));
  }

  return {
    score,
    rawValue: {
      preventiveRecordCount: preventiveRecords.length,
      latestDate: date.toISOString(),
      status: record.status || null,
      nextMaintenanceDate: nextDate?.toISOString() || null,
    },
    description: 'Based on the latest preventive maintenance status and schedule.',
  };
}

function failuresFactor(maintenanceRecords, inspections, lifecycleEvents, now) {
  const cutoff = now.getTime() - YEAR_DAYS * DAY_MS;
  const recent = (record, field) => {
    const date = validDate(record[field]);
    return date && date.getTime() >= cutoff && date <= now;
  };
  const corrective = maintenanceRecords.filter((record) => record.maintenanceType === 'Corrective' && recent(record, 'date')).length;
  const emergency = maintenanceRecords.filter((record) => record.maintenanceType === 'Emergency' && recent(record, 'date')).length;
  const repairs = lifecycleEvents.filter((event) => event.eventType === 'REPAIRED' && recent(event, 'date')).length;
  const reportedIssues = inspections.filter((inspection) => Boolean(inspection.issuesFound?.trim()) && recent(inspection, 'inspectionDate')).length;
  const deductions = corrective * 15 + emergency * 25 + repairs * 20 + reportedIssues * 10;
  return {
    score: clamp(100 - deductions),
    rawValue: { corrective, emergency, repairs, inspectionsWithIssues: reportedIssues, periodDays: YEAR_DAYS },
    description: 'Recent corrective/emergency work, repairs, and inspections reporting issues reduce this factor.',
  };
}

function inspectionFactor(inspections) {
  const latest = newestByDate(inspections, 'inspectionDate');
  const conditionScores = { EXCELLENT: 100, GOOD: 85, FAIR: 65, POOR: 40, CRITICAL: 15 };
  if (!latest) {
    return { score: 65, rawValue: null, description: 'No dated inspection is available; a neutral score is used.' };
  }
  return {
    score: conditionScores[latest.record.condition] ?? 65,
    rawValue: { inspectionDate: latest.date.toISOString(), condition: latest.record.condition || null },
    description: 'Based on the condition recorded in the most recent inspection.',
  };
}

function safetySecurityFactor(inspections) {
  const latest = newestByDate(inspections, 'inspectionDate');
  if (!latest) {
    return { score: 65, rawValue: null, description: 'No inspection safety/security status is available; a neutral score is used.' };
  }
  const safetyScores = { SAFE: 100, NEEDS_ATTENTION: 50, UNSAFE: 0 };
  const securityScores = { SECURE: 100, NEEDS_ATTENTION: 50, COMPROMISED: 0 };
  const scores = [
    safetyScores[latest.record.safetyStatus],
    securityScores[latest.record.securityStatus],
  ].filter(Number.isFinite);
  return {
    score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 65,
    rawValue: {
      inspectionDate: latest.date.toISOString(),
      safetyStatus: latest.record.safetyStatus || null,
      securityStatus: latest.record.securityStatus || null,
    },
    description: 'Safety and security statuses from the most recent inspection are averaged.',
  };
}

function utilizationFactor(inspections) {
  const latest = newestByDate(inspections, 'inspectionDate');
  const utilization = latest?.record.utilization;
  if (!Number.isFinite(utilization)) {
    return { score: 65, rawValue: null, description: 'No inspection utilization value is available; a neutral score is used.' };
  }
  const score = utilization < 40
    ? 50 + utilization / 40 * 50
    : utilization <= 80
      ? 100
      : 100 - (utilization - 80) * 5;
  return {
    score: Math.round(clamp(score)),
    rawValue: { inspectionDate: latest.date.toISOString(), utilization },
    description: utilization >= 40 && utilization <= 80
      ? 'Utilization is within the target 40–80% band.'
      : 'Very low or high utilization reduces this factor.',
  };
}

function calculateHealth({ asset, maintenanceRecords = [], inspections = [], lifecycleEvents = [], now = new Date() }) {
  const referenceTime = validDate(now);
  if (!asset || !referenceTime) throw new TypeError('A valid asset and calculation date are required');

  const components = [
    ['Age', ageFactor(asset, referenceTime)],
    ['Warranty', warrantyFactor(asset, referenceTime)],
    ['Maintenance', maintenanceFactor(maintenanceRecords, referenceTime)],
    ['Failures/issues', failuresFactor(maintenanceRecords, inspections, lifecycleEvents, referenceTime)],
    ['Inspection', inspectionFactor(inspections)],
    ['Safety/security', safetySecurityFactor(inspections)],
    ['Utilization', utilizationFactor(inspections)],
  ];
  const factors = components.map(([factor, result]) => ({
    factor,
    weight: weights[factor],
    factorScore: Math.round(result.score),
    rawValue: result.rawValue,
    impact: round(weights[factor] * result.score / 100),
    description: result.description,
  }));
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.impact, 0));
  const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL';

  return { score, riskLevel, factors, calculatedAt: referenceTime.toISOString() };
}

module.exports = { calculateHealth, weights };