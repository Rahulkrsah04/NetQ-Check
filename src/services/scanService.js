// ============================================================
// NetQ Check — Scan & Data Repository Service
// Cleanly separates demo/mock data from real database queries.
// When integrating a real backend (Firebase, Supabase, or REST API),
// replace mock calls with database queries without touching UI logic.
// ============================================================

import { DEMO_SCANS, DEMO_PRODUCTS, DEMO_EXTRACTED_DATA, DEMO_COMPLIANCE_RESULTS, DEMO_STATS } from '../data/mockData';

// Toggle this flag or set via env variable when real DB is connected
const USE_REAL_DATABASE = import.meta.env.VITE_USE_REAL_DB === 'true';

/**
 * Fetch recent scans
 * @returns {Promise<Array>}
 */
export async function getRecentScans() {
  if (USE_REAL_DATABASE) {
    // Example DB implementation:
    // const { data, error } = await supabase.from('scans').select('*').order('scan_date', { ascending: false });
    // if (error) throw error;
    // return data;
    throw new Error('Real DB integration not configured yet. Set VITE_USE_REAL_DB=false');
  }
  
  // Return demo dataset asynchronously simulating network latency
  return Promise.resolve(DEMO_SCANS);
}

/**
 * Fetch scan by ID
 * @param {string} scanId 
 * @returns {Promise<Object|null>}
 */
export async function getScanById(scanId) {
  if (USE_REAL_DATABASE) {
    // const { data } = await supabase.from('scans').select('*').eq('id', scanId).single();
    // return data;
  }
  
  const scan = DEMO_SCANS.find(s => s.id === scanId) || null;
  const extractedData = DEMO_EXTRACTED_DATA[scanId] || null;
  const complianceResults = DEMO_COMPLIANCE_RESULTS[scanId] || null;

  return Promise.resolve({
    scan,
    extractedData,
    complianceResults,
  });
}

/**
 * Save new scan record
 * @param {Object} scanPayload 
 * @returns {Promise<Object>}
 */
export async function saveScanRecord(scanPayload) {
  if (USE_REAL_DATABASE) {
    // const { data, error } = await supabase.from('scans').insert(scanPayload).select().single();
    // return data;
  }

  // Demo fallback — creates temporary mock record
  const newScan = {
    id: `scan_${Date.now()}`,
    productId: scanPayload.productId || `prod_${Date.now()}`,
    productName: scanPayload.productName || 'Scanned Item',
    scanDate: new Date().toISOString(),
    mrp: scanPayload.extractedData?.mrp?.value || 'N/A',
    overallStatus: scanPayload.complianceResult?.overallStatus || 'NEEDS_REVIEW',
    issueCount: scanPayload.complianceResult?.summary?.fail + scanPayload.complianceResult?.summary?.review || 0,
    passCount: scanPayload.complianceResult?.summary?.pass || 0,
    failCount: scanPayload.complianceResult?.summary?.fail || 0,
    reviewCount: scanPayload.complianceResult?.summary?.review || 0,
    imageUrl: scanPayload.imageUrl || null,
  };

  return Promise.resolve(newScan);
}

/**
 * Fetch overall statistics
 * @returns {Promise<Object>}
 */
export async function getComplianceStats() {
  if (USE_REAL_DATABASE) {
    // Real DB query logic here
  }
  return Promise.resolve(DEMO_STATS);
}
