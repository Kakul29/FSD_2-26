import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, Barcode, ArrowRight, Sparkles } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

const POPULAR_DEMO_BARCODES = [
  { barcode: '8901058862392', name: 'Maggi 2-Minute Masala Noodles', brand: 'Nestlé' },
  { barcode: '8906109960012', name: 'Millet Noodles (Foxtail & Little Millet)', brand: 'Slurrp Farm' },
  { barcode: '8901491365412', name: 'Doritos Cheese Supreme Nachos', brand: 'Doritos' },
  { barcode: '8904004400123', name: 'Cornitos Nacho Crisps (Gluten Free)', brand: 'Cornitos' },
  { barcode: '8901491101836', name: 'Parle-G Gluco Biscuits', brand: 'Parle' },
  { barcode: '8901063012218', name: 'NutriChoice Digestive High Fibre', brand: 'Britannia' },
  { barcode: '8801043002883', name: 'Shin Ramyun Spicy Ramen', brand: 'Nongshim' },
  { barcode: '8906082520012', name: 'Natural Greek Yogurt (High Protein)', brand: 'Epigamia' },
  { barcode: '7622201124567', name: 'Dairy Milk Chocolate', brand: 'Cadbury' },
];

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    // Initialize camera listing and scanner
    async function initScanner() {
      try {
        setCameraError(null);
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          const chosenCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenCamId);
          startCamera(chosenCamId);
        } else {
          setCameraError('No camera devices detected on this device. You can type or pick a barcode below.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setCameraError(
          err.message?.includes('Permission')
            ? 'Camera access permission was denied. Please allow camera permissions in your browser or enter the barcode manually.'
            : 'Could not access device camera. Please enter barcode manually below.'
        );
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const startCamera = async (cameraId: string) => {
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const qrScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          stopScanner();
          onScanSuccess(decodedText.trim());
        },
        () => {
          // Scanning frame without barcode
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Failed to start camera feed. Please use manual entry or demo barcodes.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      // Ignore cleanup error
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamId = availableCameras[nextIndex].id;
    setSelectedCameraId(nextCamId);
    await startCamera(nextCamId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      stopScanner();
      onScanSuccess(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-800" />
            <h2 className="font-display font-bold text-lg text-stone-900">Scan Product Barcode</h2>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-stone-900 aspect-4/3 flex items-center justify-center border border-stone-300">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Camera Overlay Controls */}
            {isScanning && availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="absolute top-3 right-3 bg-stone-900/75 hover:bg-stone-900 text-white p-2 rounded-full backdrop-blur-xs transition-colors z-10"
                title="Switch Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-stone-900/90 text-stone-100 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mb-1" />
                <p className="text-sm font-medium">{cameraError}</p>
                <p className="text-xs text-stone-400">
                  Use manual barcode entry or select one of the verified sample products below.
                </p>
              </div>
            )}
          </div>

          {/* Manual Barcode Entry Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 tracking-wide uppercase">
              Or Enter Barcode Digits
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="e.g. 8901058862392"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Look Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Demo Samples for Easy Testing */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold text-stone-700 uppercase tracking-wide">
                Quick Demonstration Products
              </span>
              <span>Click to test instantly</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {POPULAR_DEMO_BARCODES.map((item) => (
                <button
                  key={item.barcode}
                  onClick={() => {
                    stopScanner();
                    onScanSuccess(item.barcode);
                  }}
                  className="p-2.5 rounded-lg border border-stone-200 bg-white hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group"
                >
                  <p className="text-xs font-semibold text-stone-900 group-hover:text-emerald-900 line-clamp-1">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                    <span>{item.brand}</span>
                    <span className="font-mono text-stone-400 tabular-nums">{item.barcode}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
