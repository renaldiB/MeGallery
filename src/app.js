/**
 * MeGallery - Main Application Controller
 */

import { CameraController } from './camera.js';
import {
  initDB,
  savePhoto,
  getAllPhotos,
  getPhotoById,
  deletePhoto,
  deleteSyncedPhotos,
  getStorageStats
} from './storage.js';
import { gdriveManager } from './gdrive.js';
import { extractFolderId, isValidFolderId } from './utils/gdriveLink.js';

// DOM Elements
const videoEl = document.getElementById('camera-video');
const canvasEl = document.getElementById('capture-canvas');
const viewfinderEl = document.getElementById('viewfinder');
const focusReticle = document.getElementById('focus-reticle');
const shutterBtn = document.getElementById('shutter-btn');
const shutterFlash = document.getElementById('shutter-flash');
const switchCamBtn = document.getElementById('switch-cam-btn');
const torchBtn = document.getElementById('torch-btn');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const cameraErrorMsg = document.getElementById('camera-error-msg');
const retryCameraBtn = document.getElementById('retry-camera-btn');

// Status Badges
const networkDot = document.getElementById('network-dot');
const networkText = document.getElementById('network-text');
const syncDot = document.getElementById('sync-dot');
const syncText = document.getElementById('sync-text');

// Quick Gallery Trigger
const galleryBtn = document.getElementById('gallery-btn');
const thumbPlaceholder = document.getElementById('thumb-placeholder');
const thumbImg = document.getElementById('thumb-img');
const galleryBadgeCount = document.getElementById('gallery-badge-count');

// Modals
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

const galleryModal = document.getElementById('gallery-modal');
const closeGalleryBtn = document.getElementById('close-gallery-btn');
const galleryGrid = document.getElementById('gallery-grid');
const emptyGalleryMsg = document.getElementById('empty-gallery-msg');
const galleryTotalCount = document.getElementById('gallery-total-count');
const galleryStatBadge = document.getElementById('gallery-stat-badge');
const syncNowBtn = document.getElementById('sync-now-btn');

const photoViewerModal = document.getElementById('photo-viewer-modal');
const closeViewerBtn = document.getElementById('close-viewer-btn');
const viewerPhotoTitle = document.getElementById('viewer-photo-title');
const viewerImg = document.getElementById('viewer-img');
const viewerDate = document.getElementById('viewer-date');
const viewerStatusBadge = document.getElementById('viewer-status-badge');
const viewerSize = document.getElementById('viewer-size');
const viewerFolder = document.getElementById('viewer-folder');
const viewerError = document.getElementById('viewer-error');
const viewerRetryUploadBtn = document.getElementById('viewer-retry-upload-btn');
const viewerDeleteBtn = document.getElementById('viewer-delete-btn');

// Settings Form
const clientIdInput = document.getElementById('client-id-input');
const folderLinkInput = document.getElementById('folder-link-input');
const folderPreviewWrap = document.getElementById('folder-preview-wrap');
const detectedFolderId = document.getElementById('detected-folder-id');
const authGoogleBtn = document.getElementById('auth-google-btn');
const authBtnLabel = document.getElementById('auth-btn-label');
const qualitySelect = document.getElementById('quality-select');
const storageUsedText = document.getElementById('storage-used-text');
const cleanupSyncedBtn = document.getElementById('cleanup-synced-btn');

// Application State
let camera = null;
let currentViewingPhotoId = null;
let isCapturing = false;

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
async function initApp() {
  registerServiceWorker();
  await initDB();

  // Setup Camera
  camera = new CameraController(videoEl, canvasEl);
  startCameraStream();

  // Load Saved Settings
  loadSettings();

  // Bind Event Listeners
  bindEvents();

  // Refresh Storage & Gallery Previews
  await refreshGalleryOverview();

  // Setup Network & Sync Monitoring
  setupNetworkMonitoring();
  setupSyncMonitoring();

  // If online, configured, AND authenticated, auto sync pending queue
  if (navigator.onLine && gdriveManager.getClientId() && gdriveManager.getTargetFolderId() && gdriveManager.isConnected()) {
    gdriveManager.syncQueue();
  }
}

// ----------------------------------------------------------------------------
// Service Worker Registration
// ----------------------------------------------------------------------------
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}

// ----------------------------------------------------------------------------
// Camera Lifecycle
// ----------------------------------------------------------------------------
async function startCameraStream() {
  try {
    cameraPlaceholder.style.display = 'none';
    await camera.start();
    // Check torch availability
    if (camera.hasTorch()) {
      torchBtn.style.display = 'flex';
    } else {
      torchBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Camera stream error:', err);
    cameraPlaceholder.style.display = 'flex';
    cameraErrorMsg.textContent = err.message || 'Kamera tidak dapat diakses.';
  }
}

async function handleShutter() {
  if (isCapturing) return;
  isCapturing = true;

  try {
    // 1. Shutter Flash Animation
    shutterFlash.classList.add('active');
    setTimeout(() => shutterFlash.classList.remove('active'), 80);

    // 2. Capture Frame from Viewfinder directly into memory Blob
    const quality = parseFloat(qualitySelect.value) || 0.85;
    const blob = await camera.capture(quality);

    // 3. Save strictly to IndexedDB (zero OS gallery pollution)
    const targetFolder = gdriveManager.getTargetFolderId();
    const savedPhoto = await savePhoto({ blob, targetFolderId: targetFolder });

    // 4. Update Quick Preview & Badges
    updateThumbnailPreview(savedPhoto.thumbnail);
    await refreshGalleryOverview();

    // 5. Trigger sync if online, configured, and authenticated
    if (navigator.onLine && gdriveManager.getClientId() && targetFolder && gdriveManager.isConnected()) {
      gdriveManager.syncQueue();
    }
  } catch (err) {
    console.error('Shutter error:', err);
    alert('Gagal mengambil foto: ' + err.message);
  } finally {
    isCapturing = false;
  }
}

// ----------------------------------------------------------------------------
// Settings & Google Drive Handlers
// ----------------------------------------------------------------------------
function loadSettings() {
  const savedClientId = gdriveManager.getClientId();
  const savedFolderId = gdriveManager.getTargetFolderId();
  const savedQuality = localStorage.getItem('megallery_quality') || '0.85';

  if (savedClientId) clientIdInput.value = savedClientId;
  if (savedFolderId) {
    folderLinkInput.value = savedFolderId;
    detectedFolderId.textContent = savedFolderId;
    folderPreviewWrap.style.display = 'block';
  }
  qualitySelect.value = savedQuality;

  updateAuthButtonState();
}

function handleFolderInputChange() {
  const input = folderLinkInput.value.trim();
  const folderId = extractFolderId(input);

  if (folderId) {
    detectedFolderId.textContent = folderId;
    folderPreviewWrap.style.display = 'block';
    gdriveManager.setTargetFolderId(folderId);
  } else {
    folderPreviewWrap.style.display = 'none';
    if (!input) {
      gdriveManager.setTargetFolderId('');
    }
  }
}

function updateAuthButtonState() {
  if (gdriveManager.isConnected()) {
    authBtnLabel.textContent = 'Google Drive Terhubung ✓';
    authGoogleBtn.style.background = 'rgba(34, 197, 94, 0.3)';
    authGoogleBtn.style.borderColor = '#22c55e';
  } else {
    authBtnLabel.textContent = 'Hubungkan Google Drive';
    authGoogleBtn.style.background = '';
    authGoogleBtn.style.borderColor = '';
  }
}

async function handleGoogleAuth() {
  const clientId = clientIdInput.value.trim();
  if (!clientId) {
    alert('Masukkan Google OAuth Client ID terlebih dahulu.');
    clientIdInput.focus();
    return;
  }

  gdriveManager.setClientId(clientId);

  try {
    authBtnLabel.textContent = 'Menghubungkan...';
    await gdriveManager.requestAccessToken('consent');
    updateAuthButtonState();
    alert('Berhasil terhubung ke akun Google Drive!');

    // Trigger sync immediately if there are pending photos
    if (gdriveManager.getTargetFolderId()) {
      gdriveManager.syncQueue();
    }
  } catch (err) {
    console.error('Google Auth Error:', err);
    alert('Autentikasi gagal: ' + err.message);
    updateAuthButtonState();
  }
}

// ----------------------------------------------------------------------------
// In-App Gallery & Viewer
// ----------------------------------------------------------------------------
async function refreshGalleryOverview() {
  const stats = await getStorageStats();
  const allPhotos = await getAllPhotos();

  // Update top deck sync badge
  if (stats.pendingCount > 0) {
    syncDot.className = 'status-dot syncing';
    syncText.textContent = `${stats.pendingCount} Antre`;
  } else if (stats.failedCount > 0) {
    syncDot.className = 'status-dot offline';
    syncText.textContent = `${stats.failedCount} Gagal`;
  } else {
    syncDot.className = 'status-dot';
    syncText.textContent = stats.totalPhotos > 0 ? 'Tersinkron' : 'Siap';
  }

  // Update bottom preview button
  if (allPhotos.length > 0) {
    updateThumbnailPreview(allPhotos[0].thumbnail);
    galleryBadgeCount.textContent = stats.pendingCount > 0 ? stats.pendingCount : allPhotos.length;
    galleryBadgeCount.style.display = 'inline-block';
  } else {
    thumbPlaceholder.style.display = 'flex';
    thumbImg.style.display = 'none';
    galleryBadgeCount.style.display = 'none';
  }

  // Update modal stats
  galleryTotalCount.textContent = `(${stats.totalPhotos})`;
  galleryStatBadge.textContent = `${stats.pendingCount} Menunggu Sinkron • ${stats.syncedCount} Tersinkron`;
  storageUsedText.textContent = `${stats.totalMb} MB`;
}

function updateThumbnailPreview(thumbnailUrl) {
  if (thumbnailUrl) {
    thumbImg.src = thumbnailUrl;
    thumbImg.style.display = 'block';
    thumbPlaceholder.style.display = 'none';
  } else {
    thumbImg.style.display = 'none';
    thumbPlaceholder.style.display = 'flex';
  }
}

async function renderGalleryGrid() {
  const photos = await getAllPhotos();
  galleryGrid.innerHTML = '';

  if (photos.length === 0) {
    emptyGalleryMsg.style.display = 'flex';
    return;
  }

  emptyGalleryMsg.style.display = 'none';

  photos.forEach((photo) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.dataset.id = photo.id;

    const img = document.createElement('img');
    img.src = photo.thumbnail || '';
    img.alt = photo.filename;
    img.loading = 'lazy';

    const badge = document.createElement('span');
    badge.className = `photo-badge badge-${photo.status}`;
    badge.textContent = getStatusLabel(photo.status);

    card.appendChild(img);
    card.appendChild(badge);

    card.addEventListener('click', () => openPhotoViewer(photo.id));
    galleryGrid.appendChild(card);
  });
}

function getStatusLabel(status) {
  switch (status) {
    case 'synced': return 'DRIVE ✓';
    case 'uploading': return 'SYNC...';
    case 'failed': return 'GAGAL';
    default: return 'ANTRE';
  }
}

async function openPhotoViewer(photoId) {
  currentViewingPhotoId = photoId;
  const photo = await getPhotoById(photoId);
  if (!photo) return;

  viewerPhotoTitle.textContent = photo.filename;
  viewerDate.textContent = new Date(photo.timestamp).toLocaleString('id-ID');
  viewerSize.textContent = `Ukuran: ${(photo.size / (1024 * 1024)).toFixed(2)} MB`;
  viewerFolder.textContent = `Folder GDrive: ${photo.targetFolderId || '-'}`;

  viewerStatusBadge.className = `photo-badge badge-${photo.status}`;
  viewerStatusBadge.textContent = getStatusLabel(photo.status);

  if (photo.errorMsg) {
    viewerError.textContent = `Error: ${photo.errorMsg}`;
    viewerError.style.display = 'block';
  } else {
    viewerError.style.display = 'none';
  }

  // Load high-res Blob URL
  const blobUrl = URL.createObjectURL(photo.blob);
  viewerImg.src = blobUrl;
  viewerImg.onload = () => URL.revokeObjectURL(blobUrl);

  if (photo.status === 'synced') {
    viewerRetryUploadBtn.style.display = 'none';
  } else {
    viewerRetryUploadBtn.style.display = 'flex';
  }

  photoViewerModal.classList.add('active');
}

// ----------------------------------------------------------------------------
// Network & Sync Monitoring
// ----------------------------------------------------------------------------
function setupNetworkMonitoring() {
  function updateNetworkStatus() {
    if (navigator.onLine) {
      networkDot.className = 'status-dot';
      networkText.textContent = 'Online';
      // Attempt auto sync when back online (if already authenticated)
      if (gdriveManager.getClientId() && gdriveManager.getTargetFolderId() && gdriveManager.isConnected()) {
        gdriveManager.syncQueue();
      }
    } else {
      networkDot.className = 'status-dot offline';
      networkText.textContent = 'Offline';
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

function setupSyncMonitoring() {
  gdriveManager.onSyncEvent(async (event) => {
    switch (event.type) {
      case 'sync_start':
        syncDot.className = 'status-dot syncing';
        syncText.textContent = 'Mengunggah...';
        break;
      case 'auth_needed':
        syncDot.className = 'status-dot';
        syncText.textContent = 'Perlu Login';
        break;
      case 'photo_uploading':
        syncText.textContent = `${event.current}/${event.total} Sync`;
        break;
      case 'photo_synced':
      case 'photo_failed':
      case 'sync_finish':
        await refreshGalleryOverview();
        if (galleryModal.classList.contains('active')) {
          renderGalleryGrid();
        }
        break;
      case 'sync_error':
        syncDot.className = 'status-dot offline';
        syncText.textContent = 'Error Sync';
        break;
    }
  });
}

// ----------------------------------------------------------------------------
// Event Listeners Binding
// ----------------------------------------------------------------------------
function bindEvents() {
  // Tap-to-Focus on Viewfinder
  let focusTimeout = null;
  if (viewfinderEl && focusReticle) {
    viewfinderEl.addEventListener('pointerdown', (e) => {
      // Ignore clicks on control overlays or modals
      if (
        e.target.closest('.top-deck') ||
        e.target.closest('.bottom-deck') ||
        e.target.closest('.modal-overlay') ||
        e.target.closest('#camera-placeholder')
      ) {
        return;
      }

      const rect = viewfinderEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      focusReticle.style.left = `${x}px`;
      focusReticle.style.top = `${y}px`;

      // Trigger crisp focus lock animation
      focusReticle.classList.remove('active');
      void focusReticle.offsetWidth; // Force reflow
      focusReticle.classList.add('active');

      if (focusTimeout) clearTimeout(focusTimeout);
      focusTimeout = setTimeout(() => {
        focusReticle.classList.remove('active');
      }, 1250);

      // Trigger hardware lens autofocus
      if (camera) {
        camera.focusAt(x, y, rect.width, rect.height);
      }
    });
  }

  // Camera & Shutter Controls
  shutterBtn.addEventListener('click', handleShutter);
  switchCamBtn.addEventListener('click', async () => {
    try {
      await camera.switchCamera();
      torchBtn.style.display = camera.hasTorch() ? 'flex' : 'none';
    } catch (err) {
      alert('Gagal berganti kamera: ' + err.message);
    }
  });

  torchBtn.addEventListener('click', async () => {
    const isTorchOn = await camera.toggleTorch();
    torchBtn.style.color = isTorchOn ? 'var(--color-crimson-text)' : 'var(--color-sand)';
    torchBtn.style.background = isTorchOn ? 'var(--color-crimson)' : 'rgba(109, 35, 35, 0.6)';
  });

  retryCameraBtn.addEventListener('click', startCameraStream);

  // Settings Modal Controls
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
  });
  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  folderLinkInput.addEventListener('input', handleFolderInputChange);
  clientIdInput.addEventListener('change', () => {
    gdriveManager.setClientId(clientIdInput.value);
  });
  
  const toggleClientIdBtn = document.getElementById('toggle-client-id-btn');
  if (toggleClientIdBtn) {
    toggleClientIdBtn.addEventListener('click', () => {
      const isPassword = clientIdInput.type === 'password';
      clientIdInput.type = isPassword ? 'text' : 'password';
      toggleClientIdBtn.style.color = isPassword ? 'var(--color-yellow)' : 'var(--color-sky)';
    });
  }

  authGoogleBtn.addEventListener('click', handleGoogleAuth);

  qualitySelect.addEventListener('change', () => {
    localStorage.setItem('megallery_quality', qualitySelect.value);
  });

  cleanupSyncedBtn.addEventListener('click', async () => {
    if (confirm('Hapus semua foto lokal yang sudah berhasil terunggah ke Google Drive?')) {
      const count = await deleteSyncedPhotos();
      await refreshGalleryOverview();
      renderGalleryGrid();
      alert(`Berhasil membersihkan ${count} foto dari penyimpanan lokal.`);
    }
  });

  // Gallery Modal Controls
  galleryBtn.addEventListener('click', async () => {
    await renderGalleryGrid();
    galleryModal.classList.add('active');
  });
  closeGalleryBtn.addEventListener('click', () => {
    galleryModal.classList.remove('active');
  });

  syncNowBtn.addEventListener('click', async () => {
    if (!navigator.onLine) {
      alert('Perangkat sedang offline. Sambungkan internet untuk sinkronisasi.');
      return;
    }
    if (!gdriveManager.getTargetFolderId()) {
      alert('Tentukan folder Google Drive di menu Pengaturan terlebih dahulu.');
      return;
    }
    if (!gdriveManager.isConnected()) {
      try {
        await gdriveManager.requestAccessToken('consent');
        updateAuthButtonState();
      } catch (err) {
        alert('Gagal menghubungkan Google Drive: ' + err.message);
        return;
      }
    }
    gdriveManager.syncQueue();
  });

  // Photo Viewer Controls
  closeViewerBtn.addEventListener('click', () => {
    photoViewerModal.classList.remove('active');
    currentViewingPhotoId = null;
  });

  viewerDeleteBtn.addEventListener('click', async () => {
    if (!currentViewingPhotoId) return;
    if (confirm('Hapus foto ini dari penyimpanan lokal aplikasi?')) {
      await deletePhoto(currentViewingPhotoId);
      photoViewerModal.classList.remove('active');
      currentViewingPhotoId = null;
      await refreshGalleryOverview();
      renderGalleryGrid();
    }
  });

  viewerRetryUploadBtn.addEventListener('click', async () => {
    if (!currentViewingPhotoId) return;
    if (!navigator.onLine) {
      alert('Perangkat sedang offline.');
      return;
    }
    if (!gdriveManager.isConnected()) {
      try {
        await gdriveManager.requestAccessToken('consent');
        updateAuthButtonState();
      } catch (err) {
        alert('Gagal menghubungkan Google Drive: ' + err.message);
        return;
      }
    }
    photoViewerModal.classList.remove('active');
    gdriveManager.syncQueue();
  });

  // Close modals on clicking background backdrop
  [settingsModal, galleryModal, photoViewerModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// Start Application on Load
window.addEventListener('DOMContentLoaded', initApp);
