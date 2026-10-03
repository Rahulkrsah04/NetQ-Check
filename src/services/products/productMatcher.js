// ============================================================
// NetQ Check — Product Matching Engine
// Detects existing product entries based on Name, Brand, Manufacturer & Category
// ============================================================

import { getAllProducts } from '../repositories/productRepository.js';

/**
 * Clean & normalize string for string matching
 */
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculate Jaccard / token overlap similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const tokens1 = new Set(norm1.split(' ').filter(t => t.length > 2));
  const tokens2 = new Set(norm2.split(' ').filter(t => t.length > 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

/**
 * Match incoming scan data against master product repository
 * @param {Object} scanData - Extracted or normalized OCR data
 * @returns {Array<Object>} List of matches sorted by confidence
 */
export function findMatchingProducts(scanData) {
  const allProducts = getAllProducts();
  if (!allProducts || allProducts.length === 0) return [];

  const targetName = scanData.productName || scanData.rawOCRData?.productName || '';
  const targetBrand = scanData.brand || scanData.rawOCRData?.brand || '';
  const targetManufacturer = scanData.manufacturerName || scanData.manufacturer || scanData.rawOCRData?.manufacturer || '';
  const targetCategory = scanData.categoryId || scanData.category || '';

  if (!targetName && !targetBrand && !targetManufacturer) return [];

  const scoredMatches = allProducts.map(product => {
    let nameScore = calculateSimilarity(targetName, product.productName);
    let brandScore = targetBrand && product.brand ? calculateSimilarity(targetBrand, product.brand) : 0;
    let mfrScore = targetManufacturer && product.manufacturer ? calculateSimilarity(targetManufacturer, product.manufacturer) : 0;
    let catMatch = targetCategory && product.categoryId && targetCategory === product.categoryId ? 0.2 : 0;

    // Weighted match confidence score
    const totalConfidence = Math.min(1.0, (nameScore * 0.5) + (brandScore * 0.2) + (mfrScore * 0.2) + catMatch);

    return {
      product,
      confidence: totalConfidence,
      matchReasons: [
        nameScore > 0.6 ? `Product name match (${Math.round(nameScore * 100)}%)` : null,
        brandScore > 0.7 ? `Brand match: ${product.brand}` : null,
        mfrScore > 0.7 ? `Manufacturer match: ${product.manufacturer}` : null,
        catMatch > 0 ? `Category match` : null,
      ].filter(Boolean),
    };
  });

  // Filter items with confidence >= 0.45, sort highest confidence first
  return scoredMatches
    .filter(m => m.confidence >= 0.45)
    .sort((a, b) => b.confidence - a.confidence);
}
