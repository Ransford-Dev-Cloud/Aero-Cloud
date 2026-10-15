import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { CloudFile, Folder } from './types.ts';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Cloud Storage
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test Firestore Connection as required by skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline check:', error.message);
    }
  }
}
testFirestoreConnection();

// --- Auth Methods ---

export async function signInWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function signInWithEmail(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function signUpWithEmail(email: string, pass: string, displayName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
  }
  return userCredential;
}

export async function logOut() {
  return await signOut(auth);
}

// --- Cloud Storage & Firestore Operations ---

export async function uploadFileToFirebaseStorage(
  userId: string,
  file: File,
  folderId: string | null,
  onProgress?: (progress: number) => void
): Promise<CloudFile> {
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `users/${userId}/files/${fileId}_${file.name}`;
  const storageReference = ref(storage, storagePath);

  try {
    const uploadTask = uploadBytesResumable(storageReference, file);

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    const newFile: CloudFile = {
      id: fileId,
      userId,
      originalName: file.name,
      storedFilename: storagePath,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      folderId: folderId || null,
      isStarred: false,
      isTrash: false,
      trashedAt: null,
      tags: [],
      downloadCount: 0,
      shareId: null,
      deviceSource: 'Firebase Cloud Storage',
    };

    // Store in Firestore
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await setDoc(fileDocRef, {
      ...newFile,
      downloadUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newFile;
  } catch (storageErr) {
    console.warn('Firebase direct storage fallback to server storage:', storageErr);
    // Fallback: upload to local Express server storage
    const formData = new FormData();
    formData.append('files', file);
    if (folderId) formData.append('folderId', folderId);
    formData.append('deviceSource', 'Web Cloud Upload');

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    const data = await res.json();
    return data.files[0];
  }
}

// Delete file
export async function deleteFileFromFirebase(
  userId: string,
  fileId: string,
  storagePath?: string
) {
  try {
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await deleteDoc(fileDocRef);

    if (storagePath && storagePath.startsWith('users/')) {
      const storageReference = ref(storage, storagePath);
      await deleteObject(storageReference).catch(() => {});
    }
  } catch {
    // If not in Firestore, delete from server
    await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
  }
}

// Toggle Star
export async function toggleStarInFirestore(
  userId: string,
  fileId: string,
  isStarred: boolean
) {
  try {
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await updateDoc(fileDocRef, {
      isStarred: !isStarred,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !isStarred }),
    });
  }
}

// Move to Trash
export async function moveFileToTrashInFirestore(userId: string, fileId: string) {
  try {
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await updateDoc(fileDocRef, {
      isTrash: true,
      trashedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    await fetch(`/api/files/${fileId}/trash`, { method: 'POST' });
  }
}

// Restore from Trash
export async function restoreFileInFirestore(userId: string, fileId: string) {
  try {
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await updateDoc(fileDocRef, {
      isTrash: false,
      trashedAt: null,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await fetch(`/api/files/${fileId}/restore`, { method: 'POST' });
  }
}

// Rename File
export async function renameFileInFirestore(
  userId: string,
  fileId: string,
  newName: string
) {
  try {
    const fileDocRef = doc(db, 'users', userId, 'files', fileId);
    await updateDoc(fileDocRef, {
      originalName: newName,
      updatedAt: serverTimestamp(),
    });
  } catch {
    await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalName: newName }),
    });
  }
}

// Create Folder
export async function createFolderInFirestore(
  userId: string,
  name: string,
  color: string,
  parentId: string | null
): Promise<Folder> {
  const folderId = `folder-${Date.now()}`;
  const newFolder: Folder = {
    id: folderId,
    userId,
    name,
    color,
    parentId,
    createdAt: new Date().toISOString(),
  };

  try {
    const folderDocRef = doc(db, 'users', userId, 'folders', folderId);
    await setDoc(folderDocRef, {
      ...newFolder,
      createdAt: serverTimestamp(),
    });
  } catch {
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, parentId }),
    });
  }

  return newFolder;
}

// Delete Folder
export async function deleteFolderInFirestore(userId: string, folderId: string) {
  try {
    const folderDocRef = doc(db, 'users', userId, 'folders', folderId);
    await deleteDoc(folderDocRef);
  } catch {
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
  }
}
