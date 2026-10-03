// ============================================================
// NetQ Check — Master Products Catalog Page
// Real database query for products with search, category filtering & timeline links
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, History, PlusCircle, Factory, Filter } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { searchProducts } from '../services/repositories/productRepository';
import { getScansByProductId } from '../services/repositories/scanRepository';
import { PRODUCT_CATEGORIES } from '../services/ruleEngine/productCategories';
import { format } from 'date-fns';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const products = searchProducts({
    search: searchTerm,
    categoryId: selectedCategory,
    status: selectedStatus,
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Products Catalog</h1>
          <p className="page-desc">{products.length} registered prepacked commodity products</p>
        </div>
        <Link to="/scan" className="btn btn-primary flex items-center gap-1.5 shadow-sm">
          <PlusCircle className="w-4 h-4" />
          Scan & Register Product
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, brand, manufacturer or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {PRODUCT_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input text-xs font-medium text-slate-700 py-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      {products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">No Products Found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No registered products match your search and filter criteria.'
              : 'The master product database is empty. Perform a scan to auto-register products.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(product => {
            const scans = getScansByProductId(product.productId);
            const totalScans = scans.length || product.totalScans || 0;

            return (
              <div key={product.productId} className="card card-hover flex flex-col justify-between">
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <StatusBadge status={product.latestStatus || 'COMPLIANT'} size="sm" />
                  </div>

                  {/* Info */}
                  <h3 className="font-bold text-slate-900 text-sm mb-0.5 line-clamp-1">{product.productName}</h3>
                  <div className="text-[11px] text-teal-700 font-semibold mb-3">{product.categoryId}</div>

                  <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Manufacturer</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">{product.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Brand</span>
                      <span className="font-medium text-slate-800">{product.brand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Inspections</span>
                      <span className="font-bold text-teal-700 flex items-center gap-1">
                        <History className="w-3 h-3" /> {totalScans} Scan(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Scanned</span>
                      <span className="font-medium text-slate-800">
                        {product.lastScannedAt ? format(new Date(product.lastScannedAt), 'dd MMM yyyy') : 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                  <Link
                    to={`/products/${product.productId}`}
                    className="btn btn-secondary btn-sm flex-1 justify-center text-xs font-semibold text-teal-700 hover:bg-teal-50"
                  >
                    View Timeline
                  </Link>
                  <Link
                    to="/scan"
                    className="btn btn-primary btn-sm flex-1 justify-center text-xs"
                  >
                    New Scan
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
