import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Folder as FolderIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Folder, UploadQueueItem } from '../types.ts';
import { formatBytes } from '../utils/fileHelpers.ts';
import { getAuthToken } from '../utils/api.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onUploadSuccess,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>(
    currentFolderId || 'root'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      progress: 0,
      status: 'uploading',
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    processUpload(newItems);
  };

  const processUpload = async (items: UploadQueueItem[]) => {
    setIsUploading(true);

    for (const item of items) {
      const formData = new FormData();
      formData.append('files', item.file);
      formData.append('folderId', selectedFolder === 'root' ? '' : selectedFolder);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, progress: 100, status: 'completed' } : q
              )
            );
          } else {
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? { ...q, status: 'error', errorMessage: 'Upload failed' }
                  : q
              )
            );
          }
        };

        xhr.onerror = () => {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'error', errorMessage: 'Network error' }
                : q
            )
          );
        };

        await new Promise((resolve) => {
          xhr.onloadend = resolve;
          xhr.send(formData);
        });
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: err.message }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    onUploadSuccess();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const allCompleted =
    uploadQueue.length > 0 &&
    uploadQueue.every((q) => q.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Upload Files & Photos</h3>
              <p className="text-xs text-slate-400">Save to your personal cloud drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Target Folder Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5 text-sky-400" /> Save to Folder:
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="root">Root Directory (/)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drag and drop files here, or <span className="text-sky-400 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Images, PDFs, Documents, Videos, Audio, ZIP up to 150 MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Direct Camera Option for Mobile & Webcam */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Take Photo / Camera Capture</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Upload Queue List */}
          {uploadQueue.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Upload Progress</span>
                <span className="font-mono tabular-nums">
                  {uploadQueue.filter((q) => q.status === 'completed').length} / {uploadQueue.length}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate flex-1">
                        {item.file.type.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate text-slate-200">{item.file.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {formatBytes(item.file.size)}
                        </span>
                        {item.status === 'completed' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          item.status === 'error' ? 'bg-red-500' : 'bg-sky-400'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isUploading ? 'Uploading files...' : allCompleted ? 'All files uploaded!' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            {allCompleted ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
