/**
 * In-App IndexedDB Storage for Isolated Photos & Sync Queue
 * Photos NEVER touch the OS native photo gallery.
 */

import { sanitizeFilename } from './utils/gdriveLink.js';

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
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      dbInstance.onversionchange = () => {
        if (dbInstance) dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB open error: ' + event.target.error));
    };
  });
}

async function withDB(operation) {
  const run = async () => {
    const db = await initDB();
    return await operation(db);
  };

  try {
    return await run();
  } catch (err) {
    const msg = err?.message || '';
    if (err?.name === 'InvalidStateError' || msg.includes('closing') || msg.includes('closed')) {
      dbInstance = null;
      return await run();
    }
    throw err;
  }
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch (err) {
    console.warn('Persistent storage request skipped:', err);
  }
  return false;
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
export async function savePhoto({ blob, targetFolderId, prefix, location }) {
  const db = await initDB();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const id = `photo_${timestamp}_${randomSuffix}`;
  const activePrefix = (prefix && typeof prefix === 'string' && prefix.trim()) ? prefix.trim() : 'MeGallery_';
  const filename = `${activePrefix}${formatDateForFilename(timestamp)}_${randomSuffix}.jpg`;
  const thumbnail = await generateThumbnail(blob);

  const photoRecord = {
    id,
    blob,
    thumbnail,
    filename,
    size: blob.size,
    timestamp,
    location: location || null,
    targetFolderId: targetFolderId || '',
    status: 'pending', // 'pending' | 'uploading' | 'synced' | 'failed'
    retryCount: 0,
    gdriveFileId: null,
    errorMsg: null
  };

  return withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(photoRecord);

        req.onsuccess = () => resolve(photoRecord);
        req.onerror = () => reject(req.error);
      })
  );
}

/**
 * Scan all records safely via cursor; falls back to key-cursor rescue if a corrupt Blob aborts cursor scan.
 */
async function scanRecordsSafe(onRecord, direction = 'prev') {
  try {
    await withDB(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const index = store.index('timestamp');
          const req = index.openCursor(null, direction);

          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              try {
                onRecord(cursor.value);
              } catch (cbErr) {
                console.warn('Cursor callback warning:', cbErr);
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          req.onerror = () => reject(req.error);
          tx.onerror = () => reject(tx.error || new Error('Cursor transaction failed'));
        })
    );
    return;
  } catch (cursorErr) {
    console.warn('Primary cursor scan gagal, menjalankan Key-Cursor Rescue:', cursorErr);
  }

  // Fallback Plan 5: Collect primary keys only, then fetch one-by-one so 1 corrupt Blob cannot lock healthy photos
  const keys = await withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const req = index.openKeyCursor(null, direction);
        const list = [];

        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            list.push(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve(list);
          }
        };
        req.onerror = () => reject(req.error);
      })
  );

  for (const key of keys) {
    try {
      const record = await getPhotoById(key);
      if (record) {
        onRecord(record);
      }
    } catch (itemErr) {
      console.warn(`Melewati record korup ${key}:`, itemErr);
    }
  }
}

export async function getAllPhotos() {
  const results = [];
  await scanRecordsSafe((record) => {
    results.push(record);
  }, 'prev');
  return results;
}

export async function getGalleryOverview() {
  let totalPhotos = 0;
  let totalBytes = 0;
  let pendingCount = 0;
  let syncedCount = 0;
  let failedCount = 0;
  let latestThumbnail = null;

  await scanRecordsSafe((item) => {
    totalPhotos++;
    totalBytes += item.size || 0;
    if (!latestThumbnail && item.thumbnail) {
      latestThumbnail = item.thumbnail;
    }
    if (item.status === 'synced') syncedCount++;
    else if (item.status === 'failed') failedCount++;
    else pendingCount++;
  }, 'prev');

  return {
    totalPhotos,
    pendingCount,
    syncedCount,
    failedCount,
    totalBytes,
    totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
    latestThumbnail
  };
}

export async function getPhotoMetadataList() {
  const list = [];
  await scanRecordsSafe((item) => {
    list.push({
      id: item.id,
      filename: item.filename,
      thumbnail: item.thumbnail || '',
      status: item.status,
      timestamp: item.timestamp
    });
  }, 'prev');
  return list;
}

export async function getPhotoById(id) {
  return withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getPendingPhotoIds() {
  const ids = [];
  await scanRecordsSafe((item) => {
    if (item.status === 'pending' || item.status === 'failed' || item.status === 'uploading') {
      ids.push(item.id);
    }
  }, 'next');
  return ids;
}

export async function getPhotoMetaForExport(mode = 'all') {
  const list = [];
  await scanRecordsSafe((item) => {
    const isPending = item.status === 'pending' || item.status === 'failed' || item.status === 'uploading';
    if (mode === 'pending' && !isPending) {
      return;
    }
    list.push({
      id: item.id,
      filename: item.filename,
      size: item.size || 0,
      timestamp: item.timestamp,
      location: item.location || null,
      targetFolderId: item.targetFolderId || '',
      status: item.status || 'pending',
      retryCount: item.retryCount || 0,
      gdriveFileId: item.gdriveFileId || null,
      errorMsg: item.errorMsg || null
    });
  }, 'next');
  return list;
}

export async function getPendingPhotos() {
  const all = await getAllPhotos();
  return all.filter((p) => p.status === 'pending' || p.status === 'failed');
}

export async function updatePhotoStatus(id, updates) {
  return withDB(
    (db) =>
      new Promise((resolve, reject) => {
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
      })
  );
}

export async function renamePhoto(id, newFilename) {
  const cleanName = sanitizeFilename(newFilename);
  return updatePhotoStatus(id, { filename: cleanName });
}

export async function importPhotoRecord({ blob, meta = {}, filename }) {
  if (!blob || blob.size === 0) {
    throw new Error('Blob foto kosong saat impor.');
  }

  const timestamp = meta.timestamp || Date.now();
  const suffix = Math.random().toString(36).substring(2, 7);
  const recordId = meta.id || `photo_imp_${timestamp}_${suffix}`;

  // Skip cleanly if same ID already exists in IndexedDB
  const existing = await getPhotoById(recordId);
  if (existing) {
    return { imported: false, skipped: true, id: recordId };
  }

  const thumbnail = await generateThumbnail(blob);
  const cleanFilename = sanitizeFilename(meta.filename || filename || `MeGallery_${formatDateForFilename(timestamp)}_${suffix}.jpg`);

  const record = {
    id: recordId,
    blob,
    thumbnail,
    filename: cleanFilename,
    size: blob.size,
    timestamp,
    location: meta.location || null,
    targetFolderId: meta.targetFolderId || '',
    status: meta.status === 'uploading' ? 'pending' : (meta.status || 'pending'),
    retryCount: meta.retryCount || 0,
    gdriveFileId: meta.gdriveFileId || null,
    errorMsg: meta.errorMsg || null
  };

  await withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => reject(req.error);
      })
  );

  return { imported: true, skipped: false, id: recordId };
}

export async function deletePhoto(id) {
  return withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function deleteSyncedPhotos() {
  return withDB(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();
        let count = 0;

        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value.status === 'synced') {
              cursor.delete();
              count++;
            }
            cursor.continue();
          }
        };

        tx.oncomplete = () => resolve(count);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function getStorageStats() {
  return getGalleryOverview();
}

function formatDateForFilename(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
