import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, AlertCircle, Check, Sparkles, SwitchCamera, PlayCircle } from 'lucide-react';
import Button from '../ui/Button';

const LABEL_TYPES = ['Front Label', 'Back Label', 'Side Label', 'Top Label', 'Bottom / Base'];

/**
 * LiveCameraScanner — On-the-spot camera capture with permission request,
 * live video viewfinder, targeting guide, multi-camera switching,
 * and instant scan capability.
 */
export default function LiveCameraScanner({
  onCapture,
  onClose,
  initialLabelType = 'Front Label',
  autoScanAvailable = true,
  onInstantScan,
}) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [permissionState, setPermissionState] = useState('requesting'); // 'requesting' | 'granted' | 'denied' | 'unsupported'
  const [errorMessage, setErrorMessage] = useState('');
  const [labelType, setLabelType] = useState(initialLabelType);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Stop camera tracks helper
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      setStream(null);
    }
  }, [stream]);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        if (videoInputs.length > 1) {
          setHasMultipleCameras(true);
        }
      }).catch(() => {});
    }
  }, []);

  // Request camera access and start video stream
  const startCamera = useCallback(async (mode = facingMode) => {
    stopTracks();
    setPermissionState('requesting');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage('Your browser does not support direct camera access. Please use the Upload Images tab.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Video play caught:', e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setPermissionState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser address bar and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on this system. Please connect a webcam or use image upload.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('Camera is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setErrorMessage(err.message || 'Unable to access camera.');
      }
    }
  }, [facingMode, stopTracks]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopTracks();
    };
  }, []);

  // When stream changes, bind to video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Switch between front & back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture still image from live video
  const captureImage = (triggerInstantScan = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual flash feedback
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    // IMPORTANT: Capture raw un-mirrored video frame so package text is upright and readable (left-to-right) for OCR
    ctx.drawImage(video, 0, 0, width, height);

    setIsCapturing(true);

    canvas.toBlob(blob => {
      setIsCapturing(false);
      if (!blob) return;

      const fileName = `live_scan_${labelType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      if (onCapture) {
        onCapture(file, labelType, triggerInstantScan);
      }

      if (triggerInstantScan && onInstantScan) {
        onInstantScan(file, labelType);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl text-white">
      {/* Hidden canvas for snapshot rasterization */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
            Counter Scanner
          </span>
        </div>

        {/* Label Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Capture As:</span>
          <select
            value={labelType}
            onChange={e => setLabelType(e.target.value)}
            className="text-xs font-semibold bg-slate-800 border border-slate-700 text-teal-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-teal-400"
          >
            {LABEL_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Switch Camera & Close */}
        <div className="flex items-center gap-1.5">
          {hasMultipleCameras && (
            <button
              onClick={handleToggleCamera}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Switch Front/Back Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              onClick={() => {
                stopTracks();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-200 transition-colors"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder Area */}
      <div className="relative w-full h-[360px] md:h-[420px] bg-black flex items-center justify-center overflow-hidden">
        {/* Flash Effect on Capture */}
        {flashActive && (
          <div className="absolute inset-0 bg-white z-30 opacity-90 transition-opacity duration-200 pointer-events-none" />
        )}

        {/* State 1: Permission Requesting */}
        {permissionState === 'requesting' && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Requesting Camera Permission…
            </p>
            <p className="text-xs text-slate-400">
              Please click <strong>"Allow"</strong> on your browser prompt to access the counter scanner.
            </p>
          </div>
        )}

        {/* State 2: Permission Denied or Error */}
        {(permissionState === 'denied' || permissionState === 'unsupported') && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-red-300">
              {permissionState === 'unsupported' ? 'Camera Not Supported' : 'Camera Access Blocked'}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => startCamera(facingMode)}
                icon={RefreshCw}
              >
                Try Again
              </Button>
              {onClose && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    stopTracks();
                    onClose();
                  }}
                >
                  Use Upload Instead
                </Button>
              )}
            </div>
          </div>
        )}

        {/* State 3: Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-contain ${permissionState === 'granted' ? 'block' : 'hidden'}`}
        />

        {/* Targeting Reticle Overlay (Only when camera active) */}
        {permissionState === 'granted' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            {/* Guide hint */}
            <div className="bg-slate-950/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-500/30 text-teal-300 text-xs font-medium shadow-lg">
              Align statutory declarations inside target frame
            </div>

            {/* Reticle Box with corner brackets and scanning beam */}
            <div className="relative w-[85%] max-w-[340px] h-[210px] rounded-xl border border-teal-400/40 shadow-[0_0_20px_rgba(45,212,191,0.15)] flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-teal-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-teal-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-teal-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-teal-400 rounded-br" />

              {/* Animated scanning beam */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
            </div>

            {/* Bottom instruction */}
            <div className="text-[11px] text-slate-400 bg-black/50 px-2.5 py-1 rounded">
              Ensure label is well-lit and not blurry
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Action Bar */}
      {permissionState === 'granted' && (
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            Scanning as: <strong className="text-white">{labelType}</strong>
          </div>

          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            {/* Standard Snap & Add */}
            <button
              id="camera-snap-add-btn"
              onClick={() => captureImage(false)}
              disabled={isCapturing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 shadow transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-teal-400" />
              <span>Capture & Add Image</span>
            </button>

            {/* Instant Scan & Verify on Counter */}
            {autoScanAvailable && (
              <button
                id="camera-snap-verify-btn"
                onClick={() => captureImage(true)}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.03] active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Snap & Scan On-The-Spot</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
