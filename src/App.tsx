import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  List,
  Upload,
  Folder as FolderIcon,
  Trash2,
  Download,
  Star,
  ArrowUpDown,
  RefreshCw,
  FolderPlus,
  Menu,
  ChevronRight,
  Check,
  User as UserIcon,
} from 'lucide-react';
import { CloudFile, Folder, StorageStats, ActiveTab, ViewMode, SortOption, User } from './types.ts';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { FileCard } from './components/FileCard.tsx';
import { FileTableView } from './components/FileTableView.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { ConnectDeviceModal } from './components/ConnectDeviceModal.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { FolderModal } from './components/FolderModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { RenameMoveModal } from './components/RenameMoveModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { getAuthToken, setAuthToken, removeAuthToken, fetchWithAuth } from './utils/api.ts';
import { auth, logOut } from './firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [connectDeviceOpen, setConnectDeviceOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState<CloudFile | null>(null);
  const [renameMoveModalOpen, setRenameMoveModalOpen] = useState(false);
  const [renameMoveFile, setRenameMoveFile] = useState<CloudFile | null>(null);
  const [renameMoveMode, setRenameMoveMode] = useState<'rename' | 'move'>('rename');

  // UI States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  // Check auth status on initial load with Firebase Auth and server fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setAuthToken(token);
          const user: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(user);
          setAuthChecking(false);
          setAuthModalOpen(false);
          return;
        } catch (err) {
          console.warn('Error reading Firebase ID token:', err);
        }
      }

      // Check server JWT token in localStorage
      const localToken = getAuthToken();
      if (localToken) {
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${localToken}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Unauthorized');
            return res.json();
          })
          .then((data) => {
            setCurrentUser(data.user);
            setAuthChecking(false);
          })
          .catch(() => {
            removeAuthToken();
            setCurrentUser(null);
            setAuthChecking(false);
            setAuthModalOpen(true);
          });
      } else {
        setAuthChecking(false);
        setAuthModalOpen(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch all user-scoped files and folders
  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setFiles([]);
      setFolders([]);
      setStats(null);
      return;
    }

    try {
      setLoading(true);
      const [filesRes, foldersRes, statsRes] = await Promise.all([
        fetchWithAuth('/api/files'),
        fetchWithAuth('/api/folders'),
        fetchWithAuth('/api/stats'),
      ]);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData);
      } else if (filesRes.status === 401) {
        removeAuthToken();
        setCurrentUser(null);
        setAuthModalOpen(true);
      }

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  const handleAuthSuccess = (user: User, token: string) => {
    setAuthToken(token);
    setCurrentUser(user);
    setAuthModalOpen(false);
    showToast(`Welcome, ${user.name}!`);
    loadData();
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch {
      // Ignore logout errors
    }
    removeAuthToken();
    setCurrentUser(null);
    setFiles([]);
    setFolders([]);
    setStats(null);
    setSelectedIds([]);
    setAuthModalOpen(true);
    showToast('Signed out successfully');
  };

  // Window drag & drop handler
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsWindowDragging(false);
        dragCounter = 0;
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsWindowDragging(false);
      dragCounter = 0;

      if (!currentUser) {
        setAuthModalOpen(true);
        return;
      }

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const droppedFiles = e.dataTransfer.files;
        const formData = new FormData();
        Array.from(droppedFiles).forEach((f) => formData.append('files', f));
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }

        try {
          showToast(`Uploading ${droppedFiles.length} file(s)...`);
          const res = await fetchWithAuth('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            showToast('Files uploaded successfully');
            loadData();
          } else {
            showToast('Failed to upload files');
          }
        } catch {
          showToast('Network error uploading files');
        }
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [currentFolderId, currentUser, loadData]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // 1. Tab / Category Filter
    if (activeTab === 'trash') {
      result = result.filter((f) => f.isTrash);
    } else {
      result = result.filter((f) => !f.isTrash);

      if (currentFolderId) {
        result = result.filter((f) => f.folderId === currentFolderId);
      } else {
        if (activeTab === 'images') {
          result = result.filter((f) => f.mimeType.startsWith('image/'));
        } else if (activeTab === 'documents') {
          result = result.filter(
            (f) =>
              f.mimeType.startsWith('text/') ||
              f.mimeType.includes('pdf') ||
              f.mimeType.includes('document') ||
              f.mimeType.includes('sheet') ||
              f.mimeType.includes('csv') ||
              f.originalName.endsWith('.md') ||
              f.originalName.endsWith('.txt') ||
              f.originalName.endsWith('.pdf')
          );
        } else if (activeTab === 'media') {
          result = result.filter(
            (f) => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/')
          );
        } else if (activeTab === 'archives') {
          result = result.filter(
            (f) =>
              f.mimeType.includes('zip') ||
              f.mimeType.includes('compressed') ||
              f.originalName.endsWith('.zip') ||
              f.originalName.endsWith('.rar')
          );
        } else if (activeTab === 'starred') {
          result = result.filter((f) => f.isStarred);
        }
      }
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.originalName.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return a.originalName.localeCompare(b.originalName);
        case 'name_desc':
          return b.originalName.localeCompare(a.originalName);
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        case 'date_asc':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'date_desc':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    return result;
  }, [files, activeTab, currentFolderId, searchQuery, sortOption]);

  const currentFolders = useMemo(() => {
    if (activeTab === 'trash' || searchQuery.trim()) return [];
    return folders.filter((f) => f.parentId === currentFolderId);
  }, [folders, currentFolderId, activeTab, searchQuery]);

  const activeFolderObj = useMemo(() => {
    return folders.find((f) => f.id === currentFolderId) || null;
  }, [folders, currentFolderId]);

  // Actions
  const handleToggleStar = async (id: string, current: boolean) => {
    try {
      const res = await fetchWithAuth(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !current }),
      });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, isStarred: !current } : f))
        );
        showToast(!current ? 'Added to Starred' : 'Removed from Starred');
      }
    } catch {
      showToast('Failed to update star');
    }
  };

  const handleDownload = (id: string, name: string) => {
    const token = getAuthToken();
    const link = document.createElement('a');
    link.href = `/api/files/${id}/download${token ? `?token=${token}` : ''}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${name}`);
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) return;
    const token = getAuthToken();
    const link = document.createElement('a');
    link.href = `/api/files/download-zip?ids=${selectedIds.join(',')}${
      token ? `&token=${token}` : ''
    }`;
    link.download = `AeroVault_Export_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${selectedIds.length} file(s) as ZIP...`);
  };

  const handleDownloadFolder = (folderId: string, folderName: string) => {
    const token = getAuthToken();
    const link = document.createElement('a');
    link.href = `/api/folders/${folderId}/download-zip${token ? `?token=${token}` : ''}`;
    link.download = `${folderName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Archive.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading folder "${folderName}" as ZIP...`);
  };

  const handleTrash = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/files/${id}/trash`, { method: 'POST' });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, isTrash: true } : f))
        );
        showToast('Moved to Trash');
        loadData();
      }
    } catch {
      showToast('Failed to move to trash');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/files/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, isTrash: false } : f))
        );
        showToast('Restored from Trash');
        loadData();
      }
    } catch {
      showToast('Failed to restore file');
    }
  };

  const handleDeletePermanently = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this file?')) return;
    try {
      const res = await fetchWithAuth(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        showToast('File permanently deleted');
        loadData();
      }
    } catch {
      showToast('Failed to delete file');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty entire trash? All items will be permanently erased.')) return;
    try {
      const res = await fetchWithAuth('/api/trash', { method: 'DELETE' });
      if (res.ok) {
        showToast('Trash emptied');
        loadData();
      }
    } catch {
      showToast('Failed to empty trash');
    }
  };

  const handleSaveFolder = async (name: string, color: string) => {
    try {
      if (folderToEdit) {
        const res = await fetchWithAuth(`/api/folders/${folderToEdit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color }),
        });
        if (res.ok) {
          showToast('Folder updated');
          loadData();
        }
      } else {
        const res = await fetchWithAuth('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            color,
            parentId: currentFolderId,
          }),
        });
        if (res.ok) {
          showToast('Folder created');
          loadData();
        }
      }
    } catch {
      showToast('Failed to save folder');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Delete folder "${folderName}"? Files inside will be moved to Root.`)) return;
    try {
      const res = await fetchWithAuth(`/api/folders/${folderId}`, { method: 'DELETE' });
      if (res.ok) {
        if (currentFolderId === folderId) {
          setCurrentFolderId(null);
        }
        showToast(`Folder "${folderName}" deleted`);
        loadData();
      }
    } catch {
      showToast('Failed to delete folder');
    }
  };

  const handleSaveRenameMove = async (newName?: string, targetFolderId?: string | null) => {
    if (!renameMoveFile) return;
    try {
      const payload: any = {};
      if (newName) payload.originalName = newName;
      if (targetFolderId !== undefined) payload.folderId = targetFolderId;

      const res = await fetchWithAuth(`/api/files/${renameMoveFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(newName ? 'File renamed' : 'File moved');
        loadData();
      }
    } catch {
      showToast('Failed to update file');
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleBatchTrash = async () => {
    for (const id of selectedIds) {
      await fetchWithAuth(`/api/files/${id}/trash`, { method: 'POST' });
    }
    setSelectedIds([]);
    showToast(`Moved ${selectedIds.length} files to trash`);
    loadData();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
          <span>Connecting to your private cloud storage...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500/30 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Drag & Drop Window Overlay */}
      {isWindowDragging && currentUser && (
        <div className="fixed inset-0 z-50 bg-sky-950/80 backdrop-blur-md border-4 border-dashed border-sky-400 flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-100">
          <div className="w-20 h-20 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-2xl mb-4 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">
            Drop files anywhere to upload
          </h2>
          <p className="text-sm text-sky-200">
            Files will be stored securely in your private AeroVault account
          </p>
        </div>
      )}

      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onUploadClick={() => {
          if (!currentUser) setAuthModalOpen(true);
          else setUploadModalOpen(true);
        }}
        onConnectDeviceClick={() => setConnectDeviceOpen(true)}
        currentFolder={activeFolderObj}
        activeTab={activeTab}
        onNavigateHome={() => {
          setCurrentFolderId(null);
          setActiveTab('all');
        }}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setCurrentFolderId(null);
            setSelectedIds([]);
          }}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={(fId) => {
            setCurrentFolderId(fId);
            setSelectedIds([]);
          }}
          onCreateFolderClick={() => {
            if (!currentUser) {
              setAuthModalOpen(true);
              return;
            }
            setFolderToEdit(null);
            setFolderModalOpen(true);
          }}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={(f) => {
            setFolderToEdit(f);
            setFolderModalOpen(true);
          }}
          stats={stats}
          onConnectDeviceClick={() => setConnectDeviceOpen(true)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onOpenAuth={() => setAuthModalOpen(true)}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {!currentUser ? (
            /* Unauthenticated Splash */
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center max-w-lg mx-auto my-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Your Private Cloud Vault</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Sign in or create a free account to store and organize your private photos, documents, and files with cross-device sync.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  Sign In or Register
                </button>
                <button
                  onClick={() => setConnectDeviceOpen(true)}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Connect Device
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Mobile Bar Switcher */}
              <div className="flex md:hidden items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200"
                >
                  <Menu className="w-4 h-4 text-sky-400" />
                  <span>Browse Folders</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-mono tabular-nums">
                    {filteredFiles.length} files
                  </span>
                </div>
              </div>

              {/* Breadcrumb Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => {
                      setCurrentFolderId(null);
                      setActiveTab('all');
                    }}
                    className="text-slate-400 hover:text-white transition-colors font-medium"
                  >
                    Drive
                  </button>
                  {activeFolderObj ? (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <FolderIcon
                          className="w-4 h-4"
                          style={{ color: activeFolderObj.color || '#38bdf8' }}
                        />
                        <span>{activeFolderObj.name}</span>
                        <button
                          onClick={() => handleDownloadFolder(activeFolderObj.id, activeFolderObj.name)}
                          className="ml-2 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-normal transition-colors cursor-pointer"
                          title="Download this entire folder as a ZIP archive"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Folder</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                      <span className="text-white font-semibold capitalize">
                        {activeTab === 'all'
                          ? 'All Files'
                          : activeTab === 'images'
                          ? 'Photos & Images'
                          : activeTab === 'documents'
                          ? 'Documents & Notes'
                          : activeTab === 'media'
                          ? 'Audio & Video'
                          : activeTab === 'starred'
                          ? 'Starred Files'
                          : 'Trash'}
                      </span>
                    </>
                  )}
                </div>

                {/* Workspace Controls & View Toggles */}
                <div className="flex items-center gap-2.5">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="date_desc" className="bg-slate-900">Newest First</option>
                      <option value="date_asc" className="bg-slate-900">Oldest First</option>
                      <option value="name_asc" className="bg-slate-900">Name (A-Z)</option>
                      <option value="name_desc" className="bg-slate-900">Name (Z-A)</option>
                      <option value="size_desc" className="bg-slate-900">Size (Largest)</option>
                      <option value="size_asc" className="bg-slate-900">Size (Smallest)</option>
                    </select>
                  </div>

                  {/* View Switcher: Grid vs Table */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-slate-800 text-sky-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'table'
                          ? 'bg-slate-800 text-sky-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Table View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={loadData}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Refresh Files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  {/* New Folder Quick Button */}
                  {activeTab !== 'trash' && (
                    <button
                      onClick={() => {
                        setFolderToEdit(null);
                        setFolderModalOpen(true);
                      }}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-sky-400" />
                      <span>New Folder</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Trash Warning Banner */}
              {activeTab === 'trash' && (
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
                    <div className="text-xs">
                      <span className="font-semibold text-red-200 block">
                        Trash Bin ({filteredFiles.length} items)
                      </span>
                      <span className="text-slate-400">
                        Items placed in trash can be restored or permanently removed.
                      </span>
                    </div>
                  </div>
                  {filteredFiles.length > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs self-start sm:self-auto transition-colors cursor-pointer"
                    >
                      Empty Trash Forever
                    </button>
                  )}
                </div>
              )}

              {/* Batch Multi-Select Action Bar */}
              {selectedIds.length > 0 && (
                <div className="p-3 bg-sky-950/50 border border-sky-500/30 rounded-xl flex items-center justify-between gap-4 text-xs animate-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sky-300 font-mono tabular-nums">
                      {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors shadow-md shadow-sky-500/20 cursor-pointer"
                      title="Download all selected files in a single ZIP file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Selected (ZIP)</span>
                    </button>

                    {activeTab !== 'trash' && (
                      <button
                        onClick={handleBatchTrash}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Move to Trash</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Folders Cards Strip */}
              {currentFolders.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Folders
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {currentFolders.map((folder) => {
                      const countInFolder = files.filter(
                        (f) => f.folderId === folder.id && !f.isTrash
                      ).length;
                      return (
                        <div
                          key={folder.id}
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="group p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer flex items-center gap-3"
                        >
                          <FolderIcon
                            className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110"
                            style={{ color: folder.color || '#38bdf8' }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 truncate block">
                              {folder.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                              {countInFolder} item{countInFolder === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files List / Grid Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                <span>Files ({filteredFiles.length})</span>
                {searchQuery && (
                  <span className="text-sky-400 font-normal normal-case">
                    Filtered by &quot;{searchQuery}&quot;
                  </span>
                )}
              </div>

              {/* Main Files Display */}
              {loading && files.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 border border-slate-800 rounded-xl h-44 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredFiles.length === 0 ? (
                /* Empty State */
                <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center max-w-md mx-auto my-12">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-sky-400 flex items-center justify-center mb-4">
                    {activeTab === 'trash' ? (
                      <Trash2 className="w-7 h-7 text-slate-500" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {activeTab === 'trash'
                      ? 'Trash is empty'
                      : searchQuery
                      ? 'No matching files found'
                      : 'Your cloud storage is empty'}
                  </h3>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed max-w-xs">
                    {activeTab === 'trash'
                      ? 'Deleted files and photos will appear here.'
                      : searchQuery
                      ? 'Try searching with a different term or clear the filter.'
                      : 'Upload your photos, documents, PDFs, or files from any device.'}
                  </p>
                  {activeTab !== 'trash' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/20 cursor-pointer"
                      >
                        Upload Files
                      </button>
                      <button
                        onClick={() => setConnectDeviceOpen(true)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Connect Phone
                      </button>
                    </div>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      isSelected={selectedIds.includes(file.id)}
                      onToggleSelect={handleToggleSelect}
                      onPreview={(f) => setPreviewFile(f)}
                      onToggleStar={handleToggleStar}
                      onDownload={handleDownload}
                      onShare={(f) => {
                        setFileToShare(f);
                        setShareModalOpen(true);
                      }}
                      onRename={(f) => {
                        setRenameMoveFile(f);
                        setRenameMoveMode('rename');
                        setRenameMoveModalOpen(true);
                      }}
                      onMove={(f) => {
                        setRenameMoveFile(f);
                        setRenameMoveMode('move');
                        setRenameMoveModalOpen(true);
                      }}
                      onTrash={handleTrash}
                      onRestore={handleRestore}
                      onDeletePermanently={handleDeletePermanently}
                      folders={folders}
                    />
                  ))}
                </div>
              ) : (
                /* Table / List View */
                <FileTableView
                  files={filteredFiles}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onPreview={(f) => setPreviewFile(f)}
                  onToggleStar={handleToggleStar}
                  onDownload={handleDownload}
                  onShare={(f) => {
                    setFileToShare(f);
                    setShareModalOpen(true);
                  }}
                  onTrash={handleTrash}
                  onRestore={handleRestore}
                  onDeletePermanently={handleDeletePermanently}
                  isTrashView={activeTab === 'trash'}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Lightbox File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        filesList={filteredFiles}
        onClose={() => setPreviewFile(null)}
        onNavigateFile={(nextFile) => setPreviewFile(nextFile)}
        onDownload={handleDownload}
        onShare={(f) => {
          setFileToShare(f);
          setShareModalOpen(true);
        }}
        onTrash={handleTrash}
        onToggleStar={handleToggleStar}
      />

      {/* Connect Any Device Modal */}
      <ConnectDeviceModal
        isOpen={connectDeviceOpen}
        onClose={() => setConnectDeviceOpen(false)}
        onTriggerMobileUpload={() => setUploadModalOpen(true)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        folders={folders}
        currentFolderId={currentFolderId}
        onUploadSuccess={() => {
          loadData();
          showToast('Upload finished');
        }}
      />

      {/* Create / Rename Folder Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        folderToEdit={folderToEdit}
        onSave={handleSaveFolder}
      />

      {/* Share Link Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        file={fileToShare}
        onClose={() => setShareModalOpen(false)}
        onShareUpdated={() => loadData()}
      />

      {/* Rename / Move File Modal */}
      <RenameMoveModal
        isOpen={renameMoveModalOpen}
        file={renameMoveFile}
        mode={renameMoveMode}
        folders={folders}
        onClose={() => setRenameMoveModalOpen(false)}
        onSave={handleSaveRenameMove}
      />

      {/* Authentication Modal (Register / Login) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          if (currentUser) setAuthModalOpen(false);
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
