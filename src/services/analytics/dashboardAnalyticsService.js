// ============================================================
// NetQ Check — Dashboard Analytics Engine
// Computes real database-derived stats, compliance trends & issue metrics
// ============================================================

import { getAllProducts } from '../repositories/productRepository.js';
import { getAllScans } from '../repositories/scanRepository.js';
import { getAllAssessments } from '../repositories/assessmentRepository.js';

export function getDashboardMetrics() {
  const products = getAllProducts();
  const scans = getAllScans();
  const assessments = getAllAssessments();

  const totalProducts = products.length;
  const totalInspections = scans.length;

  let compliantCount = 0;
  let nonCompliantCount = 0;
  let needsReviewCount = 0;

  assessments.forEach(asm => {
    if (asm.overallStatus === 'COMPLIANT') compliantCount++;
    else if (asm.overallStatus === 'NON_COMPLIANT') nonCompliantCount++;
    else if (asm.overallStatus === 'NEEDS_REVIEW') needsReviewCount++;
  });

  // Calculate compliance percentage
  const complianceRate = totalInspections > 0
    ? Math.round((compliantCount / totalInspections) * 100)
    : 0;

  // Issue frequency map across checks
  const issueDistributionMap = {};
  assessments.forEach(asm => {
    (asm.checks || []).forEach(chk => {
      if (chk.status === 'FAIL' || chk.status === 'NEEDS_REVIEW') {
        const ruleName = chk.ruleName || 'Other Compliance Rule';
        issueDistributionMap[ruleName] = (issueDistributionMap[ruleName] || 0) + 1;
      }
    });
  });

  const issueDistribution = Object.entries(issueDistributionMap).map(([ruleName, count]) => ({
    ruleName,
    count,
  })).sort((a, b) => b.count - a.count);

  // Category distribution
  const categoryMap = {};
  scans.forEach(s => {
    const cat = s.category || 'GENERAL_PREPACKED';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
    category,
    count,
  }));

  // Recent 5 inspections with product info
  const recentInspections = scans.slice(0, 5).map(scan => {
    const asm = assessments.find(a => String(a.scanId) === String(scan.scanId));
    const prod = products.find(p => String(p.productId) === String(scan.productId));
    return {
      ...scan,
      productName: prod?.productName || scan.normalizedData?.productName || scan.rawOCRData?.productName || 'Unlabeled Package',
      assessmentStatus: asm?.overallStatus || scan.status,
    };
  });

  return {
    totalProducts,
    totalInspections,
    compliantCount,
    nonCompliantCount,
    needsReviewCount,
    complianceRate,
    issueDistribution,
    categoryDistribution,
    recentInspections,
    isEmpty: totalInspections === 0,
  };
}
