/**
 * Google Drive Folder Link & ID Parser + Sanitizer
 */
export function extractFolderId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern 1: /folders/<id> (handles drive.google.com/drive/folders/... and /drive/u/0/folders/...)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/i);
  if (folderMatch && folderMatch[1]) {
    return sanitizeFolderId(folderMatch[1]);
  }

  // Pattern 2: ?id=<id> or &id=<id> (handles open?id=... or /folderview?id=...)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/i);
  if (idParamMatch && idParamMatch[1]) {
    return sanitizeFolderId(idParamMatch[1]);
  }

  // Pattern 3: Raw folder ID directly (Google Drive IDs are typically 15-44 chars base64url)
  if (/^[a-zA-Z0-9_-]{10,64}$/.test(trimmed)) {
    return sanitizeFolderId(trimmed);
  }

  return null;
}

export function sanitizeFolderId(id) {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export function isValidFolderId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,64}$/.test(id);
}

/**
 * Sanitize custom filename
 */
export function sanitizeFilename(input) {
  if (!input || typeof input !== 'string') return `MeGallery_${Date.now()}.jpg`;
  
  // Strip path traversal and illegal filename characters
  let clean = input.trim().replace(/[/\\:*?"<>|]/g, '_');
  
  // Remove duplicate spaces/underscores
  clean = clean.replace(/_+/g, '_').trim();
  if (!clean) return `MeGallery_${Date.now()}.jpg`;

  // Ensure extension is .jpg
  if (!/\.(jpe?g|png)$/i.test(clean)) {
    clean = `${clean}.jpg`;
  }
  
  return clean.slice(0, 120);
}

/**
 * Sanitize custom prefix
 */
export function sanitizePrefix(input) {
  if (!input || typeof input !== 'string') return 'MeGallery_';
  let clean = input.trim().replace(/[/\\:*?"<>|]/g, '_');
  clean = clean.replace(/\s+/g, '_');
  if (!clean) return 'MeGallery_';
  // If doesn't end with _ or -, add _ for clean timestamp separation
  if (!/[_-]$/.test(clean)) {
    clean += '_';
  }
  return clean.slice(0, 32);
}
