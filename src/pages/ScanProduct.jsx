import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Info, AlertCircle, CheckCircle, Edit3, PlayCircle, ArrowRight, Layers, Sparkles, PackageCheck, PlusCircle, Trash2, QrCode, ShieldAlert, AlertTriangle } from 'lucide-react';
import { UploadBox, CaptureBox } from '../components/ui/UploadBox';
import { ProgressStepper, ConfidenceBar } from '../components/ui/ProgressStepper';
import Button from '../components/ui/Button';
import ImageGallery from '../components/evidence/ImageGallery';
import { useOCR } from '../hooks/useOCR';
import { PRODUCT_CATEGORIES, detectCategoryFromText } from '../services/ruleEngine/productCategories';
import { findMatchingProducts } from '../services/products/productMatcher';
import { analyzeImageQuality } from '../services/imageProcessing/imageQualityAnalyzer';
import { preprocessImage } from '../services/imageProcessing/imagePreprocessor';
import { detectBarcodes } from '../services/barcode/barcodeService';
import { fuseMultiImageScan } from '../services/inspection/dataFusionService';
import { attachVisualEvidence, calculateEvidenceCoverage } from '../services/evidence/evidenceMapperService';
import { saveProduct } from '../services/repositories/productRepository';
import { createScan } from '../services/repositories/scanRepository';
import { saveAssessment } from '../services/repositories/assessmentRepository';
import { saveEvidenceItems } from '../services/repositories/evidenceRepository';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PROCESS_STEPS = [
  'Upload Validation',
  'Image Quality Analysis',
  'Image Preprocessing',
  'OCR Extraction',
  'Declaration Detection',
  'Barcode / QR Detection',
  'Data Fusion',
  'Compliance Assessment',
];

const DEMO_SAMPLES = [
  { id: 'sample-rice', label: 'Compliant: ABC Rice', file: 'rice_label.png', category: 'FOOD_GROCERY', bg: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'sample-soap', label: 'Non-Compliant: FreshGlow Soap', file: 'soap_label.png', category: 'COSMETICS', bg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'sample-oil', label: 'Needs Review: SunPure Oil', file: 'oil_label.png', category: 'FOOD_GROCERY', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'sample-conflict', label: 'Scenario 4: Conflicting MRP (Front: ₹120 vs Back: ₹125)', file: 'conflict_mrp_label.png', category: 'FOOD_GROCERY', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
];

const FIELD_LABELS = {
  productName: 'Product Name',
  netQuantity: 'Net Quantity',
  mrp: 'MRP',
  manufacturer: 'Manufacturer / Packer',
  manufactureDate: 'Manufacturing Date',
  expiryDate: 'Best Before / Expiry Date',
  consumerCare: 'Consumer Care Details',
  countryOfOrigin: 'Country of Origin',
  unitSalePrice: 'Unit Sale Price (USP)',
};

const LABEL_TYPES = ['Front Label', 'Back Label', 'Side Label', 'Top / Bottom', 'Other'];

export default function ScanProduct() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'capture'
  const [labelImages, setLabelImages] = useState([]); // List of image objects
  const [nextImageType, setNextImageType] = useState('Front Label');
  const [editedData, setEditedData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('GENERAL_PACKAGED');
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [fusionResult, setFusionResult] = useState(null);
  const [qualityWarnings, setQualityWarnings] = useState([]);
  const [barcodeResults, setBarcodeResults] = useState([]);

  const { processing, ocrResult, error, stage, startScan, runCompliance, reset } = useOCR();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAddImage = useCallback(async (file, imageType = nextImageType, isDemoPreset = false) => {
    const preview = URL.createObjectURL(file);
    const quality = await analyzeImageQuality(file);

    const imageObj = {
      imageId: `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      imageType,
      preview,
      url: preview,
      quality,
      qualityScore: quality.score,
      qualityStatus: quality.quality,
      createdAt: new Date().toISOString(),
      isDemoPreset: isDemoPreset,
    };

    setLabelImages(prev => [...prev, imageObj]);
    if (quality.warning) {
      setQualityWarnings(prev => [...prev, `${imageType}: ${quality.warning}`]);
    }
    toast.success(`Added ${imageType} (${quality.quality} quality)`);
  }, [nextImageType]);

  const handleSelectPreset = (sample) => {
    const dummyFile = new File(['sample content'], sample.file, { type: 'image/png' });
    if (sample.category) {
      setSelectedCategory(sample.category);
    }
    setLabelImages([]);
    setQualityWarnings([]);
    handleAddImage(dummyFile, 'Front Label', true);
    if (sample.id === 'sample-conflict') {
      // Add secondary back label for conflict simulation
      const backFile = new File(['sample back content'], 'conflict_back_label.png', { type: 'image/png' });
      handleAddImage(backFile, 'Back Label', true);
    }
    toast.success(`Loaded sample: ${sample.label}`);
  };

  const handleRemoveImage = (idOrIdx) => {
    setLabelImages(prev => prev.filter((img, idx) => img.imageId !== idOrIdx && idx !== idOrIdx));
    toast.success('Label image removed');
  };

  const handleClear = () => {
    setLabelImages([]);
    setEditedData({});
    setSelectedCategory('GENERAL_PACKAGED');
    setMatchedProducts([]);
    setSelectedProductId(null);
    setIsCreatingNewProduct(false);
    setAnalysisProgress(null);
    setFusionResult(null);
    setQualityWarnings([]);
    setBarcodeResults([]);
    reset();
  };

  const handleAnalyze = async () => {
    if (labelImages.length === 0) {
      toast.error('Please upload or capture at least one product label image.');
      return;
    }

    setQualityWarnings([]);
    setBarcodeResults([]);

    const multiScanData = [];

    // Run 8-step visual analysis pipeline
    for (let i = 0; i < PROCESS_STEPS.length; i++) {
      setAnalysisProgress({ stepIndex: i, stepName: PROCESS_STEPS[i] });
      await new Promise(r => setTimeout(r, 200));
    }

    // Process each image through OCR, Barcode & Quality
    for (const img of labelImages) {
      const res = await startScan(img.file, img.isDemoPreset || false);

      // Preprocessing
      await preprocessImage(img.file);

      // Barcode detection
      const bc = await detectBarcodes(img.file, img.imageId);
      setBarcodeResults(prev => [...prev, bc]);

      let extracted = res?.extractedData || {};

      // Handle Scenario 4 Conflict simulation if sample-conflict preset
      if (img.fileName?.includes('conflict_back') && img.isDemoPreset) {
        extracted = {
          ...extracted,
          mrp: { value: '₹125', confidence: 0.95 },
        };
      }

      multiScanData.push({
        imageId: img.imageId,
        imageType: img.imageType,
        extractedData: extracted,
        rawOCRData: res?.rawOCRData,
      });
    }

    // Data Fusion across images
    const fused = fuseMultiImageScan(multiScanData);
    setFusionResult(fused);

    if (fused.hasConflicts) {
      toast.error('CONFLICT DETECTED: Conflicting MRP values found across Front & Back labels!', { duration: 5000 });
    }

    // Match existing products if productName extracted
    const primaryName = fused.unifiedData?.productName?.value;
    if (primaryName) {
      const matches = findMatchingProducts({
        productName: primaryName,
        categoryId: selectedCategory,
      });
      setMatchedProducts(matches);
      if (matches.length > 0) {
        setSelectedProductId(matches[0].product.productId);
      }
    }
  };

  const handleAutoDetectCategory = () => {
    const productName = editedData?.productName?.value || fusionResult?.unifiedData?.productName?.value || '';
    const detected = detectCategoryFromText(productName, productName);
    setSelectedCategory(detected.id);
    toast.success(`Auto-detected Category: ${detected.name}`);
  };

  const handleFieldEdit = (key, val) => {
    setEditedData(prev => ({
      ...prev,
      [key]: { value: val, confidence: prev[key]?.confidence ?? 0.5 },
    }));
  };

  const handleRunCompliance = () => {
    const finalData = {};
    const fused = fusionResult?.unifiedData || ocrResult?.extractedData || {};

    Object.keys(FIELD_LABELS).forEach(key => {
      finalData[key] = editedData[key] ?? fused[key] ?? { value: null, confidence: 0 };
    });

    const result = runCompliance(finalData, selectedCategory);

    if (fusionResult?.hasConflicts) {
      result.overallStatus = 'NEEDS_REVIEW';
      result.issues = {
        ...(result.issues || {}),
        review: [
          ...(result.issues?.review || []),
          'CONFLICT DETECTED: Conflicting values extracted across Front & Back labels. Manual Verification Required.',
        ],
      };
    }

    // Map visual evidence & Calculate Evidence Coverage
    const mappedWithEvidence = attachVisualEvidence(finalData, labelImages);
    const coverage = calculateEvidenceCoverage(result.checks || result.results);

    // Save Master Product
    let activeProduct = null;
    if (selectedProductId && !isCreatingNewProduct) {
      activeProduct = saveProduct({
        productId: selectedProductId,
        lastScannedAt: new Date().toISOString(),
        latestStatus: result.overallStatus,
        incrementScanCount: true,
      }, user);
    } else {
      activeProduct = saveProduct({
        productName: finalData.productName?.value || 'New Packaged Commodity',
        categoryId: selectedCategory,
        manufacturer: finalData.manufacturer?.value || 'Unknown Manufacturer',
        brand: finalData.productName?.value?.split(' ')[0] || 'Generic',
        image: labelImages[0]?.preview,
        latestStatus: result.overallStatus,
        incrementScanCount: true,
      }, user);
    }

    // Save Scan Record
    const scanRecord = createScan({
      productId: activeProduct.productId,
      images: labelImages.map(img => img.preview),
      rawOCRData: { text: ocrResult?.rawText || 'Multi-Image Fusion OCR' },
      normalizedData: mappedWithEvidence,
      category: selectedCategory,
      status: result.overallStatus,
      ruleSetVersion: result.ruleSetVersion || 'PC_RULES_2011_V1',
      engineVersion: result.engineVersion || '3.0.0',
    }, user);

    // Save Assessment Record
    const assessmentRecord = saveAssessment({
      scanId: scanRecord.scanId,
      productId: activeProduct.productId,
      overallStatus: result.overallStatus,
      summary: {
        ...(result.summary || {}),
        evidenceCoverage: coverage.coveragePercentage,
      },
      checks: result.checks || result.results,
      issues: result.issues || [],
      reviewItems: result.reviewItems || [],
      ruleSetVersion: result.ruleSetVersion || 'PC_RULES_2011_V1',
      engineVersion: result.engineVersion || '3.0.0',
    }, user);

    // Save Field Evidence Items
    const evidenceList = Object.entries(mappedWithEvidence).map(([field, val]) => ({
      field,
      rawValue: val.value || '',
      normalizedValue: val.normalizedValue || val.value || '',
      confidence: val.confidence || 0,
      source: val.evidence?.sourceLabel || 'OCR_VISION',
      imageRegion: val.evidence?.boundingBox || { x: 15, y: 15, width: 60, height: 15 },
    }));
    saveEvidenceItems(scanRecord.scanId, evidenceList);

    toast.success('Visual Inspection assessment persisted!');

    // Navigate to assessment result view
    navigate(`/result/${assessmentRecord.assessmentId}`, {
      state: {
        extractedData: mappedWithEvidence,
        complianceResult: {
          ...result,
          assessmentId: assessmentRecord.assessmentId,
          scanId: scanRecord.scanId,
          productId: activeProduct.productId,
          evidenceCoverage: coverage.coveragePercentage,
          fusionResult,
        },
        imageUrl: labelImages[0]?.preview,
        categoryId: selectedCategory,
        labelImages,
      },
    });
  };

  return (
    <div className="max-w-4xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Advanced Visual Product Inspection</h1>
          <p className="page-desc">Upload multiple label images (Front, Back, Side) for OCR extraction, visual evidence mapping & conflict detection.</p>
        </div>
      </div>

      {/* Quick Test Demo Samples */}
      {stage === 'idle' && labelImages.length === 0 && (
        <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-primary" />
              Quick Test Demo Scenarios (Phase 5 Visual Evidence):
            </span>
            <span className="text-[11px] text-gray-500">Click any preset to test demo scenarios</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_SAMPLES.map(sample => (
              <button
                key={sample.id}
                onClick={() => handleSelectPreset(sample)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:scale-[1.02] ${sample.bg}`}
              >
                + {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload & Multi-Image Section */}
      {(stage === 'idle' || stage === 'processing') && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-navy flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Add Label Images ({labelImages.length} Uploaded)
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Label Type:</span>
              <select
                value={nextImageType}
                onChange={e => setNextImageType(e.target.value)}
                className="form-input text-xs font-semibold text-navy py-1 px-2.5 bg-white border-border"
              >
                {LABEL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === 'upload' ? (
              <UploadBox
                onFileSelect={(file) => handleAddImage(file, nextImageType, false)}
                error={error}
              />
            ) : (
              <CaptureBox onFileSelect={(file) => handleAddImage(file, nextImageType, false)} />
            )}

            {/* Uploaded Gallery */}
            <ImageGallery
              images={labelImages}
              onRemove={handleRemoveImage}
            />
          </div>

          {/* Quality Warning Notifications */}
          {qualityWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Image Quality Notice
              </div>
              {qualityWarnings.map((w, i) => (
                <div key={i} className="text-[11px] opacity-90">{w}</div>
              ))}
            </div>
          )}

          {labelImages.length > 0 && stage !== 'processing' && (
            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                id="analyze-product-btn"
                variant="primary"
                size="lg"
                icon={PlayCircle}
                onClick={handleAnalyze}
                loading={processing}
                className="shadow-sm"
              >
                Start Visual Inspection Analysis ({labelImages.length} Label Images)
              </Button>
            </div>
          )}

          {/* Processing 8-Step Progress */}
          {stage === 'processing' && analysisProgress && (
            <div className="p-4 bg-gray-50 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-navy mb-4">Running Visual Inspection Analysis…</h3>
              <ProgressStepper
                steps={PROCESS_STEPS}
                currentStep={analysisProgress.stepIndex}
              />
            </div>
          )}
        </div>
      )}

      {/* Inspection Results Review & Conflict Warning */}
      {(stage === 'review' || stage === 'done') && (fusionResult || ocrResult) && (
        <div className="space-y-4">
          {/* CONFLICT DETECTED ALERT BANNER */}
          {fusionResult?.hasConflicts && (
            <div className="card bg-red-50 border-2 border-red-400 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-950 flex items-center gap-2">
                    CONFLICT DETECTED ACROSS LABEL IMAGES
                    <span className="text-[11px] bg-red-200 text-red-900 font-semibold px-2 py-0.5 rounded-full">
                      Manual Verification Required
                    </span>
                  </h3>
                  <p className="text-xs text-red-800 mt-1">
                    Different values were extracted for mandatory declarations between Front and Back labels. This assessment will be set to <strong>NEEDS REVIEW</strong>.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded border border-red-200 space-y-1">
                    {fusionResult.conflicts.map((c, i) => (
                      <div key={i} className="text-red-900 font-bold">
                        • {c.fieldLabel}: {c.occurrences.map(o => `${o.imageLabel}: ${o.value}`).join(' vs ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXISTING PRODUCT DETECTION PROMPT */}
          {matchedProducts.length > 0 && (
            <div className="card bg-amber-50/60 border-2 border-amber-300 p-4">
              <div className="flex items-start gap-3">
                <PackageCheck className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    Existing product detected in master catalog
                  </h3>
                  <div className="mt-2 space-y-2">
                    {matchedProducts.map(({ product }) => (
                      <div key={product.productId} className="p-3 bg-white rounded-lg border text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold">{product.productName}</div>
                          <div className="text-[11px] text-slate-500">Mfr: {product.manufacturer}</div>
                        </div>
                        <button
                          onClick={() => setSelectedProductId(product.productId)}
                          className="px-3 py-1.5 bg-teal-700 text-white rounded text-xs font-semibold"
                        >
                          Use Existing Product
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Declaration Table */}
          <div className="card">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="section-title text-base">Fused Product Declaration Data</h2>
                <p className="section-subtitle">Multi-image unified declaration extracted values and visual evidence mapping.</p>
              </div>
              <Button variant="secondary" size="sm" icon={Camera} onClick={handleClear}>
                Scan New Commodity
              </Button>
            </div>

            <div className="divide-y divide-border">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const fieldVal = fusionResult?.unifiedData?.[key] || ocrResult?.extractedData?.[key];
                const editedVal = editedData[key];
                const displayVal = editedVal?.value ?? fieldVal?.value ?? '';
                const conf = editedVal?.confidence ?? fieldVal?.confidence ?? 0;
                const isConflict = fieldVal?.conflictDetected || false;
                const remarks = fieldVal?.remarks || (displayVal ? 'Extracted from label' : 'NOT_DETECTED — Manual Verification Required');

                return (
                  <div key={key} className={`py-3 grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center ${isConflict ? 'bg-red-50/50 p-2 rounded' : ''}`}>
                    <div className="sm:col-span-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        className={`form-input text-sm ${isConflict ? 'border-red-400 bg-red-50 text-red-900 font-bold' : ''} ${!displayVal ? 'border-amber-300 bg-amber-50/50 text-amber-900' : ''}`}
                        value={displayVal}
                        placeholder={remarks}
                        onChange={e => handleFieldEdit(key, e.target.value)}
                      />
                      {!displayVal && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {remarks}
                        </div>
                      )}
                      {isConflict && (
                        <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                          Conflict Detected ({fieldVal.conflictingValues?.join(' vs ')})
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      {conf > 0 ? (
                        <ConfidenceBar confidence={conf} />
                      ) : (
                        <span className="text-xs text-amber-700 font-semibold">NOT_DETECTED (0%)</span>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      {isConflict ? (
                        <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Conflict
                        </span>
                      ) : conf > 0 ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified ({Math.round(conf * 100)}%)
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Not Detected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-border flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleClear}>Cancel</Button>
              <Button
                id="run-compliance-btn"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconRight
                onClick={handleRunCompliance}
              >
                Confirm & Evaluate Compliance
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
