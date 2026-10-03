// ============================================================
// NetQ Check — Product Repository
// Persistence and querying for master product catalog
// ============================================================

import { StorageAdapter } from './storageAdapter.js';
import { recordAuditLog } from '../audit/auditService.js';

export const SEED_PRODUCTS = [
  {
    productId: 'PRD-FOOD-001',
    productName: 'Aashirvaad Whole Wheat Atta 5kg',
    genericName: 'Wheat Flour / Atta',
    categoryId: 'PACKAGED_FOOD',
    manufacturer: 'ITC Limited',
    brand: 'Aashirvaad',
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastScannedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalScans: 2,
    latestStatus: 'COMPLIANT',
  },
  {
    productId: 'PRD-MILK-002',
    productName: 'Amul Gold Standardized Milk 1L',
    genericName: 'Pasteurised Milk',
    categoryId: 'MILK_DAIRY',
    manufacturer: 'Gujarat Cooperative Milk Marketing Federation Ltd (GCMMF)',
    brand: 'Amul',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastScannedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    totalScans: 1,
    latestStatus: 'NEEDS_REVIEW',
  },
  {
    productId: 'PRD-COSM-003',
    productName: 'Nivea Soft Light Moisturiser 100ml',
    genericName: 'Moisturising Cream',
    categoryId: 'COSMETICS',
    manufacturer: 'Beiersdorf India Pvt Ltd',
    brand: 'Nivea',
    image: 'https://images.unsplash.com/photo-1608248597263-0057e57b4524?w=400&q=80',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastScannedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    totalScans: 1,
    latestStatus: 'NON_COMPLIANT',
  },
];

const adapter = new StorageAdapter('products', SEED_PRODUCTS);

export function getAllProducts() {
  return adapter.getAll();
}

export function getProductById(productId) {
  return adapter.getById('productId', productId);
}

export function saveProduct(productData, user = null) {
  const existing = productData.productId ? getProductById(productData.productId) : null;
  
  const id = productData.productId || `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const productToSave = {
    productId: id,
    productName: productData.productName || 'Unknown Product',
    genericName: productData.genericName || productData.productName || 'General Commodity',
    categoryId: productData.categoryId || 'GENERAL_PREPACKED',
    manufacturer: productData.manufacturer || 'Unknown Manufacturer',
    brand: productData.brand || 'Unbranded',
    image: productData.image || null,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastScannedAt: productData.lastScannedAt || new Date().toISOString(),
    totalScans: (existing?.totalScans || 0) + (productData.incrementScanCount ? 1 : 0),
    latestStatus: productData.latestStatus || existing?.latestStatus || 'PENDING',
  };

  const saved = adapter.save(productToSave, 'productId');

  const action = existing ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED';
  recordAuditLog(action, 'PRODUCT', saved.productId, {
    productName: saved.productName,
    categoryId: saved.categoryId,
    manufacturer: saved.manufacturer,
  }, user);

  return saved;
}

export function searchProducts({ search = '', categoryId = 'ALL', status = 'ALL' }) {
  let products = getAllProducts();

  if (categoryId !== 'ALL') {
    products = products.filter(p => p.categoryId === categoryId);
  }
  if (status !== 'ALL') {
    products = products.filter(p => p.latestStatus === status);
  }
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      p =>
        p.productName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.manufacturer.toLowerCase().includes(q) ||
        p.productId.toLowerCase().includes(q) ||
        (p.genericName && p.genericName.toLowerCase().includes(q))
    );
  }

  return products;
}

export function updateProductStatus(productId, latestStatus, lastScannedAt = new Date().toISOString()) {
  const existing = getProductById(productId);
  if (!existing) return null;

  return saveProduct({
    ...existing,
    latestStatus,
    lastScannedAt,
    totalScans: (existing.totalScans || 0) + 1,
  });
}
