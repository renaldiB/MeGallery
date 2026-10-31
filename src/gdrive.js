/**
 * Google Drive Client & Queue Sync Engine
 * Uses Google Identity Services (GIS) with drive.file scope (least-privilege).
 */

import { getPendingPhotos, updatePhotoStatus } from './storage.js';
import { DEFAULT_CLIENT_ID } from './config.js';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

class GoogleDriveManager {
  constructor() {
    this.gisLoaded = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.isSyncing = false;
    this.clientId = localStorage.getItem('megallery_client_id') || DEFAULT_CLIENT_ID || '';
    this.targetFolderId = localStorage.getItem('megallery_folder_id') || '';
    this.syncListeners = new Set();
  }

  setClientId(clientId) {
    this.clientId = (clientId || '').trim();
    localStorage.setItem('megallery_client_id', this.clientId);
    this.tokenClient = null; // Re-init needed
  }

  getClientId() {
    return this.clientId;
  }

  setTargetFolderId(folderId) {
    this.targetFolderId = (folderId || '').trim();
    localStorage.setItem('megallery_folder_id', this.targetFolderId);
  }

  getTargetFolderId() {
    return this.targetFolderId;
  }

  /**
   * Dynamically load Google Identity Services script
   */
  async loadGIS() {
    if (this.gisLoaded && window.google?.accounts?.oauth2) {
      return true;
    }

    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)) {
        this.gisLoaded = true;
        return resolve(true);
      }

      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error('Gagal memuat Google Identity Services script. Periksa koneksi internet atau CSP.'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Request user authorization token via GIS
   */
  async requestAccessToken(prompt = '') {
    if (!this.clientId) {
      throw new Error('Google OAuth Client ID belum dikonfigurasi. Masukkan Client ID di Pengaturan.');
    }

    await this.loadGIS();

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: DRIVE_SCOPE,
          callback: (response) => {
            if (response.error) {
              return reject(new Error('Auth error: ' + response.error));
            }
            this.accessToken = response.access_token;
            // Token typically valid for 3600 seconds
            const expiresIn = (response.expires_in || 3600) * 1000;
            this.tokenExpiresAt = Date.now() + expiresIn - 60000; // 1 min buffer
            resolve(this.accessToken);
          }
        });

        this.tokenClient.requestAccessToken({ prompt: prompt || '' });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Check if active access token is valid
   */
  async ensureValidToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    // Token expired or missing, request new token silently if possible
    return this.requestAccessToken('');
  }

  /**
   * Check if Google Auth is connected
   */
  isConnected() {
    return !!(this.accessToken && Date.now() < this.tokenExpiresAt);
  }

  /**
   * Upload single Blob directly to Google Drive via multipart upload
   */
  async uploadPhoto({ blob, filename, folderId }) {
    const token = await this.ensureValidToken();
    const targetFolder = folderId || this.targetFolderId;

    if (!targetFolder) {
      throw new Error('Folder tujuan Google Drive belum dipilih. Tentukan folder di Pengaturan.');
    }

    const metadata = {
      name: filename,
      mimeType: 'image/jpeg',
      parents: [targetFolder]
    };

    const boundary = '-------MeGalleryBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: image/jpeg\r\n\r\n`;

    // Construct composite multipart payload
    const metadataBlob = new Blob([metadataPart], { type: 'text/plain' });
    const mediaHeaderBlob = new Blob([mediaPartHeader], { type: 'text/plain' });
    const closeBlob = new Blob([closeDelimiter], { type: 'text/plain' });

    const multipartPayload = new Blob([metadataBlob, mediaHeaderBlob, blob, closeBlob], {
      type: `multipart/related; boundary=${boundary}`
    });

    const response = await fetch(DRIVE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: multipartPayload
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMsg = errorText;
      try {
        const errJson = JSON.parse(errorText);
        parsedMsg = errJson.error?.message || errorText;
      } catch (_) {}
      throw new Error(`Upload GDrive gagal (${response.status}): ${parsedMsg}`);
    }

    const result = await response.json();
    return result; // contains id, name, etc.
  }

  /**
   * Process all pending photos in the IndexedDB queue
   */
  async syncQueue() {
    if (this.isSyncing) return;
    if (!navigator.onLine) {
      this.notifyListeners({ type: 'offline', message: 'Perangkat offline, sinkronisasi ditunda.' });
      return;
    }
    if (!this.clientId || !this.targetFolderId) {
      this.notifyListeners({ type: 'unconfigured', message: 'Client ID atau Folder ID belum diatur.' });
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    try {
      // Ensure token is ready before loop
      await this.ensureValidToken();

      const pending = await getPendingPhotos();
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < pending.length; i++) {
        // Stop if disconnected mid-queue
        if (!navigator.onLine) {
          this.notifyListeners({ type: 'offline_mid_sync' });
          break;
        }

        const photo = pending[i];
        try {
          await updatePhotoStatus(photo.id, { status: 'uploading' });
          this.notifyListeners({
            type: 'photo_uploading',
            photoId: photo.id,
            current: i + 1,
            total: pending.length
          });

          const folderToUse = photo.targetFolderId || this.targetFolderId;
          const driveResult = await this.uploadPhoto({
            blob: photo.blob,
            filename: photo.filename,
            folderId: folderToUse
          });

          await updatePhotoStatus(photo.id, {
            status: 'synced',
            gdriveFileId: driveResult.id,
            errorMsg: null
          });

          successCount++;
          this.notifyListeners({
            type: 'photo_synced',
            photoId: photo.id,
            driveId: driveResult.id
          });
        } catch (err) {
          console.error(`Gagal upload photo ${photo.id}:`, err);
          failCount++;
          await updatePhotoStatus(photo.id, {
            status: 'failed',
            errorMsg: err.message,
            retryCount: (photo.retryCount || 0) + 1
          });
          this.notifyListeners({
            type: 'photo_failed',
            photoId: photo.id,
            error: err.message
          });
        }
      }

      this.notifyListeners({
        type: 'sync_finish',
        successCount,
        failCount
      });
    } catch (err) {
      console.error('Sync queue general error:', err);
      this.notifyListeners({ type: 'sync_error', error: err.message });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Event listener subscription for UI sync updates
   */
  onSyncEvent(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  notifyListeners(data) {
    this.syncListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('Error in sync listener callback:', err);
      }
    });
  }
}

export const gdriveManager = new GoogleDriveManager();
