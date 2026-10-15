import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Globe,
  Camera,
  Laptop,
  Tablet,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { DeviceConnectInfo } from '../types.ts';

interface ConnectDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerMobileUpload: () => void;
}

export const ConnectDeviceModal: React.FC<ConnectDeviceModalProps> = ({
  isOpen,
  onClose,
  onTriggerMobileUpload,
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceConnectInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/device/connect-info')
        .then((res) => res.json())
        .then((data) => {
          setDeviceInfo(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching device connect info:', err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = deviceInfo?.appUrl || window.location.origin;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Access on Any Device</h3>
              <p className="text-xs text-slate-400">Open and sync your files from any phone, tablet, or PC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Main Card with QR Code and URL */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-xl bg-slate-950 border border-slate-800/80">
            {/* QR Code */}
            <div className="p-3 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center w-40 h-40">
              {loading ? (
                <div className="flex items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : deviceInfo?.qrCode ? (
                <img
                  src={deviceInfo.qrCode}
                  alt="QR Code for Mobile Access"
                  className="w-36 h-36"
                />
              ) : (
                <QrCode className="w-32 h-32 text-slate-800" />
              )}
            </div>

            {/* Instructions & Link */}
            <div className="flex-1 space-y-3 min-w-0 text-center sm:text-left">
              <div>
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block mb-1">
                  Step 1: Scan With Phone Camera
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open your iPhone or Android camera, point it at this QR code, and tap the link banner to load your cloud storage immediately.
                </p>
              </div>

              {/* Direct Web Address Box */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  Or enter URL in any web browser:
                </span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-lg p-1.5 pl-3">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs text-slate-200 truncate flex-1 text-left">
                    {currentUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Devices Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-1">
              <Smartphone className="w-5 h-5 mx-auto text-sky-400" />
              <div className="text-xs font-semibold text-slate-200">Mobile Phones</div>
              <div className="text-[11px] text-slate-400">iOS & Android</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-1">
              <Tablet className="w-5 h-5 mx-auto text-indigo-400" />
              <div className="text-xs font-semibold text-slate-200">Tablets</div>
              <div className="text-[11px] text-slate-400">iPad & Galaxy Tab</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-1">
              <Laptop className="w-5 h-5 mx-auto text-emerald-400" />
              <div className="text-xs font-semibold text-slate-200">Computers</div>
              <div className="text-[11px] text-slate-400">Mac, Windows, Linux</div>
            </div>
          </div>

          {/* Mobile Camera Upload Guidance */}
          <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 flex items-start gap-3">
            <Camera className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-sky-200 block">
                Direct Mobile Camera Upload
              </span>
              <p className="text-slate-300 leading-relaxed">
                When opened on your phone, you can choose photos from your camera roll or take a live picture. The file syncs directly to this cloud drive in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Web Storage</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onTriggerMobileUpload();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors"
            >
              Upload Files Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
