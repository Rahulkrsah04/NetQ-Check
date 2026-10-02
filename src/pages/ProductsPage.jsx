import { Link } from 'react-router-dom';
import { Package, Calendar, ExternalLink, ChevronRight, History } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DEMO_PRODUCTS, DEMO_SCANS } from '../data/mockData';

export default function ProductsPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-desc">{DEMO_PRODUCTS.length} products with scan history</p>
        </div>
        <Link to="/scan" className="btn btn-primary">
          Scan New Product
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DEMO_PRODUCTS.map(product => {
          const scans = DEMO_SCANS.filter(s => s.productId === product.id);
          return (
            <div key={product.id} className="card card-hover flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                <StatusBadge status={product.overallStatus} size="sm" />
              </div>

              {/* Product info */}
              <h3 className="font-semibold text-navy text-sm mb-1">{product.name}</h3>
              <p className="text-xs text-gray-400 mb-3">{product.category}</p>

              <div className="space-y-1.5 text-xs text-gray-600 flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">MRP</span>
                  <span className="font-medium text-navy">{product.mrp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Net Qty</span>
                  <span className="font-medium text-navy">{product.netQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Brand</span>
                  <span className="font-medium text-navy">{product.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Scans</span>
                  <span className="font-medium text-navy flex items-center gap-1">
                    <History className="w-3 h-3" /> {product.scansCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Scan</span>
                  <span className="font-medium text-navy">{product.latestScanDate}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-border flex gap-2">
                <Link
                  to={`/result/${product.latestScanId}`}
                  className="btn btn-secondary btn-sm flex-1 justify-center text-xs"
                  id={`product-view-${product.id}`}
                >
                  Latest Report
                </Link>
                <Link
                  to="/scan"
                  className="btn btn-outline-primary btn-sm flex-1 justify-center text-xs"
                  id={`product-scan-${product.id}`}
                >
                  Rescan
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
