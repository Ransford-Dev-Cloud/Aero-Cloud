import React from 'react';
import {
  Folder as FolderIcon,
  HardDrive,
  Image as ImageIcon,
  FileText,
  Video,
  Star,
  Trash2,
  Plus,
  Smartphone,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { Folder, StorageStats, ActiveTab } from '../types.ts';
import { formatBytes } from '../utils/fileHelpers.ts';

import { User } from '../types.ts';
import { LogOut, User as UserIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolderClick: () => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onRenameFolder: (folder: Folder) => void;
  stats: StorageStats | null;
  onConnectDeviceClick: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolderClick,
  onDeleteFolder,
  onRenameFolder,
  stats,
  onConnectDeviceClick,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  onSignOut,
  onOpenAuth,
}) => {
  const [activeFolderMenu, setActiveFolderMenu] = React.useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const navItems = [
    { id: 'all', label: 'All Files', icon: HardDrive },
    { id: 'images', label: 'Photos & Images', icon: ImageIcon },
    { id: 'documents', label: 'Documents & Notes', icon: FileText },
    { id: 'media', label: 'Audio & Video', icon: Video },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: User profile & Nav */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* User Account Tile */}
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow-inner shrink-0">
                  {getInitials(currentUser.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate block">
                      {currentUser.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Cloud Active" />
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}

          {/* Navigation Items */}
          <div className="space-y-1">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Storage
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && currentFolderId === null;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as ActiveTab);
                    onSelectFolder(null);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.id === 'trash' && stats && stats.trashCount > 0 && (
                    <span className="font-mono text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                      {stats.trashCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Folders Section */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Folders
              </span>
              <button
                onClick={onCreateFolderClick}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Create new folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {folders.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">No folders yet</div>
              ) : (
                folders.map((folder) => {
                  const isFolderActive = currentFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className="relative group flex items-center justify-between"
                    >
                      <button
                        onClick={() => {
                          onSelectFolder(folder.id);
                          onCloseMobile();
                        }}
                        className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-left truncate transition-colors cursor-pointer ${
                          isFolderActive
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <FolderIcon
                          className="w-4 h-4 shrink-0"
                          style={{ color: folder.color || '#38bdf8' }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </button>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFolderMenu(
                              activeFolderMenu === folder.id ? null : folder.id
                            );
                          }}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {activeFolderMenu === folder.id && (
                        <div
                          className="absolute right-0 top-8 w-36 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 py-1 text-xs"
                          onMouseLeave={() => setActiveFolderMenu(null)}
                        >
                          <button
                            onClick={() => {
                              onRenameFolder(folder);
                              setActiveFolderMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white"
                          >
                            Rename Folder
                          </button>
                          <button
                            onClick={() => {
                              onDeleteFolder(folder.id, folder.name);
                              setActiveFolderMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400"
                          >
                            Delete Folder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Device Connect Card & Storage Quota */}
        <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/60">
          {/* Connect Device Mini Banner */}
          <div
            onClick={onConnectDeviceClick}
            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>Any Device Access</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Access from phone or tablet via instant QR sync.
            </p>
          </div>

          {/* Storage Capacity Gauge */}
          {stats && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400">Cloud Storage</span>
                <span className="text-slate-200 font-mono tabular-nums">
                  {formatBytes(stats.totalBytes)} / {formatBytes(stats.maxQuota)}
                </span>
              </div>

              {/* Multi-segmented or clean progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-sky-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (stats.breakdown.imagesBytes / stats.maxQuota) * 100,
                      100
                    )}%`,
                  }}
                  title={`Images: ${formatBytes(stats.breakdown.imagesBytes)}`}
                />
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (stats.breakdown.documentsBytes / stats.maxQuota) * 100,
                      100
                    )}%`,
                  }}
                  title={`Documents: ${formatBytes(stats.breakdown.documentsBytes)}`}
                />
                <div
                  className="bg-purple-400 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (stats.breakdown.mediaBytes / stats.maxQuota) * 100,
                      100
                    )}%`,
                  }}
                  title={`Media: ${formatBytes(stats.breakdown.mediaBytes)}`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="tabular-nums font-mono">{stats.fileCount} items</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Online
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
