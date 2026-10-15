import React, { useState, useEffect } from 'react';
import { X, Edit2, FolderInput } from 'lucide-react';
import { CloudFile, Folder } from '../types.ts';

interface RenameMoveModalProps {
  isOpen: boolean;
  file: CloudFile | null;
  mode: 'rename' | 'move';
  folders: Folder[];
  onClose: () => void;
  onSave: (newName?: string, targetFolderId?: string | null) => void;
}

export const RenameMoveModal: React.FC<RenameMoveModalProps> = ({
  isOpen,
  file,
  mode,
  folders,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('root');

  useEffect(() => {
    if (file) {
      setName(file.originalName);
      setSelectedFolder(file.folderId || 'root');
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'rename') {
      if (!name.trim()) return;
      onSave(name.trim(), undefined);
    } else {
      onSave(undefined, selectedFolder === 'root' ? null : selectedFolder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            {mode === 'rename' ? (
              <Edit2 className="w-4 h-4 text-sky-400" />
            ) : (
              <FolderInput className="w-4 h-4 text-sky-400" />
            )}
            <h3 className="text-xs font-bold text-white">
              {mode === 'rename' ? 'Rename File' : 'Move to Folder'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'rename' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                File Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Select Destination Folder
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
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-colors"
            >
              {mode === 'rename' ? 'Rename' : 'Move File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
