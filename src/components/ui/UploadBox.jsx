import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, Image, X, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

/**
 * UploadBox — drag & drop + file browse + camera capture
 */
export function UploadBox({ onFileSelect, preview, onClear, error }) {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.[0]) onFileSelect(acceptedFiles[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const getRejectionMessage = () => {
    if (!fileRejections?.[0]?.errors?.[0]) return null;
    const errCode = fileRejections[0].errors[0].code;
    if (errCode === 'file-too-large') return 'File size exceeds the 10 MB limit. Please select a smaller image.';
    if (errCode === 'file-invalid-type') return 'Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP image.';
    return fileRejections[0].errors[0].message;
  };

  const displayError = error || getRejectionMessage();

  if (preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img
          src={preview}
          alt="Product label preview"
          className="w-full h-64 object-contain bg-gray-50"
        />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-card flex items-center justify-center hover:bg-red-50 transition-colors"
          title="Remove image"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-navy/80 text-white text-xs px-3 py-2 flex items-center gap-2">
          <Image className="w-3.5 h-3.5 text-primary" />
          <span>Image ready for analysis</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'drag-active' : ''} ${displayError ? 'border-error bg-red-50/30' : ''}`}
      >
        <input {...getInputProps()} id="file-upload" />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-primary/10' : 'bg-gray-100'}`}>
            {isDragActive ? (
              <Upload className="w-7 h-7 text-primary" />
            ) : (
              <Image className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-navy text-sm">
              {isDragActive ? 'Drop image here' : 'Drag & drop product label image'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or <span className="text-primary font-medium cursor-pointer">browse from device</span></p>
          </div>
          <div className="flex gap-2 text-xs text-gray-400">
            <span className="tag">PNG</span>
            <span className="tag">JPG</span>
            <span className="tag">JPEG</span>
            <span className="tag">WEBP</span>
            <span className="tag">Max 10 MB</span>
          </div>
        </div>
      </div>

      {displayError && (
        <div className="flex items-center gap-2 mt-2.5 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-error font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

/**
 * CaptureBox — camera capture for mobile
 */
export function CaptureBox({ onFileSelect }) {
  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <label
      htmlFor="camera-capture"
      className="upload-zone flex flex-col items-center gap-3 cursor-pointer"
    >
      <div className="w-14 h-14 rounded-2xl bg-navy/10 flex items-center justify-center">
        <Camera className="w-7 h-7 text-navy" />
      </div>
      <div>
        <p className="font-semibold text-navy text-sm">Capture Label</p>
        <p className="text-xs text-gray-500 mt-1">Use device camera to photograph label</p>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Point camera at the label in good lighting for best results
      </p>
      <input
        id="camera-capture"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
    </label>
  );
}
