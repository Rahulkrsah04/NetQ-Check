import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Info, AlertCircle, CheckCircle, Edit3, PlayCircle, ArrowRight, Layers, Sparkles, PackageCheck, PlusCircle, Trash2, QrCode, ShieldAlert, AlertTriangle } from 'lucide-react';
import { UploadBox, CaptureBox } from '../components/ui/UploadBox';
import LiveCameraScanner from '../components/camera/LiveCameraScanner';
import { ProgressStepper, ConfidenceBar } from '../components/ui/ProgressStepper';
import Button from '../components/ui/Button';
import ImageGallery from '../components/evidence/ImageGallery';
import { useOCR } from '../hooks/useOCR';
import { PRODUCT_CATEGORIES, detectCategoryFromText } from '../services/ruleEngine/productCategories';
import { findMatchingProducts } from '../services/products/productMatcher';
import { analyzeImageQuality } from '../services/imageProcessing/imageQualityAnalyzer';
import { preprocessImage, evaluateOcrSharpenRetry, rotateImageFile } from '../services/imageProcessing/imagePreprocessor';
import { detectBarcodes } from '../services/barcode/barcodeService';
import { fuseMultiImageScan } from '../services/inspection/dataFusionService';
import { attachVisualEvidence, calculateEvidenceCoverage } from '../services/evidence/evidenceMapperService';
import {
  saveActiveScanSession,
  loadActiveScanSession,
  clearActiveScanSession,
  createSerializableImageThumbnail,
} from '../services/inspection/scanSessionService';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [combinedRawText, setCombinedRawText] = useState('');

  const { processing, ocrResult, error, stage, startScan, runCompliance, reset } = useOCR();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAddImage = useCallback(async (file, imageType = nextImageType, isDemoPreset = false) => {
    const preview = URL.createObjectURL(file);
    const quality = await analyzeImageQuality(file);
    const previewDataUrl = await createSerializableImageThumbnail(file, 600, 0.75);

    const imageObj = {
      imageId: `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      imageType,
      preview,
      previewDataUrl: previewDataUrl || preview,
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
    return imageObj;
  }, [nextImageType]);

  // Restore active scan session from sessionStorage on mount (BUG-01)
  useEffect(() => {
    const saved = loadActiveScanSession();
    if (saved && Array.isArray(saved.labelImages) && saved.labelImages.length > 0) {
      setLabelImages(saved.labelImages);
      if (saved.fusionResult) setFusionResult(saved.fusionResult);
      if (saved.editedData) setEditedData(saved.editedData);
      if (saved.selectedCategory) setSelectedCategory(saved.selectedCategory);
      if (saved.combinedRawText) setCombinedRawText(saved.combinedRawText);
      if (saved.qualityWarnings) setQualityWarnings(saved.qualityWarnings);
      if (saved.barcodeResults) setBarcodeResults(saved.barcodeResults);
      toast.success('Restored active inspection session', { id: 'session-restore' });
    }
  }, []);

  // Sync active scan session to sessionStorage whenever state updates
  useEffect(() => {
    if (labelImages.length > 0) {
      saveActiveScanSession({
        labelImages,
        fusionResult,
        editedData,
        selectedCategory,
        combinedRawText,
        qualityWarnings,
        barcodeResults,
      });
    }
  }, [labelImages, fusionResult, editedData, selectedCategory, combinedRawText, qualityWarnings, barcodeResults]);

  const handleInstantScanFromCamera = async (file, imageType) => {
    const preview = URL.createObjectURL(file);
    const quality = await analyzeImageQuality(file);
    const previewDataUrl = await createSerializableImageThumbnail(file, 600, 0.75);

    const imageObj = {
      imageId: `IMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      imageType: imageType || nextImageType,
      preview,
      previewDataUrl: previewDataUrl || preview,
      url: preview,
      quality,
      qualityScore: quality.score,
      qualityStatus: quality.quality,
      createdAt: new Date().toISOString(),
      isDemoPreset: false,
    };

    const nextList = [...labelImages, imageObj];
    setLabelImages(nextList);
    toast.success(`Captured ${imageObj.imageType} — starting instant scan!`);
    await handleAnalyze(nextList);
  };

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

  const handleRotateImage = async (idOrIdx) => {
    const targetIdx = labelImages.findIndex((img, idx) => img.imageId === idOrIdx || idx === idOrIdx);
    if (targetIdx === -1) return;
    const target = labelImages[targetIdx];
    if (target.isDemoPreset || !target.file) return;

    try {
      const rotated = await rotateImageFile(target.file, 90);
      if (!rotated) return;
      if (target.preview && target.preview.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.preview); } catch (_) {}
      }
      setLabelImages(prev =>
        prev.map((item, idx) =>
          idx === targetIdx
            ? { ...item, file: rotated.file, preview: rotated.preview, url: rotated.preview }
            : item
        )
      );
      toast.success(`Rotated ${target.imageType} 90°`);
    } catch {
      toast.error('Could not rotate image');
    }
  };

  const handleClear = () => {
    clearActiveScanSession();
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
    setIsAnalyzing(false);
    setCombinedRawText('');
    reset();
  };

  const handleAnalyze = async (overrideImages = null) => {
    const imagesToProcess = (Array.isArray(overrideImages) && overrideImages.length > 0)
      ? overrideImages
      : labelImages;

    if (imagesToProcess.length === 0) {
      toast.error('Please upload or capture at least one product label image.');
      return;
    }

    setQualityWarnings([]);
    setBarcodeResults([]);
    setIsAnalyzing(true);
    setCombinedRawText('');

    try {
      const multiScanData = [];
      const rawTextSegments = [];

      // Run visual analysis progress stepper
      for (let i = 0; i < PROCESS_STEPS.length; i++) {
        setAnalysisProgress({ stepIndex: i, stepName: PROCESS_STEPS[i] });
        await new Promise(r => setTimeout(r, 150));
      }

      // Process each image through Orientation-Aware Multi-Variant Preprocessing, OCR, Barcode & Quality
      for (const img of imagesToProcess) {
        const imgMeta = {
          imageId: img.imageId,
          imageType: img.imageType,
          fileName: img.fileName,
        };

        const isBlurry = img.quality?.metrics?.blurScore < 70 ||
          img.quality?.metrics?.laplacianVariance < 90 ||
          (Array.isArray(img.quality?.flags) && img.quality.flags.some(f => typeof f === 'string' && f.toLowerCase().includes('blur')));

        let res = await startScan(img.file, img.isDemoPreset || false, imgMeta);

        // 3. OCR Sharpening Retry Pass (BUG-02):
        // If image was blurry or important declarations were missing and first pass wasn't sharpened,
        // evaluate a sharpened image pass and compare field-by-field.
        if (!img.isDemoPreset && res?.success) {
          const criticalMissing = !res.extractedData?.mrp?.value ||
            !res.extractedData?.netQuantity?.value ||
            !res.extractedData?.manufacturer?.value;
          const lowConfidence = (res.extractedData?.productName?.confidence || 1) < 0.65;

          if ((isBlurry || lowConfidence || criticalMissing) && !preprocessedInfo?.metadata?.isSharpened) {
            try {
              const sharpenedPrep = await preprocessImage(img.file, {
                grayscale: true,
                contrastEnhance: true,
                sharpen: true,
                sharpenStrength: 0.85,
              });

              if (sharpenedPrep?.processedBlob) {
                const retryRes = await startScan(sharpenedPrep.processedBlob, false, imgMeta);
                if (retryRes?.success) {
                  res = evaluateOcrSharpenRetry(res, retryRes);
                }
              }
            } catch (retryErr) {
              console.warn('Sharpened OCR retry pass skipped:', retryErr);
            }
          }
        }

        if (res?.rawText && res.rawText.trim()) {
          const rotNote = res.appliedRotation ? ` (Auto-rotated ${res.appliedRotation}°)` : '';
          rawTextSegments.push(`[${img.imageType} — ${img.fileName}${rotNote}]\n${res.rawText.trim()}`);
        }

        // 3. Barcode detection (genuine browser BarcodeDetector with demo fallback)
        const bc = await detectBarcodes(img.file, img.imageId, { isDemoPreset: img.isDemoPreset });
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

      const joinedRawText = rawTextSegments.join('\n\n');
      setCombinedRawText(joinedRawText);

      // Data Fusion across images
      const fused = fuseMultiImageScan(multiScanData);
      setFusionResult(fused);

      if (fused.hasConflicts) {
        const conflictFields = fused.conflicts.map(c => c.fieldLabel).join(', ');
        toast.error(`CONFLICT DETECTED: Conflicting ${conflictFields} found across label images!`, { duration: 5000 });
      }

      const primaryName = fused.unifiedData?.productName?.value || '';

      // Auto-detect commodity category from extracted text when using default category
      if (selectedCategory === 'GENERAL_PACKAGED' && !labelImages.some(img => img.isDemoPreset)) {
        const detectedCat = detectCategoryFromText(joinedRawText, primaryName);
        if (detectedCat?.id) {
          setSelectedCategory(detectedCat.id);
        }
      }

      // Match existing products if productName extracted
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoDetectCategory = () => {
    const productName = editedData?.productName?.value || fusionResult?.unifiedData?.productName?.value || '';
    const detected = detectCategoryFromText(combinedRawText || productName, productName);
    setSelectedCategory(detected.id);
    toast.success(`Auto-detected Category: ${detected.name}`);
  };

  const handleFieldEdit = (key, val) => {
    const baseField = fusionResult?.unifiedData?.[key] || ocrResult?.extractedData?.[key] || {};
    setEditedData(prev => ({
      ...prev,
      [key]: {
        ...baseField,
        value: val,
        confidence: val && val.trim() ? Math.max(baseField.confidence || 0.85, 0.85) : 0,
        manualVerificationRequired: false,
      },
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
        image: labelImages[0]?.previewDataUrl || labelImages[0]?.preview,
        latestStatus: result.overallStatus,
        incrementScanCount: true,
      }, user);
    }

    // Save Scan Record (uses persistent Base64 previewDataUrls so history thumbnails never break)
    const scanRecord = createScan({
      productId: activeProduct.productId,
      images: (imagesToProcess || labelImages).map(img => img.previewDataUrl || img.preview),
      rawOCRData: { text: combinedRawText || ocrResult?.rawText || 'Multi-Image Fusion OCR' },
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
      imageId: val.evidence?.imageId || val.sourceImageId || null,
      imageRegion: val.evidence?.boundingBox || null,
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
        imageUrl: imagesToProcess[0]?.preview,
        categoryId: selectedCategory,
        labelImages: imagesToProcess,
      },
    });
  };

  const activeFusedData = fusionResult?.unifiedData || ocrResult?.extractedData || {};
  const hasGenuineDeclarations = Object.entries(activeFusedData).some(([k, v]) =>
    ['productName', 'mrp', 'netQuantity', 'manufacturer'].includes(k) &&
    v?.value &&
    v?.confidence >= 0.70 &&
    v?.status !== 'NOT_DETECTED'
  );

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
      {(stage === 'idle' || stage === 'processing' || isAnalyzing) && (
        <div className="card space-y-5">
          {/* Input Method Toggle Tabs */}
          <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="tab-upload-images"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Images
              </button>

              <button
                type="button"
                id="tab-camera-scanner"
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'camera'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Live Camera Scanner</span>
                <span className="text-[10px] tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 font-extrabold uppercase">
                  Counter Scan
                </span>
              </button>
            </div>

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

          {activeTab === 'upload' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadBox
                onFileSelect={(file) => handleAddImage(file, nextImageType, false)}
                error={error}
              />

              {/* Uploaded Gallery */}
              <ImageGallery
                images={labelImages}
                onRemove={handleRemoveImage}
                onRotate={handleRotateImage}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <LiveCameraScanner
                initialLabelType={nextImageType}
                onCapture={(file, type, instant) => {
                  if (!instant) {
                    handleAddImage(file, type, false);
                  }
                }}
                onInstantScan={handleInstantScanFromCamera}
                onClose={() => setActiveTab('upload')}
                autoScanAvailable={!isAnalyzing && stage !== 'processing'}
              />

              {/* Uploaded Gallery below camera */}
              {labelImages.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-700 mb-2">Captured / Uploaded Labels ({labelImages.length}):</h3>
                  <ImageGallery
                    images={labelImages}
                    onRemove={handleRemoveImage}
                    onRotate={handleRotateImage}
                  />
                </div>
              )}
            </div>
          )}

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

          {labelImages.length > 0 && stage !== 'processing' && !isAnalyzing && (
            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                id="analyze-product-btn"
                variant="primary"
                size="lg"
                icon={PlayCircle}
                onClick={handleAnalyze}
                loading={processing || isAnalyzing}
                className="shadow-sm"
              >
                Start Visual Inspection Analysis ({labelImages.length} Label Images)
              </Button>
            </div>
          )}

          {/* Processing 8-Step Progress */}
          {(stage === 'processing' || isAnalyzing) && analysisProgress && (
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
      {!isAnalyzing && (stage === 'review' || stage === 'done') && (fusionResult || ocrResult) && (
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
                    Different values were extracted for statutory declarations across label images. This assessment will be set to <strong>NEEDS REVIEW</strong>.
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

          {/* NO GENUINE PRODUCT DETECTED ALERT BANNER */}
          {!hasGenuineDeclarations && !labelImages.some(img => img.isDemoPreset) && (
            <div className="card bg-amber-50 border-2 border-amber-300 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    No Genuine Packaged Commodity Declarations Detected
                  </h3>
                  <p className="text-xs text-amber-900 mt-1">
                    The camera snapshot does not appear to contain a readable packaged product or statutory declarations (such as MRP, Net Quantity, Brand Name, or Manufacturer).
                  </p>
                  <p className="text-xs text-slate-700 mt-1.5 font-semibold">
                    👉 <strong>Action Required:</strong> Point the camera directly at a real product packet (such as Tata Salt, Soap, Oil, Rice) with clear lighting, or enter the values manually below.
                  </p>
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
                const needsManualReview = !isConflict && conf > 0 && (conf < 0.75 || fieldVal?.manualVerificationRequired);
                const remarks = fieldVal?.remarks || (displayVal ? 'Extracted from label' : 'Not detected in uploaded image');
                const sourceBadge = fieldVal?.sourceImageType || fieldVal?.imageType || null;
                const onlinePrice = fieldVal?.onlineSellingPrice || null;
                const inputPlaceholder = displayVal
                  ? ''
                  : onlinePrice
                    ? `Online app price ${onlinePrice} — enter printed MRP if shown`
                    : 'Not detected — enter manually if visible';

                return (
                  <div key={key} className={`py-3 grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center ${isConflict ? 'bg-red-50/50 p-2 rounded' : ''}`}>
                    <div className="sm:col-span-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                      {sourceBadge && (
                        <div className="text-[10px] text-teal-700 font-medium">
                          Source: {sourceBadge}
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        className={`form-input text-sm ${isConflict ? 'border-red-400 bg-red-50 text-red-900 font-bold' : ''} ${!displayVal ? 'border-amber-300 bg-amber-50/50 text-amber-900' : ''}`}
                        value={displayVal}
                        placeholder={inputPlaceholder}
                        onChange={e => handleFieldEdit(key, e.target.value)}
                      />
                      {!displayVal && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {remarks}
                        </div>
                      )}
                      {displayVal && needsManualReview && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {remarks}
                        </div>
                      )}
                      {displayVal && onlinePrice && (
                        <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                          Package MRP: {displayVal} · Online App Price: {onlinePrice}
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
                      ) : !displayVal || conf === 0 ? (
                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-slate-400" /> Not Detected
                        </span>
                      ) : needsManualReview || conf < 0.75 ? (
                        <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Needs Review ({Math.round(conf * 100)}%)
                        </span>
                      ) : (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified ({Math.round(conf * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Collapsible Raw OCR Transcript for Audit & Verification */}
            {(combinedRawText || ocrResult?.rawText) && (
              <details className="mt-4 pt-3 border-t border-border group">
                <summary className="text-xs font-semibold text-slate-600 cursor-pointer hover:text-teal-700 select-none flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-600" />
                  View Raw OCR Transcript (Auditing & Verification)
                </summary>
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {combinedRawText || ocrResult?.rawText}
                </div>
              </details>
            )}

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
