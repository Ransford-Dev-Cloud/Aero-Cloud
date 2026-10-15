import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Smartphone,
  HardDrive,
  Calendar,
  Tag,
  Star,
} from 'lucide-react';
import { CloudFile } from '../types.ts';
import { formatBytes, formatDate, formatDateTime, getFileCategory } from '../utils/fileHelpers.ts';
import { getAuthToken, fetchWithAuth } from '../utils/api.ts';

interface FilePreviewModalProps {
  file: CloudFile | null;
  filesList: CloudFile[];
  onClose: () => void;
  onNavigateFile: (file: CloudFile) => void;
  onDownload: (id: string, name: string) => void;
  onShare: (file: CloudFile) => void;
  onTrash: (id: string) => void;
  onToggleStar: (id: string, current: boolean) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  filesList,
  onClose,
  onNavigateFile,
  onDownload,
  onShare,
  onTrash,
  onToggleStar,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showMetaSidebar, setShowMetaSidebar] = useState(true);

  // Reset transforms on file change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);

    if (!file) return;

    const cat = getFileCategory(file.mimeType, file.originalName);
    if (cat === 'document' || cat === 'code' || file.mimeType.startsWith('text/')) {
      setLoadingText(true);
      fetchWithAuth(`/api/files/${file.id}/view`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch(() => {
          setTextContent('Unable to preview file content.');
          setLoadingText(false);
        });
    }
  }, [file]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!file) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, filesList]);

  if (!file) return null;

  const category = getFileCategory(file.mimeType, file.originalName);
  const currentIndex = filesList.findIndex((f) => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < filesList.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigateFile(filesList[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigateFile(filesList[currentIndex + 1]);
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const token = getAuthToken();
  const fileViewUrl = `/api/files/${file.id}/view${token ? `?token=${token}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md overflow-hidden">
      {/* Top action bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {file.originalName}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {formatBytes(file.size)} · {formatDate(file.uploadedAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!file.isTrash && (
            <button
              onClick={() => onToggleStar(file.id, file.isStarred)}
              className={`p-2 rounded-lg transition-colors ${
                file.isStarred
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title="Star"
            >
              <Star
                className="w-4 h-4"
                fill={file.isStarred ? 'currentColor' : 'none'}
              />
            </button>
          )}

          <button
            onClick={() => onShare(file)}
            className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDownload(file.id, file.originalName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={() => setShowMetaSidebar(!showMetaSidebar)}
            className={`p-2 rounded-lg transition-colors ${
              showMetaSidebar
                ? 'bg-sky-500/20 text-sky-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Details Inspector"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full h-full pt-14 flex items-stretch overflow-hidden">
        {/* Left/Right Next/Prev Arrows */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl z-20 transition-all hover:scale-110"
            title="Previous file"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl z-20 transition-all hover:scale-110"
            title="Next file"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Center Viewer */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          {category === 'image' && (
            <div className="w-full h-full flex items-center justify-center relative select-none">
              <img
                src={fileViewUrl}
                alt={file.originalName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[82vh] max-w-[85vw] object-contain shadow-2xl rounded-lg"
              />

              {/* Floating Image Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 px-2 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="px-2 py-1 text-[11px] hover:bg-slate-800 text-slate-300 hover:text-white rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {category === 'video' && (
            <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
              <video
                src={fileViewUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[80vh] rounded-xl shadow-2xl bg-black"
              >
                Your browser does not support HTML5 video streaming.
              </video>
            </div>
          )}

          {category === 'audio' && (
            <div className="w-full max-w-lg p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <Smartphone className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1 truncate">
                  {file.originalName}
                </h4>
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  {formatBytes(file.size)} · Audio Stream
                </p>
              </div>
              <audio
                src={fileViewUrl}
                controls
                autoPlay
                className="w-full"
              >
                Your browser does not support HTML5 audio.
              </audio>
            </div>
          )}

          {(category === 'document' || category === 'code') && (
            <div className="w-full max-w-4xl h-[78vh] bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  {file.originalName.split('.').pop()} Document Viewer
                </span>
                <button
                  onClick={handleCopyText}
                  disabled={!textContent}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {copiedText ? (
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

              <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-sky-500/30">
                {loadingText ? (
                  <div className="text-slate-500 italic p-4">Loading preview...</div>
                ) : (
                  textContent || 'No readable text content available for preview.'
                )}
              </div>
            </div>
          )}

          {category === 'pdf' && (
            <div className="w-full max-w-4xl h-[80vh] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
              <iframe
                src={fileViewUrl}
                title={file.originalName}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {category === 'archive' && (
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white truncate">
                  {file.originalName}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  Archive Package · {formatBytes(file.size)}
                </p>
              </div>
              <button
                onClick={() => onDownload(file.id, file.originalName)}
                className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
              >
                Download Archive
              </button>
            </div>
          )}

          {category === 'other' && (
            <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white truncate">
                  {file.originalName}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  {file.mimeType} · {formatBytes(file.size)}
                </p>
              </div>
              <button
                onClick={() => onDownload(file.id, file.originalName)}
                className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-lg shadow-sky-500/20"
              >
                Download File
              </button>
            </div>
          )}
        </div>

        {/* Right Metadata Inspector Sidebar */}
        {showMetaSidebar && (
          <aside className="w-80 bg-slate-950 border-l border-slate-800/80 p-5 overflow-y-auto space-y-6 hidden lg:block shrink-0">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                File Details
              </span>
              <h4 className="text-sm font-semibold text-white break-words">
                {file.originalName}
              </h4>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-400" /> Size
                </span>
                <span className="font-mono tabular-nums text-white">
                  {formatBytes(file.size)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Uploaded
                </span>
                <span className="text-right text-slate-200">
                  {formatDateTime(file.uploadedAt)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-400" /> Source
                </span>
                <span className="text-slate-200">{file.deviceSource || 'Cloud Sync'}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400 flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-400" /> Downloads
                </span>
                <span className="font-mono tabular-nums text-white">
                  {file.downloadCount}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">MIME Format</span>
                <span className="font-mono text-[11px] text-slate-300 break-all block bg-slate-900 p-1.5 rounded">
                  {file.mimeType}
                </span>
              </div>

              {file.tags && file.tags.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                    {file.tags.map((t, idx) => (
                      <span key={idx}>
                        #{t}
                        {idx < file.tags.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions in Sidebar */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => onDownload(file.id, file.originalName)}
                className="w-full py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download File
              </button>
              <button
                onClick={() => onShare(file)}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </button>
              {!file.isTrash && (
                <button
                  onClick={() => {
                    onTrash(file.id);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-lg hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Move to Trash
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
