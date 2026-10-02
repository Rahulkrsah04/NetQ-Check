import { useState } from 'react';
import { processImage } from '../services/ocrService';
import { runComplianceCheck } from '../services/complianceEngine';

/**
 * useOCR — hook for the full scan pipeline:
 * upload → OCR → normalization → compliance check
 */
export function useOCR() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [complianceResult, setComplianceResult] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle'); // idle | processing | review | compliance | done

  const startScan = async (imageFile) => {
    setProcessing(true);
    setError(null);
    setOcrResult(null);
    setComplianceResult(null);
    setStage('processing');

    try {
      const result = await processImage(imageFile, (prog) => {
        setProgress(prog);
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract text from image');
      }

      setOcrResult(result);
      setStage('review');
    } catch (err) {
      setError(
        err.message?.includes('Failed to extract')
          ? "We couldn't read enough information from this image. Please upload a clearer label image."
          : err.message || 'An unexpected error occurred during image processing.'
      );
      setStage('idle');
    } finally {
      setProcessing(false);
    }
  };

  const runCompliance = (editedData, categoryId = 'GENERAL_PACKAGED', options = {}) => {
    setStage('compliance');
    const dataToCheck = editedData || ocrResult?.extractedData || {};
    const assessment = runComplianceCheck({
      extractedData: dataToCheck,
      productCategory: categoryId,
      scanId: options.scanId || 'SCAN-' + Date.now(),
      userId: options.userId || 'INSPECTOR-01',
    });
    setComplianceResult(assessment);
    setStage('done');
    return assessment;
  };

  const reset = () => {
    setProcessing(false);
    setProgress(null);
    setOcrResult(null);
    setComplianceResult(null);
    setError(null);
    setStage('idle');
  };

  return {
    processing,
    progress,
    ocrResult,
    complianceResult,
    error,
    stage,
    startScan,
    runCompliance,
    reset,
  };
}
