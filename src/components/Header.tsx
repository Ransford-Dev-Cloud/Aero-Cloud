import React, { useState } from 'react';
import { Cloud, Search, Smartphone, Upload, QrCode, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUploadClick: () => void;
  onConnectDeviceClick: () => void;
  currentFolder: { id: string; name: string } | null;
  activeTab: string;
  onNavigateHome: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onUploadClick,
  onConnectDeviceClick,
  currentFolder,
  activeTab,
  onNavigateHome,
  currentUser,
  onSignOut,
  onOpenAuth,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getBreadcrumbTitle = () => {
    if (currentFolder) return currentFolder.name;
    switch (activeTab) {
      case 'images':
        return 'Photos & Images';
      case 'documents':
        return 'Documents & Notes';
      case 'media':
        return 'Audio & Video';
      case 'archives':
        return 'Archives';
      case 'starred':
        return 'Starred Files';
      case 'trash':
        return 'Trash';
      default:
        return 'All Files';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Brand & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left focus:outline-none group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold text-white tracking-tight block leading-tight">
              AeroVault
            </span>
            <span className="text-[11px] text-slate-400 font-medium block leading-none">
              Cloud Drive
            </span>
          </div>
        </button>

        <span className="text-slate-600 hidden md:inline">/</span>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 truncate">
          <button
            onClick={onNavigateHome}
            className="hover:text-white text-slate-400 transition-colors whitespace-nowrap"
          >
            Drive
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold truncate">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Zone 2: Search Bar */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files, photos, tags..."
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Actions & Account */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onConnectDeviceClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 hover:border-sky-500/40 transition-all cursor-pointer whitespace-nowrap"
          title="Connect phone or another device"
        >
          <Smartphone className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Connect Device</span>
          <span className="sm:hidden flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5" />
          </span>
        </button>

        {currentUser ? (
          <>
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>

            {/* User Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-sky-400/30 shadow-inner hover:scale-105 transition-transform cursor-pointer"
                title={currentUser.name}
              >
                {getInitials(currentUser.name)}
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-12 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in duration-100"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-800/80">
                    <p className="font-semibold text-white truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-red-500/10 text-red-400 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </header>
  );
};
