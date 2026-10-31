/**
 * In-App IndexedDB Storage for Isolated Photos & Sync Queue
 * Photos NEVER touch the OS native photo gallery.
 */

const DB_NAME = 'MeGalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let dbInstance = null;

export function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB open error: ' + event.target.error));
    };
  });
}

/**
 * Generate a lightweight thumbnail data URL from an image Blob
 */
async function generateThumbnail(blob, maxDim = 240) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Save captured photo blob strictly into isolated IndexedDB queue
 */
export async function savePhoto({ blob, targetFolderId }) {
  const db = await initDB();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const id = `photo_${timestamp}_${randomSuffix}`;
  const filename = `MeGallery_${formatDateForFilename(timestamp)}_${randomSuffix}.jpg`;
  const thumbnail = await generateThumbnail(blob);

  const photoRecord = {
    id,
    blob,
    thumbnail,
    filename,
    size: blob.size,
    timestamp,
    targetFolderId: targetFolderId || '',
    status: 'pending', // 'pending' | 'uploading' | 'synced' | 'failed'
    retryCount: 0,
    gdriveFileId: null,
    errorMsg: null
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(photoRecord);

    req.onsuccess = () => resolve(photoRecord);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPhotos() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const req = index.openCursor(null, 'prev'); // newest first
    const results = [];

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotoById(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingPhotos() {
  const all = await getAllPhotos();
  return all.filter((p) => p.status === 'pending' || p.status === 'failed');
}

export async function updatePhotoStatus(id, updates) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) {
        return reject(new Error('Photo not found: ' + id));
      }
      Object.assign(record, updates);
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deletePhoto(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSyncedPhotos() {
  const all = await getAllPhotos();
  const synced = all.filter((p) => p.status === 'synced');
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let count = 0;

    synced.forEach((p) => {
      store.delete(p.id);
      count++;
    });

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStorageStats() {
  const all = await getAllPhotos();
  let totalBytes = 0;
  let pendingCount = 0;
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of all) {
    totalBytes += item.size || 0;
    if (item.status === 'synced') syncedCount++;
    else if (item.status === 'failed') failedCount++;
    else pendingCount++;
  }

  return {
    totalPhotos: all.length,
    pendingCount,
    syncedCount,
    failedCount,
    totalBytes,
    totalMb: (totalBytes / (1024 * 1024)).toFixed(2)
  };
}

function formatDateForFilename(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
