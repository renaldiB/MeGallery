/**
 * MeGallery - Main Application Controller
 */

import { CameraController } from './camera.js';
import {
  initDB,
  requestPersistentStorage,
  savePhoto,
  renamePhoto,
  getGalleryOverview,
  getPhotoMetadataList,
  getPhotoMetaForExport,
  getPhotoById,
  importPhotoRecord,
  deletePhoto,
  deleteSyncedPhotos,
  getStorageStats
} from './storage.js';
import { gdriveManager } from './gdrive.js';
import { extractFolderId, isValidFolderId, sanitizeFilename, sanitizePrefix } from './utils/gdriveLink.js';
import { geoService, formatIndonesianTimestamp } from './utils/geolocation.js';
import {
  DEFAULT_MAX_ZIP_BYTES,
  SAFE_FALLBACK_MAX_BYTES,
  SAFE_FALLBACK_MAX_FILES,
  buildZipBatches,
  readBackupZip,
  triggerBrowserDownload,
  shareOrDownloadPhoto
} from './utils/zipExport.js';

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
const syncChip = document.getElementById('sync-chip');
const syncDot = document.getElementById('sync-dot');
const syncText = document.getElementById('sync-text');

// What's New Banner (Strict 1x display)
const whatsNewBanner = document.getElementById('whats-new-banner');
const closeWhatsNewBtn = document.getElementById('close-whats-new-btn');
const ackWhatsNewBtn = document.getElementById('ack-whats-new-btn');

// Live Viewfinder HUD
const liveLocationText = document.getElementById('live-location-text');
const liveClockText = document.getElementById('live-clock-text');

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
const backupWarningBanner = document.getElementById('backup-warning-banner');
const backupWarningText = document.getElementById('backup-warning-text');
const quickBackupBtn = document.getElementById('quick-backup-btn');
const downloadPendingBtn = document.getElementById('download-pending-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const downloadBackupBtn = document.getElementById('download-backup-btn');
const importBackupBtn = document.getElementById('import-backup-btn');
const importBackupInput = document.getElementById('import-backup-input');
const exportStatusPanel = document.getElementById('export-status-panel');
const exportStatusText = document.getElementById('export-status-text');
const exportActionsContainer = document.getElementById('export-actions-container');
const closeExportPanelBtn = document.getElementById('close-export-panel-btn');

const photoViewerModal = document.getElementById('photo-viewer-modal');
const closeViewerBtn = document.getElementById('close-viewer-btn');
const viewerPhotoTitle = document.getElementById('viewer-photo-title');
const viewerRenameBtn = document.getElementById('viewer-rename-btn');
const viewerRenameBox = document.getElementById('viewer-rename-box');
const viewerRenameInput = document.getElementById('viewer-rename-input');
const viewerRenameSaveBtn = document.getElementById('viewer-rename-save-btn');
const viewerRenameCancelBtn = document.getElementById('viewer-rename-cancel-btn');
const viewerImg = document.getElementById('viewer-img');
const viewerLocation = document.getElementById('viewer-location');
const viewerDate = document.getElementById('viewer-date');
const viewerStatusBadge = document.getElementById('viewer-status-badge');
const viewerSize = document.getElementById('viewer-size');
const viewerFolder = document.getElementById('viewer-folder');
const viewerError = document.getElementById('viewer-error');
const viewerRetryUploadBtn = document.getElementById('viewer-retry-upload-btn');
const viewerDownloadBtn = document.getElementById('viewer-download-btn');
const viewerDeleteBtn = document.getElementById('viewer-delete-btn');
const viewerContentBox = document.getElementById('viewer-content-box');

// Fullscreen Lightbox Elements
const fullscreenLightbox = document.getElementById('fullscreen-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeLightboxBtn = document.getElementById('close-lightbox-btn');

// Settings Form
const prefixInput = document.getElementById('prefix-input');
const watermarkToggle = document.getElementById('watermark-toggle');
const folderLinkInput = document.getElementById('folder-link-input');
const pasteFolderBtn = document.getElementById('paste-folder-btn');
const folderPreviewWrap = document.getElementById('folder-preview-wrap');
const detectedFolderId = document.getElementById('detected-folder-id');
const folderDetectedChip = document.getElementById('folder-detected-chip');
const permissionHelpBtn = document.getElementById('permission-help-btn');
const permissionTooltip = document.getElementById('permission-tooltip');
const authGoogleBtn = document.getElementById('auth-google-btn');
const authBtnLabel = document.getElementById('auth-btn-label');
const segQualityButtons = document.querySelectorAll('.seg-btn');
const qualityDesc = document.getElementById('quality-desc');
const storageUsedText = document.getElementById('storage-used-text');
const cleanupSyncedBtn = document.getElementById('cleanup-synced-btn');

// Application State
const WHATS_NEW_KEY = 'megallery_whats_new_dismissed_v3';
let camera = null;
let currentViewingPhotoId = null;
let currentViewingPhotoName = null;
let currentViewingBlob = null;
let activeViewerBlobUrl = null;
let activeLightboxBlobUrl = null;
let isCapturing = false;
let isExporting = false;
let lastSyncErrorMessage = '';
let refreshOverviewTimer = null;

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------
async function initApp() {
  registerServiceWorker();
  await initDB();
  requestPersistentStorage();
  initWhatsNewBanner();

  // Setup Camera
  camera = new CameraController(videoEl, canvasEl);
  startCameraStream();

  // Setup GPS & Live Viewfinder HUD
  setupGeolocationAndHUD();

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
  if (navigator.onLine && gdriveManager.getTargetFolderId() && gdriveManager.isConnected()) {
    gdriveManager.syncQueue();
  }
}

function initWhatsNewBanner() {
  if (!whatsNewBanner) return;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(WHATS_NEW_KEY) === '1';
  } catch (_) {}

  if (!dismissed) {
    whatsNewBanner.style.display = 'block';
  }

  const dismissForever = () => {
    try {
      localStorage.setItem(WHATS_NEW_KEY, '1');
    } catch (_) {}
    whatsNewBanner.style.display = 'none';
  };

  if (closeWhatsNewBtn) closeWhatsNewBtn.addEventListener('click', dismissForever);
  if (ackWhatsNewBtn) ackWhatsNewBtn.addEventListener('click', dismissForever);
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
// Geolocation & Viewfinder HUD
// ----------------------------------------------------------------------------
function setupGeolocationAndHUD() {
  // Start GPS tracking
  geoService.start();

  // Listen to location updates
  geoService.onLocationChange((loc, err) => {
    if (liveLocationText) {
      if (loc && loc.shortLabel) {
        liveLocationText.textContent = loc.shortLabel;
        liveLocationText.title = `${loc.primaryText} • ${loc.secondaryText} (${loc.coordsText})`;
      } else if (err) {
        liveLocationText.textContent = err;
      } else {
        liveLocationText.textContent = 'Mencari sinyal GPS...';
      }
    }
  });

  // Tick clock every second
  function tickClock() {
    const ts = formatIndonesianTimestamp();
    if (liveClockText) {
      liveClockText.textContent = ts.timeLine;
    }
  }
  setInterval(tickClock, 1000);
  tickClock();
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

    // 2. Prepare Watermark Options (Timestamp & Location)
    const isWatermarkEnabled = localStorage.getItem('megallery_watermark_enabled') !== 'false';
    const curLocation = geoService.getCurrentLocation();
    const curTimestamp = formatIndonesianTimestamp();
    const watermarkOpts = {
      enabled: isWatermarkEnabled,
      location: curLocation,
      timestamp: curTimestamp
    };

    // 3. Capture Frame from Viewfinder directly into memory Blob with Watermark
    const quality = parseFloat(localStorage.getItem('megallery_quality') || '0.85');
    const blob = await camera.capture(quality, watermarkOpts);

    // 4. Save strictly to IndexedDB (zero OS gallery pollution) with Emergency Save Fallback
    const targetFolder = gdriveManager.getTargetFolderId();
    const savedPrefix = localStorage.getItem('megallery_prefix') || 'MeGallery_';
    let savedPhoto = null;
    try {
      savedPhoto = await savePhoto({
        blob,
        targetFolderId: targetFolder,
        prefix: savedPrefix,
        location: curLocation
      });
    } catch (saveErr) {
      console.error('savePhoto IndexedDB error, triggering emergency fallback:', saveErr);
      const emergencyName = `${sanitizePrefix(savedPrefix)}emergency_${Date.now()}.jpg`;
      await shareOrDownloadPhoto(blob, emergencyName);
      alert(`Penyimpanan browser gagal/penuh (${saveErr.message}). Foto langsung diamankan ke perangkat sebagai ${emergencyName}.`);
      return;
    }

    // 5. Update Quick Preview & Badges
    updateThumbnailPreview(savedPhoto.thumbnail);
    await refreshGalleryOverview();

    // 6. Trigger sync if online, configured, and authenticated
    if (navigator.onLine && targetFolder && gdriveManager.isConnected()) {
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
const qualityDescriptions = {
  '0.75': 'Cepat Terunggah',
  '0.85': 'Rekomendasi • Hemat Kuota',
  '0.92': 'Kualitas Terbaik'
};

function updateQualityUI(val) {
  segQualityButtons.forEach((btn) => {
    const isMatch = btn.dataset.quality === val;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
  });
  if (qualityDesc) {
    qualityDesc.textContent = qualityDescriptions[val] || '';
  }
}

function loadSettings() {
  const savedFolderId = gdriveManager.getTargetFolderId();
  const savedQuality = localStorage.getItem('megallery_quality') || '0.85';
  const savedPrefix = localStorage.getItem('megallery_prefix') || 'MeGallery_';
  const savedWatermark = localStorage.getItem('megallery_watermark_enabled') !== 'false';

  if (prefixInput) prefixInput.value = savedPrefix;
  if (watermarkToggle) watermarkToggle.checked = savedWatermark;
  if (savedFolderId) {
    folderLinkInput.value = savedFolderId;
    detectedFolderId.textContent = savedFolderId;
    folderPreviewWrap.style.display = 'block';
    if (folderDetectedChip) folderDetectedChip.style.display = 'inline-flex';
  }

  updateQualityUI(savedQuality);
  updateAuthButtonState();
}

function handleFolderInputChange() {
  const input = folderLinkInput.value.trim();
  const folderId = extractFolderId(input);

  if (folderId) {
    detectedFolderId.textContent = folderId;
    folderPreviewWrap.style.display = 'block';
    if (folderDetectedChip) folderDetectedChip.style.display = 'inline-flex';
    gdriveManager.setTargetFolderId(folderId);
  } else {
    folderPreviewWrap.style.display = 'none';
    if (folderDetectedChip) folderDetectedChip.style.display = 'none';
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
    authBtnLabel.textContent = 'Hubungkan Akun Google';
    authGoogleBtn.style.background = '';
    authGoogleBtn.style.borderColor = '';
  }
}

async function handleGoogleAuth() {
  const clientId = gdriveManager.getClientId();
  if (!clientId) {
    alert('Google OAuth Client ID belum dikonfigurasi di sistem (VITE_GOOGLE_CLIENT_ID).');
    return;
  }

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
  const stats = await getGalleryOverview();
  const unsyncedCount = stats.pendingCount + stats.failedCount;

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

  if (syncChip) {
    syncChip.title = lastSyncErrorMessage || `${stats.pendingCount} Antre • ${stats.failedCount} Gagal • ${stats.syncedCount} Tersinkron`;
  }

  // Update bottom preview button
  if (stats.totalPhotos > 0) {
    updateThumbnailPreview(stats.latestThumbnail);
    galleryBadgeCount.textContent = stats.pendingCount > 0 ? stats.pendingCount : stats.totalPhotos;
    galleryBadgeCount.style.display = 'inline-block';
  } else {
    thumbPlaceholder.style.display = 'flex';
    thumbImg.style.display = 'none';
    galleryBadgeCount.style.display = 'none';
  }

  // Update modal stats & action buttons
  galleryTotalCount.textContent = `(${stats.totalPhotos})`;
  galleryStatBadge.textContent = `${unsyncedCount} Menunggu Sinkron • ${stats.syncedCount} Tersinkron`;
  storageUsedText.textContent = `${stats.totalMb} MB`;
  if (cleanupSyncedBtn) {
    cleanupSyncedBtn.disabled = stats.syncedCount === 0 || stats.totalPhotos === 0;
  }
  if (downloadPendingBtn) {
    downloadPendingBtn.disabled = unsyncedCount === 0;
  }
  if (downloadAllBtn) {
    downloadAllBtn.disabled = stats.totalPhotos === 0;
  }
  if (downloadBackupBtn) {
    downloadBackupBtn.disabled = stats.totalPhotos === 0;
  }

  // External backup warning if >= 10 unsynced photos accumulated since last backup
  if (backupWarningBanner && backupWarningText) {
    const lastBackupCount = parseInt(localStorage.getItem('megallery_last_backup_count') || '0', 10);
    if (unsyncedCount >= 10 && stats.totalPhotos - lastBackupCount >= 10) {
      backupWarningText.textContent = `⚠ ${unsyncedCount} foto hanya di cache browser (hilang jika clear Safari)`;
      backupWarningBanner.style.display = 'flex';
    } else {
      backupWarningBanner.style.display = 'none';
    }
  }
}

function scheduleRefreshOverview() {
  if (refreshOverviewTimer) return;
  refreshOverviewTimer = setTimeout(async () => {
    refreshOverviewTimer = null;
    await refreshGalleryOverview();
    if (galleryModal.classList.contains('active')) {
      renderGalleryGrid();
    }
  }, 500);
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
  const photos = await getPhotoMetadataList();
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

function showExportPanel(statusMsg) {
  if (!exportStatusPanel) return;
  exportStatusPanel.style.display = 'flex';
  if (exportStatusText) exportStatusText.textContent = statusMsg;
  if (exportActionsContainer) exportActionsContainer.innerHTML = '';
}

function collectSettingsBackup() {
  return {
    folderId: gdriveManager.getTargetFolderId() || '',
    prefix: localStorage.getItem('megallery_prefix') || 'MeGallery_',
    quality: localStorage.getItem('megallery_quality') || '0.85',
    watermarkEnabled: localStorage.getItem('megallery_watermark_enabled') !== 'false'
  };
}

function applyImportedSettings(settings) {
  if (!settings || typeof settings !== 'object') return;
  if (settings.folderId) {
    gdriveManager.setTargetFolderId(settings.folderId);
  }
  if (settings.prefix) {
    localStorage.setItem('megallery_prefix', sanitizePrefix(settings.prefix));
  }
  if (settings.quality && ['0.75', '0.85', '0.92'].includes(String(settings.quality))) {
    localStorage.setItem('megallery_quality', String(settings.quality));
  }
  if (typeof settings.watermarkEnabled === 'boolean') {
    localStorage.setItem('megallery_watermark_enabled', String(settings.watermarkEnabled));
  }
  loadSettings();
}

async function handleExport({ mode, includeBackup, maxBytes = DEFAULT_MAX_ZIP_BYTES, maxFiles = Infinity }) {
  if (isExporting) return;
  isExporting = true;

  try {
    showExportPanel('Memeriksa daftar foto...');
    const metaList = await getPhotoMetaForExport(mode);
    if (metaList.length === 0) {
      showExportPanel('Tidak ada foto yang tersedia untuk diunduh.');
      return;
    }

    // Mode Gambar Murni (< 5 foto): langsung unduh file JPG satu per satu tanpa JSON backup
    if (!includeBackup && metaList.length < 5) {
      let downloaded = 0;
      const skipped = [];

      for (let i = 0; i < metaList.length; i++) {
        exportStatusText.textContent = `Mengunduh JPG (${i + 1}/${metaList.length})...`;
        try {
          const record = await getPhotoById(metaList[i].id);
          if (record && record.blob && record.blob.size > 0) {
            triggerBrowserDownload(record.blob, record.filename);
            downloaded++;
            if (i < metaList.length - 1) {
              await new Promise((r) => setTimeout(r, 350));
            }
          } else {
            skipped.push(metaList[i].filename);
          }
        } catch (_) {
          skipped.push(metaList[i].filename);
        }
      }

      exportStatusText.textContent = skipped.length > 0
        ? `✓ ${downloaded} JPG diunduh (${skipped.length} dilewati karena rusak).`
        : `✓ ${downloaded} file JPG selesai diunduh.`;
      return;
    }

    // Mode ZIP Folder (>= 5 foto atau Mode Backup lengkap)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const labelBase = includeBackup
      ? `MeGallery_Backup_${today}`
      : mode === 'pending'
        ? `MeGallery_Antre_${today}`
        : `MeGallery_All_${today}`;

    const settingsBackup = includeBackup ? collectSettingsBackup() : null;

    const { archives, skippedFiles } = await buildZipBatches({
      photoMetaList: metaList,
      getPhotoById,
      folderName: 'MeGallery_Photos',
      archiveBaseName: labelBase,
      settingsBackup,
      maxBytes,
      maxFiles,
      onProgress: ({ processed, total }) => {
        exportStatusText.textContent = `Menyiapkan folder ZIP... (${processed}/${total} foto)`;
      }
    });

    if (archives.length === 0) {
      showExportPanel('Tidak ada foto yang berhasil dikemas ke ZIP.');
      return;
    }

    const skipNote = skippedFiles.length > 0 ? ` • ${skippedFiles.length} file rusak dilewati` : '';
    const backupNote = includeBackup ? ' (termasuk settingan & GPS untuk Impor laptop)' : ' (folder foto JPG saja)';
    exportStatusText.textContent = `ZIP siap (${archives.length} file)${backupNote}${skipNote}. Ketuk tombol di bawah untuk menyimpan:`;

    archives.forEach((arc, idx) => {
      const sizeMb = (arc.sizeBytes / (1024 * 1024)).toFixed(1);
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-primary';
      saveBtn.textContent = archives.length > 1
        ? `Simpan Part ${idx + 1}/${archives.length} (${arc.photoCount} foto • ${sizeMb} MB)`
        : `Simpan ZIP (${arc.photoCount} foto • ${sizeMb} MB)`;

      saveBtn.addEventListener('click', () => {
        triggerBrowserDownload(arc.blob, arc.filename);
        saveBtn.textContent = `✓ Tersimpan (${sizeMb} MB)`;
        if (includeBackup || mode === 'all') {
          localStorage.setItem('megallery_last_backup_count', String(metaList.length));
          refreshGalleryOverview();
        }
      });

      exportActionsContainer.appendChild(saveBtn);
    });
  } catch (err) {
    console.error('Export error:', err);
    showExportPanel(`Gagal menyiapkan unduhan (${err.message}).`);

    // Adaptive Chunk Fallback (Plan 2B): tawarkan pecahan batch kecil 25 foto / 30 MB
    if (maxFiles === Infinity && exportActionsContainer) {
      const retrySmallBtn = document.createElement('button');
      retrySmallBtn.type = 'button';
      retrySmallBtn.className = 'btn-secondary';
      retrySmallBtn.textContent = 'Pecah Batch Kecil (25 Foto/ZIP)';
      retrySmallBtn.addEventListener('click', () => {
        handleExport({
          mode,
          includeBackup,
          maxBytes: SAFE_FALLBACK_MAX_BYTES,
          maxFiles: SAFE_FALLBACK_MAX_FILES
        });
      });
      exportActionsContainer.appendChild(retrySmallBtn);
    }
  } finally {
    isExporting = false;
  }
}

async function handleImportBackup(file) {
  if (!file || isExporting) return;
  isExporting = true;
  showExportPanel(`Membaca ${file.name}...`);

  try {
    const { backupData, photoEntries } = await readBackupZip(file);
    if (photoEntries.length === 0 && !backupData?.settings) {
      showExportPanel('Tidak ada foto atau data backup di file ZIP tersebut.');
      return;
    }

    if (backupData?.settings && confirm(`Ditemukan pengaturan MeGallery di backup (${photoEntries.length} foto). Pulihkan Folder Drive, Prefix, Kualitas & Watermark juga?`)) {
      applyImportedSettings(backupData.settings);
    }

    const metaByPath = new Map();
    const metaByName = new Map();
    if (Array.isArray(backupData?.photos)) {
      backupData.photos.forEach((m) => {
        if (m.zipPath) metaByPath.set(m.zipPath, m);
        if (m.filename) metaByName.set(m.filename, m);
      });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < photoEntries.length; i++) {
      const entry = photoEntries[i];
      exportStatusText.textContent = `Mengimpor foto ${i + 1}/${photoEntries.length}...`;

      if (i > 0 && i % 8 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      try {
        const blob = await entry.readBlob();
        const meta = metaByPath.get(entry.zipPath) || metaByName.get(entry.filename) || {};
        const res = await importPhotoRecord({ blob, meta, filename: entry.filename });
        if (res.imported) importedCount++;
        else skippedCount++;
      } catch (itemErr) {
        console.warn(`Gagal impor ${entry.filename}:`, itemErr);
        skippedCount++;
      }
    }

    await refreshGalleryOverview();
    await renderGalleryGrid();
    exportStatusText.textContent = `✓ Impor selesai: ${importedCount} foto ditambahkan, ${skippedCount} sudah ada/dilewati.`;
  } catch (err) {
    console.error('Import ZIP error:', err);
    showExportPanel(`Gagal mengimpor backup: ${err.message}`);
  } finally {
    isExporting = false;
  }
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

  currentViewingPhotoName = photo.filename;
  viewerPhotoTitle.textContent = photo.filename;
  if (viewerLocation) {
    if (photo.location && (photo.location.primaryText || photo.location.coordsText)) {
      const locDetail = [photo.location.primaryText, photo.location.secondaryText].filter(Boolean).join(', ');
      viewerLocation.textContent = `📍 ${locDetail} [${photo.location.coordsText || ''}]`;
      viewerLocation.style.display = 'block';
    } else {
      viewerLocation.style.display = 'none';
    }
  }
  viewerDate.textContent = new Date(photo.timestamp).toLocaleString('id-ID');
  viewerSize.textContent = `Ukuran: ${(photo.size / (1024 * 1024)).toFixed(2)} MB`;
  viewerFolder.textContent = `Folder GDrive: ${photo.targetFolderId || '-'}`;

  viewerStatusBadge.className = `viewer-inline-badge badge-${photo.status}`;
  viewerStatusBadge.textContent = getStatusLabel(photo.status);

  if (viewerRenameBox) {
    viewerRenameBox.style.display = 'none';
  }

  if (photo.errorMsg) {
    viewerError.textContent = `Error: ${photo.errorMsg}`;
    viewerError.style.display = 'block';
  } else {
    viewerError.style.display = 'none';
  }

  // Load high-res Blob URL without early revocation
  currentViewingBlob = photo.blob;
  if (activeViewerBlobUrl) {
    URL.revokeObjectURL(activeViewerBlobUrl);
  }
  activeViewerBlobUrl = URL.createObjectURL(photo.blob);
  viewerImg.src = activeViewerBlobUrl;

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
      // Attempt auto sync when back online (if authenticated)
      if (gdriveManager.getTargetFolderId() && gdriveManager.isConnected()) {
        gdriveManager.syncQueue();
      }
    } else {
      networkDot.className = 'status-dot offline';
      networkText.textContent = 'Offline';
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateNetworkStatus();
    }
  });
  updateNetworkStatus();
}

function setupSyncMonitoring() {
  gdriveManager.onSyncEvent(async (event) => {
    switch (event.type) {
      case 'sync_start':
        lastSyncErrorMessage = '';
        syncDot.className = 'status-dot syncing';
        syncText.textContent = 'Mengunggah...';
        break;
      case 'auth_needed':
        lastSyncErrorMessage = event.message || 'Sesi login Google belum aktif / kedaluwarsa.';
        syncDot.className = 'status-dot';
        syncText.textContent = 'Perlu Login';
        if (syncChip) syncChip.title = lastSyncErrorMessage;
        break;
      case 'photo_uploading':
        syncText.textContent = `${event.current}/${event.total} Sync`;
        break;
      case 'photo_synced':
        scheduleRefreshOverview();
        break;
      case 'photo_failed':
        if (event.error) lastSyncErrorMessage = event.error;
        scheduleRefreshOverview();
        break;
      case 'sync_finish':
        if (refreshOverviewTimer) {
          clearTimeout(refreshOverviewTimer);
          refreshOverviewTimer = null;
        }
        if (event.lastError && event.failCount > 0) {
          lastSyncErrorMessage = event.lastError;
        } else if (event.failCount === 0) {
          lastSyncErrorMessage = '';
        }
        await refreshGalleryOverview();
        if (galleryModal.classList.contains('active')) {
          renderGalleryGrid();
        }
        break;
      case 'sync_error':
        lastSyncErrorMessage = event.error || 'Terjadi kesalahan antrean sinkronisasi.';
        syncDot.className = 'status-dot offline';
        syncText.textContent = 'Error Sync';
        if (syncChip) syncChip.title = lastSyncErrorMessage;
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
        e.target.closest('#whats-new-banner') ||
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

  if (prefixInput) {
    prefixInput.addEventListener('change', () => {
      const clean = sanitizePrefix(prefixInput.value);
      prefixInput.value = clean;
      localStorage.setItem('megallery_prefix', clean);
    });
  }

  if (watermarkToggle) {
    watermarkToggle.addEventListener('change', () => {
      localStorage.setItem('megallery_watermark_enabled', String(watermarkToggle.checked));
    });
  }

  folderLinkInput.addEventListener('input', handleFolderInputChange);

  if (pasteFolderBtn) {
    pasteFolderBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          folderLinkInput.value = text.trim();
          handleFolderInputChange();
        }
      } catch (err) {
        console.warn('Clipboard read error:', err);
        folderLinkInput.focus();
      }
    });
  }

  if (permissionHelpBtn && permissionTooltip) {
    permissionHelpBtn.addEventListener('click', () => {
      const isHidden = permissionTooltip.style.display === 'none';
      permissionTooltip.style.display = isHidden ? 'block' : 'none';
    });
  }

  authGoogleBtn.addEventListener('click', handleGoogleAuth);

  segQualityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.quality;
      if (!q) return;
      localStorage.setItem('megallery_quality', q);
      updateQualityUI(q);
    });
  });

  cleanupSyncedBtn.addEventListener('click', async () => {
    if (confirm('Hapus semua foto lokal yang sudah berhasil terunggah ke Google Drive?')) {
      const count = await deleteSyncedPhotos();
      await refreshGalleryOverview();
      renderGalleryGrid();
      alert(`Berhasil membersihkan ${count} foto dari penyimpanan lokal.`);
    }
  });

  if (syncChip) {
    syncChip.addEventListener('click', async () => {
      const stats = await getGalleryOverview();
      const lines = [
        `Status Antrean: ${stats.pendingCount} Antre • ${stats.failedCount} Gagal • ${stats.syncedCount} Tersinkron (${stats.totalMb} MB)`
      ];
      if (!gdriveManager.getTargetFolderId()) {
        lines.push('Folder Google Drive belum diisi di Pengaturan.');
      } else if (!gdriveManager.isConnected()) {
        lines.push('Akun Google perlu dihubungkan ulang di Pengaturan.');
      }
      if (lastSyncErrorMessage) {
        lines.push(`Pesan terakhir: ${lastSyncErrorMessage}`);
      }
      alert(lines.join('\n\n'));
    });
  }

  // Gallery Modal Controls
  galleryBtn.addEventListener('click', async () => {
    await renderGalleryGrid();
    galleryModal.classList.add('active');
  });
  closeGalleryBtn.addEventListener('click', () => {
    galleryModal.classList.remove('active');
  });

  if (downloadPendingBtn) {
    downloadPendingBtn.addEventListener('click', () => handleExport({ mode: 'pending', includeBackup: false }));
  }
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', () => handleExport({ mode: 'all', includeBackup: false }));
  }
  if (downloadBackupBtn) {
    downloadBackupBtn.addEventListener('click', () => handleExport({ mode: 'all', includeBackup: true }));
  }
  if (quickBackupBtn) {
    quickBackupBtn.addEventListener('click', () => handleExport({ mode: 'all', includeBackup: true }));
  }
  if (importBackupBtn && importBackupInput) {
    importBackupBtn.addEventListener('click', () => {
      importBackupInput.value = '';
      importBackupInput.click();
    });
    importBackupInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImportBackup(file);
      }
    });
  }
  if (closeExportPanelBtn && exportStatusPanel) {
    closeExportPanelBtn.addEventListener('click', () => {
      exportStatusPanel.style.display = 'none';
      if (exportActionsContainer) exportActionsContainer.innerHTML = '';
    });
  }

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
    if (viewerRenameBox) viewerRenameBox.style.display = 'none';
    currentViewingPhotoId = null;
    currentViewingPhotoName = null;
    currentViewingBlob = null;
    if (activeViewerBlobUrl) {
      URL.revokeObjectURL(activeViewerBlobUrl);
      activeViewerBlobUrl = null;
    }
  });

  if (viewerDownloadBtn) {
    viewerDownloadBtn.addEventListener('click', async () => {
      if (!currentViewingBlob) return;
      await shareOrDownloadPhoto(currentViewingBlob, currentViewingPhotoName || 'MeGallery_photo.jpg');
    });
  }

  if (viewerRenameBtn && viewerRenameBox && viewerRenameInput) {
    viewerRenameBtn.addEventListener('click', async () => {
      if (!currentViewingPhotoId) return;
      const isHidden = viewerRenameBox.style.display === 'none';
      if (isHidden) {
        const photo = await getPhotoById(currentViewingPhotoId);
        if (!photo) return;
        viewerRenameInput.value = photo.filename.replace(/\.jpe?g$/i, '');
        viewerRenameBox.style.display = 'flex';
        viewerRenameInput.focus();
      } else {
        viewerRenameBox.style.display = 'none';
      }
    });

    viewerRenameCancelBtn.addEventListener('click', () => {
      viewerRenameBox.style.display = 'none';
    });

    const handleSaveRename = async () => {
      if (!currentViewingPhotoId) return;
      const rawInput = viewerRenameInput.value.trim();
      if (!rawInput) return;
      const cleanName = sanitizeFilename(rawInput);

      const currentPhoto = await getPhotoById(currentViewingPhotoId);
      if (!currentPhoto) return;

      if (currentPhoto.filename === cleanName) {
        viewerRenameBox.style.display = 'none';
        return;
      }

      try {
        viewerRenameSaveBtn.disabled = true;
        viewerRenameSaveBtn.textContent = '...';

        // If synced with Google Drive, rename in Google Drive first
        if (currentPhoto.status === 'synced' && currentPhoto.gdriveFileId) {
          if (navigator.onLine && gdriveManager.isConnected()) {
            await gdriveManager.renameFile(currentPhoto.gdriveFileId, cleanName);
          } else {
            alert('Perangkat offline atau belum login Google Drive. Nama lokal diperbarui, namun nama di Google Drive belum sinkron.');
          }
        }

        await renamePhoto(currentViewingPhotoId, cleanName);
        currentViewingPhotoName = cleanName;
        viewerPhotoTitle.textContent = cleanName;
        viewerRenameBox.style.display = 'none';
        await refreshGalleryOverview();
        if (galleryModal.classList.contains('active')) {
          renderGalleryGrid();
        }
      } catch (err) {
        console.error('Rename error:', err);
        alert('Gagal mengubah nama: ' + err.message);
      } finally {
        viewerRenameSaveBtn.disabled = false;
        viewerRenameSaveBtn.textContent = '✓';
      }
    };

    viewerRenameSaveBtn.addEventListener('click', handleSaveRename);
    viewerRenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveRename();
      } else if (e.key === 'Escape') {
        viewerRenameBox.style.display = 'none';
      }
    });
  }

  viewerDeleteBtn.addEventListener('click', async () => {
    if (!currentViewingPhotoId) return;
    if (confirm('Hapus foto ini dari penyimpanan lokal aplikasi?')) {
      await deletePhoto(currentViewingPhotoId);
      photoViewerModal.classList.remove('active');
      currentViewingPhotoId = null;
      currentViewingPhotoName = null;
      currentViewingBlob = null;
      if (activeViewerBlobUrl) {
        URL.revokeObjectURL(activeViewerBlobUrl);
        activeViewerBlobUrl = null;
      }
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

  // Fullscreen Clean Lightbox Controls (For Pure Screenshots)
  function closeLightbox() {
    fullscreenLightbox.style.display = 'none';
    if (activeLightboxBlobUrl) {
      URL.revokeObjectURL(activeLightboxBlobUrl);
      activeLightboxBlobUrl = null;
    }
  }

  if (viewerContentBox && fullscreenLightbox && lightboxImg) {
    viewerContentBox.addEventListener('click', () => {
      if (currentViewingBlob) {
        if (activeLightboxBlobUrl) {
          URL.revokeObjectURL(activeLightboxBlobUrl);
        }
        activeLightboxBlobUrl = URL.createObjectURL(currentViewingBlob);
        lightboxImg.src = activeLightboxBlobUrl;
        fullscreenLightbox.style.display = 'flex';
      }
    });

    if (closeLightboxBtn) {
      closeLightboxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
      });
    }

    fullscreenLightbox.addEventListener('click', closeLightbox);
  }

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
