export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface CloudFile {
  id: string;
  userId?: string;
  originalName: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  folderId: string | null;
  isStarred: boolean;
  isTrash: boolean;
  trashedAt: string | null;
  tags: string[];
  downloadCount: number;
  shareId: string | null;
  deviceSource: string;
}

export interface Folder {
  id: string;
  userId?: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  color: string;
}

export interface StorageStats {
  totalBytes: number;
  maxQuota: number;
  usedPercentage: number;
  fileCount: number;
  folderCount: number;
  trashCount: number;
  breakdown: {
    imagesBytes: number;
    documentsBytes: number;
    mediaBytes: number;
    archivesBytes: number;
    othersBytes: number;
  };
}

export interface DeviceConnectInfo {
  appUrl: string;
  qrCode: string;
  clientIp?: string;
  userDevice: string;
  pairingCode: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export type ViewMode = 'grid' | 'table';
export type ActiveTab = 'all' | 'images' | 'documents' | 'media' | 'archives' | 'starred' | 'trash';
export type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';
