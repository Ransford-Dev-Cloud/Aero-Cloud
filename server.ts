import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
// @ts-ignore
import { ZipArchive } from 'archiver';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'aerovault-cloud-secret-key-2026';

// Ensure data & upload directories exist
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface StoredFile {
  id: string;
  userId: string;
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
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  color: string;
}

interface DatabaseSchema {
  users: User[];
  files: StoredFile[];
  folders: Folder[];
}

// Read database
function readDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [],
        files: parsed.files || [],
        folders: parsed.folders || [],
      };
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return { users: [], files: [], folders: [] };
}

// Write database
function writeDb(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150 MB per file limit
  },
});

// User Request interface
interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}

// Authentication middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Check Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    // Check query param (for <img>, <video>, download links)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const db = readDb();
    const user = db.users.find((u) => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or has been removed.' });
    }

    req.userId = user.id;
    req.user = user;
    return next();
  } catch {
    // If not local JWT, check if it is a Firebase Auth ID token
    try {
      const decodedFb = jwt.decode(token) as any;
      if (decodedFb && (decodedFb.sub || decodedFb.user_id)) {
        const userId = decodedFb.sub || decodedFb.user_id;
        const email = decodedFb.email || '';
        const name = decodedFb.name || (email ? email.split('@')[0] : 'User');

        const db = readDb();
        let user = db.users.find((u) => u.id === userId || (email && u.email === email));

        if (!user) {
          user = {
            id: userId,
            name,
            email,
            passwordHash: '',
            createdAt: new Date().toISOString(),
          };
          db.users.push(user);
          writeDb(db);
        }

        req.userId = user.id;
        req.user = user;
        return next();
      }
    } catch (fbErr) {
      console.warn('Firebase ID token parse error:', fbErr);
    }
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

// Optional auth (for file view which might be public via shareId)
function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      const db = readDb();
      const user = db.users.find((u) => u.id === decoded.userId);
      if (user) {
        req.userId = user.id;
        req.user = user;
        return next();
      }
    } catch {
      try {
        const decodedFb = jwt.decode(token) as any;
        if (decodedFb && (decodedFb.sub || decodedFb.user_id)) {
          const userId = decodedFb.sub || decodedFb.user_id;
          const email = decodedFb.email || '';
          const name = decodedFb.name || (email ? email.split('@')[0] : 'User');
          const db = readDb();
          let user = db.users.find((u) => u.id === userId || (email && u.email === email));
          if (!user) {
            user = {
              id: userId,
              name,
              email,
              passwordHash: '',
              createdAt: new Date().toISOString(),
            };
            db.users.push(user);
            writeDb(db);
          }
          req.userId = user.id;
          req.user = user;
          return next();
        }
      } catch {
        // Ignore
      }
    }
  }
  next();
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  function getDeviceFromUA(ua: string | undefined): string {
    if (!ua) return 'Web Browser';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Macintosh/i.test(ua)) return 'Mac Desktop';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux Workstation';
    return 'Web Browser';
  }

  // --- Auth Endpoints ---

  // 1. Register new user
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();

    // Check if user already exists
    const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token,
    });
  });

  // 2. Login user
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  });

  // 3. Get current user profile
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  });

  // --- Authenticated Storage Endpoints (Partitioned strictly by userId) ---

  // 4. Storage statistics for current user
  app.get('/api/stats', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const db = readDb();
    const activeFiles = db.files.filter((f) => f.userId === userId && !f.isTrash);
    const userFolders = db.folders.filter((f) => f.userId === userId);

    let totalBytes = 0;
    let imagesBytes = 0;
    let documentsBytes = 0;
    let mediaBytes = 0;
    let archivesBytes = 0;
    let othersBytes = 0;

    for (const f of activeFiles) {
      totalBytes += f.size;
      const mime = f.mimeType.toLowerCase();
      const name = f.originalName.toLowerCase();
      if (mime.startsWith('image/')) {
        imagesBytes += f.size;
      } else if (
        mime.startsWith('text/') ||
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('sheet') ||
        mime.includes('document') ||
        mime.includes('csv') ||
        name.endsWith('.md') ||
        name.endsWith('.pdf') ||
        name.endsWith('.txt')
      ) {
        documentsBytes += f.size;
      } else if (mime.startsWith('video/') || mime.startsWith('audio/')) {
        mediaBytes += f.size;
      } else if (
        mime.includes('zip') ||
        mime.includes('tar') ||
        mime.includes('compressed') ||
        name.endsWith('.zip') ||
        name.endsWith('.rar') ||
        name.endsWith('.7z')
      ) {
        archivesBytes += f.size;
      } else {
        othersBytes += f.size;
      }
    }

    const maxQuota = 2 * 1024 * 1024 * 1024; // 2 GB container cloud capacity

    res.json({
      totalBytes,
      maxQuota,
      usedPercentage: Number(((totalBytes / maxQuota) * 100).toFixed(2)),
      fileCount: activeFiles.length,
      folderCount: userFolders.length,
      trashCount: db.files.filter((f) => f.userId === userId && f.isTrash).length,
      breakdown: {
        imagesBytes,
        documentsBytes,
        mediaBytes,
        archivesBytes,
        othersBytes,
      },
    });
  });

  // 5. List files for current user
  app.get('/api/files', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const db = readDb();
    let result = db.files.filter((f) => f.userId === userId);

    const { folderId, isStarred, isTrash, category, search, tag } = req.query;

    if (isTrash === 'true') {
      result = result.filter((f) => f.isTrash);
    } else {
      result = result.filter((f) => !f.isTrash);

      if (folderId !== undefined) {
        if (folderId === 'all') {
          // No folder filter
        } else if (folderId === 'root') {
          result = result.filter((f) => f.folderId === null);
        } else {
          result = result.filter((f) => f.folderId === folderId);
        }
      }

      if (isStarred === 'true') {
        result = result.filter((f) => f.isStarred);
      }

      if (category && typeof category === 'string' && category !== 'all') {
        if (category === 'images') {
          result = result.filter((f) => f.mimeType.startsWith('image/'));
        } else if (category === 'documents') {
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
        } else if (category === 'media') {
          result = result.filter((f) => f.mimeType.startsWith('video/') || f.mimeType.startsWith('audio/'));
        } else if (category === 'archives') {
          result = result.filter(
            (f) =>
              f.mimeType.includes('zip') ||
              f.mimeType.includes('compressed') ||
              f.originalName.endsWith('.zip') ||
              f.originalName.endsWith('.rar') ||
              f.originalName.endsWith('.7z')
          );
        }
      }

      if (tag && typeof tag === 'string') {
        result = result.filter((f) => f.tags.includes(tag));
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.originalName.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort newest first by default
    result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.json(result);
  });

  // 6. List folders for current user
  app.get('/api/folders', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const db = readDb();
    res.json(db.folders.filter((f) => f.userId === userId));
  });

  // 7. Create folder for current user
  app.post('/api/folders', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { name, parentId, color } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const db = readDb();
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      userId,
      name: name.trim(),
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      color: color || '#38bdf8',
    };

    db.folders.push(newFolder);
    writeDb(db);
    res.status(201).json(newFolder);
  });

  // 8. Update / Rename folder
  app.patch('/api/folders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, color } = req.body;
    const db = readDb();
    const folderIndex = db.folders.findIndex((f) => f.id === id && f.userId === userId);

    if (folderIndex === -1) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (name && typeof name === 'string') {
      db.folders[folderIndex].name = name.trim();
    }
    if (color && typeof color === 'string') {
      db.folders[folderIndex].color = color;
    }

    writeDb(db);
    res.json(db.folders[folderIndex]);
  });

  // 9. Delete folder
  app.delete('/api/folders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const db = readDb();
    const folderIndex = db.folders.findIndex((f) => f.id === id && f.userId === userId);

    if (folderIndex === -1) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Move files in this folder to root
    db.files = db.files.map((f) =>
      f.userId === userId && f.folderId === id ? { ...f, folderId: null } : f
    );
    db.folders.splice(folderIndex, 1);
    writeDb(db);
    res.json({ success: true, message: 'Folder deleted and files moved to Root' });
  });

  // 10. Multi-file upload for current user
  app.post('/api/upload', requireAuth, upload.array('files', 25), (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const targetFolderId = req.body.folderId === 'root' || !req.body.folderId ? null : req.body.folderId;
    const clientDevice = req.body.deviceSource || getDeviceFromUA(req.headers['user-agent']);

    const db = readDb();
    const createdFiles: StoredFile[] = [];

    for (const f of files) {
      const fileId = path.parse(f.filename).name;
      const newFile: StoredFile = {
        id: fileId,
        userId,
        originalName: f.originalname,
        storedFilename: f.filename,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size,
        uploadedAt: new Date().toISOString(),
        folderId: targetFolderId,
        isStarred: false,
        isTrash: false,
        trashedAt: null,
        tags: [],
        downloadCount: 0,
        shareId: null,
        deviceSource: clientDevice,
      };

      db.files.unshift(newFile);
      createdFiles.push(newFile);
    }

    writeDb(db);
    res.status(201).json({
      success: true,
      count: createdFiles.length,
      files: createdFiles,
    });
  });

  // 11. View / Stream file (User owned or via public share)
  app.get('/api/files/:id/view', optionalAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const file = db.files.find((f) => f.id === id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Must be either owner or file is publicly shared
    const isOwner = req.userId && file.userId === req.userId;
    const isShared = !!file.shareId && !file.isTrash;

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const filePath = path.resolve(UPLOADS_DIR, file.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Physical file missing from storage disk' });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range && (file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.mimeType,
      });
      fileStream.pipe(res);
    } else {
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // 12. Download file
  app.get('/api/files/:id/download', optionalAuth, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const db = readDb();
    const file = db.files.find((f) => f.id === id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const isOwner = req.userId && file.userId === req.userId;
    const isShared = !!file.shareId && !file.isTrash;

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.resolve(UPLOADS_DIR, file.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing from storage disk' });
    }

    file.downloadCount += 1;
    writeDb(db);

    res.download(filePath, file.originalName);
  });

  // 13. Download multiple selected files as a ZIP archive
  app.get('/api/files/download-zip', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      return res.status(400).send('No file IDs specified');
    }
    const ids = idsParam.split(',').filter(Boolean);
    const db = readDb();
    const filesToZip = db.files.filter(
      (f) => f.userId === userId && ids.includes(f.id) && !f.isTrash
    );

    if (filesToZip.length === 0) {
      return res.status(404).send('No active files found for requested IDs');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="AeroVault_Export_${Date.now()}.zip"`
    );

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(res);

    for (const f of filesToZip) {
      const fPath = path.resolve(UPLOADS_DIR, f.storedFilename);
      if (fs.existsSync(fPath)) {
        archive.file(fPath, { name: f.originalName });
        f.downloadCount += 1;
      }
    }
    writeDb(db);
    archive.finalize();
  });

  // 14. Download whole folder as a ZIP archive
  app.get('/api/folders/:id/download-zip', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const db = readDb();
    const folder = db.folders.find((f) => f.id === id && f.userId === userId);

    if (!folder) {
      return res.status(404).send('Folder not found');
    }

    const filesInFolder = db.files.filter(
      (f) => f.userId === userId && f.folderId === id && !f.isTrash
    );
    const safeName = folder.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}_Export_${Date.now()}.zip"`
    );

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(res);

    for (const f of filesInFolder) {
      const fPath = path.resolve(UPLOADS_DIR, f.storedFilename);
      if (fs.existsSync(fPath)) {
        archive.file(fPath, { name: f.originalName });
        f.downloadCount += 1;
      }
    }
    writeDb(db);
    archive.finalize();
  });

  // 15. Update file metadata (rename, move, star, tags)
  app.patch('/api/files/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { originalName, folderId, isStarred, tags } = req.body;
    const db = readDb();
    const fileIndex = db.files.findIndex((f) => f.id === id && f.userId === userId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (originalName && typeof originalName === 'string') {
      db.files[fileIndex].originalName = originalName.trim();
    }
    if (folderId !== undefined) {
      db.files[fileIndex].folderId = folderId === 'root' || !folderId ? null : folderId;
    }
    if (typeof isStarred === 'boolean') {
      db.files[fileIndex].isStarred = isStarred;
    }
    if (Array.isArray(tags)) {
      db.files[fileIndex].tags = tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());
    }

    writeDb(db);
    res.json(db.files[fileIndex]);
  });

  // 16. Move file to trash
  app.post('/api/files/:id/trash', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const db = readDb();
    const fileIndex = db.files.findIndex((f) => f.id === id && f.userId === userId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    db.files[fileIndex].isTrash = true;
    db.files[fileIndex].trashedAt = new Date().toISOString();
    writeDb(db);
    res.json(db.files[fileIndex]);
  });

  // 17. Restore file from trash
  app.post('/api/files/:id/restore', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const db = readDb();
    const fileIndex = db.files.findIndex((f) => f.id === id && f.userId === userId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    db.files[fileIndex].isTrash = false;
    db.files[fileIndex].trashedAt = null;
    writeDb(db);
    res.json(db.files[fileIndex]);
  });

  // 18. Permanently delete single file
  app.delete('/api/files/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const db = readDb();
    const fileIndex = db.files.findIndex((f) => f.id === id && f.userId === userId);

    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = db.files[fileIndex];
    const filePath = path.resolve(UPLOADS_DIR, file.storedFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Could not delete disk file:', err);
      }
    }

    db.files.splice(fileIndex, 1);
    writeDb(db);
    res.json({ success: true, message: 'File permanently deleted' });
  });

  // 19. Empty trash for current user
  app.delete('/api/trash', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const db = readDb();
    const trashedFiles = db.files.filter((f) => f.userId === userId && f.isTrash);

    for (const file of trashedFiles) {
      const filePath = path.resolve(UPLOADS_DIR, file.storedFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn('Could not delete disk file:', err);
        }
      }
    }

    db.files = db.files.filter((f) => !(f.userId === userId && f.isTrash));
    writeDb(db);
    res.json({ success: true, deletedCount: trashedFiles.length });
  });

  // 20. Toggle or generate public share link
  app.post('/api/files/:id/share', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { enable } = req.body;
    const db = readDb();
    const file = db.files.find((f) => f.id === id && f.userId === userId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (enable) {
      if (!file.shareId) {
        file.shareId = `share-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      }
    } else {
      file.shareId = null;
    }

    writeDb(db);
    res.json({
      fileId: file.id,
      shareId: file.shareId,
      isShared: !!file.shareId,
    });
  });

  // 21. Access shared file
  app.get('/api/share/:shareId', (req, res) => {
    const { shareId } = req.params;
    const db = readDb();
    const file = db.files.find((f) => f.shareId === shareId && !f.isTrash);

    if (!file) {
      return res.status(404).json({ error: 'Shared link not found or file has been deleted' });
    }

    res.json({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt,
      shareId: file.shareId,
    });
  });

  // 22. Device Connect Info & QR Code
  app.get('/api/device/connect-info', async (req, res) => {
    const appUrl =
      process.env.APP_URL ||
      `${req.protocol}://${req.get('host') || 'localhost:3000'}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(appUrl, {
        margin: 1,
        scale: 6,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      res.json({
        appUrl,
        qrCode: qrDataUrl,
        clientIp: req.ip || req.socket.remoteAddress,
        userDevice: getDeviceFromUA(req.headers['user-agent']),
        pairingCode: 'AV-' + Math.floor(100000 + Math.random() * 900000),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate QR code', message: err.message });
    }
  });

  // --- Vite / Frontend Handler ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AeroVault Cloud Storage Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
