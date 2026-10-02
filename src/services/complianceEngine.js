// ============================================================
// NetQ Check — Compliance Intelligence Engine (Phase 3)
// Configurable, context-aware Legal Metrology rule evaluation engine
// ============================================================

import { getCategoryById, detectCategoryFromText } from './ruleEngine/productCategories.js';
import { getRuleSet, RULE_SET_VERSION, SEVERITY_LEVELS } from './ruleRepository/ruleRepository.js';
import { normalizeExtractedData } from './normalization/dataNormalizer.js';
import { determineRuleApplicability } from './applicabilityEngine/applicabilityEngine.js';
import { buildEvidenceMap, getConfidenceLevel } from './ruleEngine/evidenceMapper.js';
import {
  validatePresence,
  validateMRP,
  validateUSP,
  validateQuantity,
  validateDate,
  validateText,
  validatePhone,
  validateAddress,
  validateManualReview,
} from './validators/reusableValidators.js';

/**
 * Main entry point for Compliance Engine screening evaluation
 * Supports both object options and legacy positional parameters
 * @param {Object|Array} inputData - extractedData object or options wrapper
 * @param {string|Object} [categoryParam='GENERAL_PACKAGED'] - product category
 * @param {Object} [options={}] - additional options
 */
export function runComplianceCheck(inputData, categoryParam = 'GENERAL_PACKAGED', options = {}) {
  // Support positional or single object call format
  let extractedData = inputData;
  let categoryInput = categoryParam;
  let scanId = options.scanId || 'SCAN-' + Date.now();
  let userId = options.userId || 'INSPECTOR-01';
  let ruleSetVersion = options.ruleSetVersion || RULE_SET_VERSION;

  if (inputData && typeof inputData === 'object' && inputData.extractedData) {
    extractedData = inputData.extractedData;
    categoryInput = inputData.productCategory || categoryParam;
    scanId = inputData.scanId || scanId;
    userId = inputData.userId || userId;
    ruleSetVersion = inputData.ruleSetVersion || ruleSetVersion;
  }

  // 1. Resolve Category
  let category = typeof categoryInput === 'object' ? categoryInput : getCategoryById(categoryInput);

  // Auto-detect category if required or set to auto
  if (!categoryInput || categoryInput === 'AUTO') {
    const rawText = Object.values(extractedData || {}).map(f => f?.value || '').join(' ');
    const productName = extractedData?.productName?.value || '';
    category = detectCategoryFromText(rawText, productName);
  }

  // 2. Data Normalization Layer
  const normalizedData = normalizeExtractedData(extractedData || {});

  // 3. Load Rule Set Repository
  const ruleSet = getRuleSet(ruleSetVersion);

  // 4. Build Evidence Map
  const evidenceMap = buildEvidenceMap(normalizedData, scanId);

  // 5. Evaluate Rules
  const checks = ruleSet.map(rule => {
    return evaluateSingleRequirement(rule, category, normalizedData, evidenceMap);
  });

  // 6. Calculate Summary & Smart Issues Classification
  const summary = calculateSummaryStats(checks);
  const overallStatus = determineOverallComplianceStatus(checks);
  const issues = classifyIssues(checks);
  const reviewItems = checks.filter(c => c.manualVerificationRequired || c.status === 'REVIEW');

  // 7. Construct Audit Trail Metadata
  const audit = {
    assessmentId: `ASM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    scanId,
    timestamp: new Date().toISOString(),
    userId,
    category,
    ruleSetVersion,
    engineVersion: '3.0.0',
    overallStatus,
  };

  return {
    assessmentId: audit.assessmentId,
    scanId: audit.scanId,
    timestamp: audit.timestamp,
    userId: audit.userId,
    category,
    ruleSetVersion,
    engineVersion: audit.engineVersion,
    overallStatus,
    summary,
    checks,
    issues,
    reviewItems,
    evidence: evidenceMap,
    normalizedData,
    // Backward compatibility props for Phase 2 UI
    results: checks,
  };
}

/**
 * Evaluate a single rule requirement against category and normalized data
 */
function evaluateSingleRequirement(rule, category, normalizedData, evidenceMap) {
  // Determine applicability
  const applicability = determineRuleApplicability(rule, category, normalizedData);
  const evidence = evidenceMap[rule.dataKey] || null;
  const fieldItem = normalizedData[rule.dataKey] || null;
  const rawValue = fieldItem?.value ?? null;
  const normalizedValue = fieldItem?.normalizedValue ?? rawValue;
  const confidence = fieldItem?.confidence ?? 0;
  const confidenceLevel = getConfidenceLevel(confidence);

  // If rule is NOT APPLICABLE
  if (!applicability.isApplicable) {
    return {
      requirementId: rule.id,
      requirementName: rule.name,
      requirement: rule.requirement || rule.name,
      ruleType: rule.requirementType,
      applicability: rule.applicability,
      validationType: rule.validationType,
      category: rule.category,
      severity: rule.severity,
      ruleReference: rule.ruleReference,
      status: 'NOT_APPLICABLE',
      extractedValue: rawValue,
      normalizedValue,
      expectedCondition: applicability.applicabilityReason,
      reason: applicability.applicabilityReason,
      confidence: 1.0,
      confidenceLevel: 'high',
      manualVerificationRequired: false,
      evidence,
      dataKey: rule.dataKey,
    };
  }

  // Perform validation on applicable rule
  let validationResult = { isValid: false, reason: 'Declaration not evaluated' };

  if (rule.dataKey === 'unitSalePrice') {
    validationResult = validateUSP(rawValue, fieldItem?.parsedDetails);
  } else if (rule.validationType === 'CURRENCY' && rule.dataKey === 'mrp') {
    validationResult = validateMRP(rawValue, fieldItem?.parsedDetails);
  } else if (rule.validationType === 'QUANTITY') {
    validationResult = validateQuantity(rawValue, fieldItem?.parsedDetails);
  } else if (rule.validationType === 'DATE') {
    validationResult = validateDate(rawValue, fieldItem?.parsedDetails);
  } else if (rule.validationType === 'MANUAL_REVIEW') {
    validationResult = validateManualReview(rawValue);
  } else if (rule.dataKey === 'consumerCare') {
    validationResult = validatePhone(rawValue, fieldItem?.parsedDetails);
  } else if (rule.dataKey === 'manufacturer') {
    validationResult = validateAddress(rawValue, fieldItem?.parsedDetails);
  } else if (rule.validationType === 'TEXT_PATTERN') {
    validationResult = validateText(rawValue, rule.patterns);
  } else {
    validationResult = validatePresence(rawValue);
  }

  // Status Assignment Logic
  let status = 'PASS';
  let reason = validationResult.reason;
  let manualVerificationRequired = false;

  if (!validationResult.isValid) {
    if (applicability.isMandatory || rule.requirementType === 'MANDATORY') {
      status = 'FAIL';
      reason = validationResult.reason;
    } else {
      status = 'NOT_DETECTED';
      reason = `Optional declaration not detected (${validationResult.reason})`;
    }
  } else {
    // Valid value present, evaluate review flags
    if (validationResult.isManualReview || rule.validationType === 'MANUAL_REVIEW') {
      status = 'REVIEW';
      manualVerificationRequired = true;
      reason = validationResult.reason;
    } else if (confidence < 0.75) {
      status = 'REVIEW';
      manualVerificationRequired = true;
      reason = `Declaration detected but OCR confidence is low (${Math.round(confidence * 100)}%). Manual verification required.`;
    } else if (validationResult.isWarning) {
      status = 'REVIEW';
      manualVerificationRequired = true;
      reason = validationResult.reason;
    } else {
      status = 'PASS';
      reason = validationResult.reason;
    }
  }

  return {
    requirementId: rule.id,
    requirementName: rule.name,
    requirement: rule.requirement || rule.name,
    ruleType: rule.requirementType,
    applicability: rule.applicability,
    validationType: rule.validationType,
    category: rule.category,
    severity: rule.severity,
    ruleReference: rule.ruleReference,
    status,
    extractedValue: rawValue,
    value: rawValue, // Phase 2 UI compatibility
    normalizedValue,
    expectedCondition: applicability.applicabilityReason,
    reason,
    confidence,
    confidenceLevel,
    manualVerificationRequired,
    evidence,
    dataKey: rule.dataKey,
  };
}

/**
 * Compute summary stats from checks
 */
function calculateSummaryStats(checks) {
  const applicableChecks = checks.filter(c => c.status !== 'NOT_APPLICABLE');

  return {
    total: checks.length,
    applicable: applicableChecks.length,
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    review: checks.filter(c => c.status === 'REVIEW').length,
    notApplicable: checks.filter(c => c.status === 'NOT_APPLICABLE').length,
    notDetected: checks.filter(c => c.status === 'NOT_DETECTED').length,
  };
}

/**
 * Determine overall screening status (COMPLIANT, NON_COMPLIANT, NEEDS_REVIEW)
 */
function determineOverallComplianceStatus(checks) {
  const applicableChecks = checks.filter(c => c.status !== 'NOT_APPLICABLE');

  const hasHighSeverityFail = applicableChecks.some(c => c.status === 'FAIL' && c.severity === 'HIGH');
  const hasAnyFail = applicableChecks.some(c => c.status === 'FAIL');
  const hasSubstantiveReview = applicableChecks.some(c =>
    c.status === 'REVIEW' &&
    (c.severity === 'HIGH' || c.severity === 'MEDIUM') &&
    (c.confidence < 0.75 || c.manualVerificationRequired)
  );

  if (hasHighSeverityFail || hasAnyFail) {
    return 'NON_COMPLIANT';
  }
  if (hasSubstantiveReview) {
    return 'NEEDS_REVIEW';
  }
  return 'COMPLIANT';
}

/**
 * Classify issues into Critical, Warning, and Review categories
 */
function classifyIssues(checks) {
  const critical = checks.filter(c => c.status === 'FAIL' && c.severity === 'HIGH');
  const warning = checks.filter(c => (c.status === 'FAIL' && c.severity !== 'HIGH') || (c.status === 'REVIEW' && c.confidence >= 0.75));
  const review = checks.filter(c => c.status === 'REVIEW' && (c.confidence < 0.75 || c.manualVerificationRequired));

  return { critical, warning, review };
}

/**
 * Get status color & badge configuration
 */
export function getStatusConfig(status) {
  const configs = {
    PASS: { label: 'Pass', color: 'success', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    FAIL: { label: 'Fail', color: 'error', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    REVIEW: { label: 'Review', color: 'warning', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    NOT_APPLICABLE: { label: 'Not Applicable', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
    NOT_DETECTED: { label: 'Not Detected', color: 'gray', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    COMPLIANT: { label: 'Compliant', color: 'success', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    NON_COMPLIANT: { label: 'Non-Compliant', color: 'error', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    NEEDS_REVIEW: { label: 'Needs Review', color: 'warning', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  };
  return configs[status] ?? configs.NOT_DETECTED;
}
