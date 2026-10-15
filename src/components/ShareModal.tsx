import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Globe, QrCode } from 'lucide-react';
import { CloudFile } from '../types.ts';
import QRCode from 'qrcode';
import { fetchWithAuth } from '../utils/api.ts';

interface ShareModalProps {
  isOpen: boolean;
  file: CloudFile | null;
  onClose: () => void;
  onShareUpdated: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  file,
  onClose,
  onShareUpdated,
}) => {
  const [isShared, setIsShared] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      setIsShared(!!file.shareId);
      setShareId(file.shareId);
      if (file.shareId) {
        generateQr(file.shareId);
      }
    }
  }, [file, isOpen]);

  const generateQr = (sId: string) => {
    const fullUrl = `${window.location.origin}/api/files/${file?.id}/view`;
    QRCode.toDataURL(fullUrl, { margin: 1, scale: 5 })
      .then((url) => setQrCodeData(url))
      .catch((err) => console.error('QR generation error:', err));
  };

  if (!isOpen || !file) return null;

  const shareUrl = shareId
    ? `${window.location.origin}/api/files/${file.id}/view`
    : '';

  const handleToggleShare = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/files/${file.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !isShared }),
      });
      const data = await res.json();
      setIsShared(data.isShared);
      setShareId(data.shareId);
      if (data.shareId) {
        generateQr(data.shareId);
      }
      onShareUpdated();
    } catch (err) {
      console.error('Error toggling share:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white">Share File Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-200 truncate">
              {file.originalName}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Anyone with this link will be able to view or download this file directly in their browser.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Public Link Sharing
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {isShared ? 'Active — accessible to anyone' : 'Disabled'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleShare}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isShared ? 'bg-sky-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isShared ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Link box & QR Code */}
          {isShared && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5 pl-3">
                <span className="font-mono text-xs text-slate-300 truncate flex-1">
                  {shareUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {qrCodeData && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="p-1.5 bg-white rounded-lg shrink-0">
                    <img
                      src={qrCodeData}
                      alt="Share QR Code"
                      className="w-20 h-20"
                    />
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-sky-400" /> Direct QR Code
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Scan this code to immediately download or view on mobile.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
