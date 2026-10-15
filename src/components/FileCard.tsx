import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Code,
  File,
  Star,
  Download,
  Share2,
  MoreVertical,
  Trash2,
  RotateCcw,
  Edit2,
  FolderInput,
  Check,
} from 'lucide-react';
import { CloudFile, Folder } from '../types.ts';
import { formatBytes, formatDate, getFileCategory } from '../utils/fileHelpers.ts';
import { getAuthToken } from '../utils/api.ts';

interface FileCardProps {
  file: CloudFile;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (file: CloudFile) => void;
  onToggleStar: (id: string, current: boolean) => void;
  onDownload: (id: string, name: string) => void;
  onShare: (file: CloudFile) => void;
  onRename: (file: CloudFile) => void;
  onMove: (file: CloudFile) => void;
  onTrash: (id: string) => void;
  onRestore?: (id: string) => void;
  onDeletePermanently?: (id: string) => void;
  folders: Folder[];
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isSelected,
  onToggleSelect,
  onPreview,
  onToggleStar,
  onDownload,
  onShare,
  onRename,
  onMove,
  onTrash,
  onRestore,
  onDeletePermanently,
}) => {
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const category = getFileCategory(file.mimeType, file.originalName);

  const getCategoryIcon = () => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-sky-400" />;
      case 'video':
        return <Video className="w-8 h-8 text-indigo-400" />;
      case 'audio':
        return <Music className="w-8 h-8 text-violet-400" />;
      case 'pdf':
      case 'document':
        return <FileText className="w-8 h-8 text-emerald-400" />;
      case 'code':
        return <Code className="w-8 h-8 text-amber-400" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-rose-400" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div
      onClick={() => onPreview(file)}
      className={`group relative bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-lg hover:shadow-slate-950/40 hover:-translate-y-0.5 ${
        isSelected
          ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Thumbnail or File Header */}
      <div className="relative aspect-[16/10] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {category === 'image' && !imageError ? (
          <img
            src={`/api/files/${file.id}/view${getAuthToken() ? `?token=${getAuthToken()}` : ''}`}
            alt={file.originalName}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {getCategoryIcon()}
            <span className="mt-2 text-[11px] font-mono uppercase text-slate-400 tracking-wider">
              {file.originalName.split('.').pop() || 'FILE'}
            </span>
          </div>
        )}

        {/* Top Floating Controls Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
          {/* Multi-select Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(file.id);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-sky-500 text-white'
                : 'bg-slate-900/80 border border-slate-700 text-transparent hover:text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          {/* Star & Download Buttons */}
          <div className="flex items-center gap-1">
            {!file.isTrash && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.id, file.originalName);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white hover:bg-sky-600 transition-all opacity-0 group-hover:opacity-100"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(file.id, file.isStarred);
                  }}
                  className={`p-1.5 rounded-lg transition-all ${
                    file.isStarred
                      ? 'bg-amber-500/20 text-amber-400 opacity-100'
                      : 'bg-slate-900/80 text-slate-400 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                  }`}
                  title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={file.isStarred ? 'currentColor' : 'none'}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-semibold text-slate-200 truncate group-hover:text-sky-300 transition-colors"
              title={file.originalName}
            >
              {file.originalName}
            </h4>

            {/* Clean metadata without pill badges */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <span className="font-mono tabular-nums">{formatBytes(file.size)}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{formatDate(file.uploadedAt)}</span>
            </div>
          </div>

          {/* Context Action Menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 bottom-7 w-44 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 py-1 text-xs"
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {!file.isTrash ? (
                  <>
                    <button
                      onClick={() => {
                        onDownload(file.id, file.originalName);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        onShare(file);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Link
                    </button>
                    <button
                      onClick={() => {
                        onRename(file);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        onMove(file);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      Move to Folder
                    </button>
                    <div className="h-px bg-slate-800 my-1" />
                    <button
                      onClick={() => {
                        onTrash(file.id);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Move to Trash
                    </button>
                  </>
                ) : (
                  <>
                    {onRestore && (
                      <button
                        onClick={() => {
                          onRestore(file.id);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-emerald-400 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore File
                      </button>
                    )}
                    {onDeletePermanently && (
                      <button
                        onClick={() => {
                          onDeletePermanently(file.id);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Forever
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Device source indicator */}
        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
          <span className="truncate">{file.deviceSource || 'Cloud Sync'}</span>
          {file.shareId && (
            <span className="text-sky-400 flex items-center gap-1 font-medium">
              <Share2 className="w-3 h-3" /> Shared
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
