import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Info, AlertCircle, CheckCircle, Edit3, PlayCircle, ArrowRight, Layers, Sparkles } from 'lucide-react';
import { UploadBox, CaptureBox } from '../components/ui/UploadBox';
import { ProgressStepper, ConfidenceBar } from '../components/ui/ProgressStepper';
import Button from '../components/ui/Button';
import { useOCR } from '../hooks/useOCR';
import { PRODUCT_CATEGORIES, detectCategoryFromText } from '../services/ruleEngine/productCategories';
import toast from 'react-hot-toast';

const PROCESS_STEPS = [
  'Image Processing',
  'OCR Text Extraction',
  'Declaration Detection',
  'Compliance Preparation',
  'Report Ready',
];

const DEMO_SAMPLES = [
  { id: 'sample-rice', label: 'Compliant: ABC Rice', file: 'rice_label.png', category: 'FOOD_GROCERY', bg: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'sample-soap', label: 'Non-Compliant: FreshGlow Soap', file: 'soap_label.png', category: 'COSMETICS', bg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'sample-oil', label: 'Needs Review: SunPure Oil', file: 'oil_label.png', category: 'FOOD_GROCERY', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
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

export default function ScanProduct() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'capture'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [stepStatuses, setStepStatuses] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('GENERAL_PACKAGED');

  const { processing, progress, ocrResult, error, stage, startScan, runCompliance, reset } = useOCR();
  const navigate = useNavigate();

  const handleFileSelect = useCallback((file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    reset();
  }, [reset]);

  const handleSelectPreset = (sample) => {
    const dummyFile = new File(['sample content'], sample.file, { type: 'image/png' });
    if (sample.category) {
      setSelectedCategory(sample.category);
    }
    handleFileSelect(dummyFile);
    toast.success(`Loaded sample label: ${sample.label}`);
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setEditedData({});
    setStepStatuses({});
    setSelectedCategory('GENERAL_PACKAGED');
    reset();
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      toast.error('Please upload or capture a product label image first.');
      return;
    }
    setStepStatuses({});
    await startScan(imageFile);
  };

  const handleAutoDetectCategory = () => {
    const rawText = ocrResult?.rawText || '';
    const productName = editedData?.productName?.value || ocrResult?.extractedData?.productName?.value || '';
    const detected = detectCategoryFromText(rawText, productName);
    setSelectedCategory(detected.id);
    toast.success(`Auto-detected Category: ${detected.name}`);
  };

  const handleFieldEdit = (key, val) => {
    setEditedData(prev => ({
      ...prev,
      [key]: { value: val, confidence: prev[key]?.confidence ?? ocrResult?.extractedData?.[key]?.confidence ?? 0.5 },
    }));
  };

  const handleRunCompliance = () => {
    const finalData = {};
    const extracted = ocrResult?.extractedData || {};
    Object.keys(FIELD_LABELS).forEach(key => {
      finalData[key] = editedData[key] ?? extracted[key] ?? { value: null, confidence: 0 };
    });
    const result = runCompliance(finalData, selectedCategory);
    // Navigate to result page with full assessment data
    navigate('/result/new', { state: { extractedData: finalData, complianceResult: result, imageUrl: imagePreview, categoryId: selectedCategory } });
  };

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Scan Product</h1>
          <p className="page-desc">Upload a packaged commodity label to check its mandatory declarations.</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="alert alert-info mb-6">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong className="font-semibold">Before you begin:</strong> For best results, ensure the product label is well-lit, in focus, and fully visible. Both front and back labels can be uploaded.
        </div>
      </div>

      {/* Quick Test Demo Samples */}
      {stage === 'idle' && !imageFile && (
        <div className="mb-4 bg-teal-50/50 border border-teal-100 rounded-xl p-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-primary" />
              Quick Test Demo Samples:
            </span>
            <span className="text-[11px] text-gray-500">Click any preset to test the workflow without uploading</span>
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

      {/* Upload / Capture tabs */}
      {(stage === 'idle' || stage === 'processing') && (
        <div className="card mb-6">
          <div className="flex gap-2 mb-5 border-b border-border -mx-6 px-6 pb-0">
            {[
              { id: 'upload', label: 'Upload Image', icon: Upload },
              { id: 'capture', label: 'Capture Image', icon: Camera },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-navy'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'upload' ? (
            <UploadBox
              onFileSelect={handleFileSelect}
              preview={imagePreview}
              onClear={handleClear}
              error={error}
            />
          ) : (
            <CaptureBox onFileSelect={handleFileSelect} />
          )}

          {imageFile && stage !== 'processing' && (
            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-gray-500">
                <span className="font-medium text-navy">{imageFile.name}</span> &nbsp;·&nbsp;
                {(imageFile.size / 1024).toFixed(0)} KB
              </div>
              <Button
                id="analyze-product-btn"
                variant="primary"
                size="lg"
                icon={PlayCircle}
                onClick={handleAnalyze}
                loading={processing}
                className="shadow-sm"
              >
                Analyze Product
              </Button>
            </div>
          )}

          {/* Processing Steps */}
          {stage === 'processing' && (
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-border">
              <h3 className="text-sm font-semibold text-navy mb-4">Processing Label Analysis…</h3>
              <ProgressStepper
                steps={PROCESS_STEPS}
                currentStep={progress?.stepIndex ?? 0}
                stepStatuses={
                  progress ? Object.fromEntries(
                    PROCESS_STEPS.map((_, i) => [
                      i,
                      i < (progress.stepIndex) ? 'done' :
                      i === progress.stepIndex ? (progress.status === 'done' ? 'done' : 'active') :
                      'pending'
                    ])
                  ) : {}
                }
              />
            </div>
          )}
        </div>
      )}

      {/* OCR Extraction Review */}
      {(stage === 'review' || stage === 'done') && ocrResult && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="section-title text-base">Extracted Product Information</h2>
                <p className="section-subtitle">Review and edit any extracted fields below if necessary before running compliance check.</p>
              </div>
              <Button variant="secondary" size="sm" icon={Camera} onClick={handleClear}>
                Scan Another Image
              </Button>
            </div>

            <div className="alert alert-warning mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>OCR extraction may require verification. Please inspect all extracted values and correct any inaccuracies before confirming.</span>
            </div>

            {/* Product Category Selector */}
            <div className="mb-5 p-3.5 bg-gray-50 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <label htmlFor="product-category-select" className="text-xs font-bold text-navy block">
                    Select Product Category
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Applicable requirement rules will adjust based on commodity type & origin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="product-category-select"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="form-input text-xs font-semibold text-navy bg-white py-1.5 px-3 rounded-lg border-border focus:border-primary max-w-xs"
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAutoDetectCategory}
                  title="Auto-detect category from OCR text"
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-primary font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-detect
                </button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const field = ocrResult.extractedData?.[key];
                const editedVal = editedData[key];
                const displayVal = editedVal?.value ?? field?.value ?? '';
                const conf = editedVal?.confidence ?? field?.confidence ?? 0;
                const isEdited = editedData[key] !== undefined;

                return (
                  <div key={key} className="py-3 grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center">
                    <div className="sm:col-span-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        className={`form-input text-sm ${isEdited ? 'border-primary/50 bg-teal-50/40' : ''}`}
                        value={displayVal}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        onChange={e => handleFieldEdit(key, e.target.value)}
                        id={`field-${key}`}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      {conf > 0 ? (
                        <ConfidenceBar confidence={conf} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not detected</span>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      {isEdited ? (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Edited
                        </span>
                      ) : conf > 0 ? (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Detected
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="secondary" onClick={handleClear}>
                Cancel
              </Button>
              <Button
                id="run-compliance-btn"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconRight
                onClick={handleRunCompliance}
                className="shadow-sm"
              >
                Confirm & Check Compliance
              </Button>
            </div>
          </div>

          {/* Raw OCR text */}
          <div className="card">
            <button
              className="flex items-center justify-between w-full text-sm font-semibold text-navy"
              onClick={e => e.currentTarget.nextElementSibling.classList.toggle('hidden')}
            >
              <span>Raw OCR Text</span>
              <Info className="w-4 h-4 text-gray-400" />
            </button>
            <div className="hidden mt-3">
              <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap border border-border font-mono leading-relaxed">
                {ocrResult.rawText || 'No raw text available'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && stage === 'idle' && (
        <div className="card border-error/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-error text-sm mb-1">Processing Failed</h3>
              <p className="text-gray-600 text-sm">{error}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={handleClear}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {stage === 'idle' && !imageFile && (
        <div className="card bg-gray-50 border-dashed">
          <h3 className="text-sm font-semibold text-navy mb-3">Tips for Better Results</h3>
          <ul className="space-y-2 text-xs text-gray-500">
            {[
              'Ensure the label is flat and fully visible in the image',
              'Use good lighting — avoid shadows or glare on the label',
              'Take the photo straight-on, not at an angle',
              'Include both front and back labels for complete coverage',
              'Higher resolution images give more accurate OCR results',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">·</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
