import React from 'react';
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
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';
import { CloudFile } from '../types.ts';
import { formatBytes, formatDateTime, getFileCategory } from '../utils/fileHelpers.ts';

interface FileTableViewProps {
  files: CloudFile[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onPreview: (file: CloudFile) => void;
  onToggleStar: (id: string, current: boolean) => void;
  onDownload: (id: string, name: string) => void;
  onShare: (file: CloudFile) => void;
  onTrash: (id: string) => void;
  onRestore?: (id: string) => void;
  onDeletePermanently?: (id: string) => void;
  isTrashView?: boolean;
}

export const FileTableView: React.FC<FileTableViewProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onPreview,
  onToggleStar,
  onDownload,
  onShare,
  onTrash,
  onRestore,
  onDeletePermanently,
  isTrashView = false,
}) => {
  const allSelected = files.length > 0 && selectedIds.length === files.length;

  const getFileIcon = (file: CloudFile) => {
    const category = getFileCategory(file.mimeType, file.originalName);
    switch (category) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'video':
        return <Video className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'audio':
        return <Music className="w-4 h-4 text-violet-400 shrink-0" />;
      case 'pdf':
      case 'document':
        return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'code':
        return <Code className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-950/40">
            <th className="py-3 px-4 w-10">
              <button
                type="button"
                onClick={onSelectAll}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'bg-sky-500 border-sky-500 text-white'
                    : 'border-slate-700 hover:border-slate-500 text-transparent'
                }`}
              >
                <Check className="w-3 h-3" />
              </button>
            </th>
            <th className="py-3 px-3">Name</th>
            <th className="py-3 px-4 hidden sm:table-cell">Type</th>
            <th className="py-3 px-4 text-right">Size</th>
            <th className="py-3 px-4 hidden md:table-cell">Date Uploaded</th>
            <th className="py-3 px-4 hidden lg:table-cell">Device Source</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {files.map((file) => {
            const isSelected = selectedIds.includes(file.id);
            return (
              <tr
                key={file.id}
                onClick={() => onPreview(file)}
                className={`group hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  isSelected ? 'bg-sky-500/10' : ''
                }`}
              >
                {/* Select Checkbox */}
                <td
                  className="py-2.5 px-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(file.id);
                  }}
                >
                  <button
                    type="button"
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : 'border-slate-700 group-hover:border-slate-500 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </td>

                {/* Name & Star */}
                <td className="py-2.5 px-3 min-w-[200px] max-w-xs">
                  <div className="flex items-center gap-2.5">
                    {!isTrashView && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(file.id, file.isStarred);
                        }}
                        className={`p-1 rounded transition-colors ${
                          file.isStarred
                            ? 'text-amber-400'
                            : 'text-slate-600 hover:text-amber-400 group-hover:text-slate-400'
                        }`}
                        title="Star"
                      >
                        <Star
                          className="w-3.5 h-3.5"
                          fill={file.isStarred ? 'currentColor' : 'none'}
                        />
                      </button>
                    )}
                    {getFileIcon(file)}
                    <span
                      className="font-medium text-slate-200 group-hover:text-sky-300 truncate"
                      title={file.originalName}
                    >
                      {file.originalName}
                    </span>
                  </div>
                </td>

                {/* File Type */}
                <td className="py-2.5 px-4 text-slate-400 hidden sm:table-cell font-mono text-[11px] truncate uppercase">
                  {file.originalName.split('.').pop() || 'FILE'}
                </td>

                {/* Size with Tabular Numerals */}
                <td className="py-2.5 px-4 text-right text-slate-300 font-mono tabular-nums">
                  {formatBytes(file.size)}
                </td>

                {/* Date Uploaded */}
                <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] tabular-nums hidden md:table-cell">
                  {formatDateTime(file.uploadedAt)}
                </td>

                {/* Device Source */}
                <td className="py-2.5 px-4 text-slate-400 text-xs hidden lg:table-cell truncate">
                  {file.deviceSource || 'Cloud Sync'}
                </td>

                {/* Quick Row Actions */}
                <td
                  className="py-2.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    {!isTrashView ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onShare(file)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
                          title="Share Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(file.id, file.originalName)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTrash(file.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {onRestore && (
                          <button
                            type="button"
                            onClick={() => onRestore(file.id)}
                            className="p-1.5 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Restore File"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeletePermanently && (
                          <button
                            type="button"
                            onClick={() => onDeletePermanently(file.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
