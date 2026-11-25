/**
 * Zero-dependency PKZIP STORE (Method 0) Builder & Reader
 * Ideal for JPEG photos (already compressed): zero CPU overhead and streaming Blob assembly.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export const DEFAULT_MAX_ZIP_BYTES = 250 * 1024 * 1024; // 250 MB safety ceiling for iOS Safari
export const SAFE_FALLBACK_MAX_BYTES = 30 * 1024 * 1024; // 30 MB adaptive fallback
export const SAFE_FALLBACK_MAX_FILES = 25;

export function computeCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(ts) {
  const d = ts ? new Date(ts) : new Date();
  const year = Math.max(d.getFullYear(), 1980) - 1980;
  const dosTime = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const dosDate = ((year & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function createLocalHeader(nameBytes, crc, size, dosTime, dosDate) {
  const buf = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true); // Version needed 2.0
  view.setUint16(6, 0x0800, true); // UTF-8 filename flag
  view.setUint16(8, 0, true); // Compression method 0 (STORE)
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  buf.set(nameBytes, 30);
  return buf;
}

function createCentralHeader(entry) {
  const buf = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true); // Version made by
  view.setUint16(6, 20, true); // Version needed
  view.setUint16(8, 0x0800, true); // UTF-8 filename flag
  view.setUint16(10, 0, true); // Compression method 0 (STORE)
  view.setUint16(12, entry.dosTime, true);
  view.setUint16(14, entry.dosDate, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true); // Extra len
  view.setUint16(32, 0, true); // Comment len
  view.setUint16(34, 0, true); // Disk number start
  view.setUint16(36, 0, true); // Internal attrs
  view.setUint32(38, 0, true); // External attrs
  view.setUint32(42, entry.offset, true); // Relative offset of local header
  buf.set(entry.nameBytes, 46);
  return buf;
}

function createEocd(entryCount, centralDirSize, centralDirOffset) {
  const buf = new Uint8Array(22);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirSize, true);
  view.setUint32(16, centralDirOffset, true);
  view.setUint16(20, 0, true);
  return buf;
}

function makeUniqueEntryPath(folderName, rawFilename, usedPaths) {
  const cleanName = (rawFilename || 'photo.jpg').replace(/^[/\\]+/, '');
  const prefix = folderName ? `${folderName.replace(/\/+$/, '')}/` : '';
  let candidate = `${prefix}${cleanName}`;

  if (!usedPaths.has(candidate)) {
    usedPaths.add(candidate);
    return candidate;
  }

  const dotIdx = cleanName.lastIndexOf('.');
  const base = dotIdx > 0 ? cleanName.slice(0, dotIdx) : cleanName;
  const ext = dotIdx > 0 ? cleanName.slice(dotIdx) : '';
  let counter = 2;
  while (usedPaths.has(`${prefix}${base}_${counter}${ext}`)) {
    counter++;
  }
  candidate = `${prefix}${base}_${counter}${ext}`;
  usedPaths.add(candidate);
  return candidate;
}

function finalizeSingleZipBlob(blobParts, centralEntries, offset) {
  const centralParts = [];
  let centralSize = 0;
  for (const entry of centralEntries) {
    const ch = createCentralHeader(entry);
    centralParts.push(ch);
    centralSize += ch.length;
  }
  const eocd = createEocd(centralEntries.length, centralSize, offset);
  return new Blob([...blobParts, ...centralParts, eocd], { type: 'application/zip' });
}

/**
 * Group lightweight metadata list into safe ZIP size/file-count chunks
 */
export function chunkPhotoBatches(metaList, maxBytes = DEFAULT_MAX_ZIP_BYTES, maxFiles = Infinity) {
  const batches = [];
  let current = [];
  let currentBytes = 0;

  for (const item of metaList) {
    const itemSize = item.size || 0;
    const exceedsBytes = current.length > 0 && currentBytes + itemSize > maxBytes;
    const exceedsFiles = current.length >= maxFiles;
    if (exceedsBytes || exceedsFiles) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(item);
    currentBytes += itemSize;
  }

  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

/**
 * Build one or more ZIP archives from photo records without keeping all raw buffers in JS heap.
 * If settingsBackup is provided, writes _megallery_backup.json inside each ZIP for cross-device restore.
 */
export async function buildZipBatches({
  photoMetaList,
  getPhotoById,
  folderName = 'MeGallery_Photos',
  archiveBaseName = 'MeGallery_Photos',
  settingsBackup = null,
  maxBytes = DEFAULT_MAX_ZIP_BYTES,
  maxFiles = Infinity,
  onProgress = null
}) {
  const batchesMeta = chunkPhotoBatches(photoMetaList, maxBytes, maxFiles);
  const archives = [];
  const skippedFiles = [];
  const totalPhotos = photoMetaList.length;
  let processed = 0;

  for (let bIdx = 0; bIdx < batchesMeta.length; bIdx++) {
    const batch = batchesMeta[bIdx];
    const parts = [];
    const centralEntries = [];
    const usedPaths = new Set();
    const exportedPhotoMeta = [];
    let offset = 0;

    for (let i = 0; i < batch.length; i++) {
      const meta = batch[i];
      processed++;
      if (onProgress) {
        onProgress({ processed, total: totalPhotos, batchIndex: bIdx + 1, totalBatches: batchesMeta.length });
      }

      // Periodically yield to main thread to keep mobile UI responsive
      if (i > 0 && i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      try {
        const record = await getPhotoById(meta.id);
        if (!record || !record.blob || record.blob.size === 0) {
          skippedFiles.push({ id: meta.id, filename: meta.filename, reason: 'Data foto kosong' });
          continue;
        }

        const buffer = await record.blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const crc = computeCrc32(bytes);
        const size = bytes.length;

        const entryPath = makeUniqueEntryPath(folderName, record.filename || meta.filename, usedPaths);
        const nameBytes = textEncoder.encode(entryPath);
        const { dosTime, dosDate } = toDosTimeDate(record.timestamp || meta.timestamp);
        const localHeader = createLocalHeader(nameBytes, crc, size, dosTime, dosDate);

        parts.push(localHeader, record.blob);
        centralEntries.push({
          nameBytes,
          crc,
          size,
          dosTime,
          dosDate,
          offset
        });
        offset += localHeader.length + size;

        if (settingsBackup !== null) {
          exportedPhotoMeta.push({
            id: record.id,
            zipPath: entryPath,
            filename: record.filename || meta.filename,
            size: record.size || size,
            timestamp: record.timestamp || Date.now(),
            location: record.location || null,
            targetFolderId: record.targetFolderId || '',
            status: record.status || 'pending',
            retryCount: record.retryCount || 0,
            gdriveFileId: record.gdriveFileId || null,
            errorMsg: record.errorMsg || null
          });
        }
      } catch (err) {
        skippedFiles.push({
          id: meta.id,
          filename: meta.filename,
          reason: err?.message || 'Gagal membaca foto'
        });
      }
    }

    if (centralEntries.length === 0) {
      continue;
    }

    if (settingsBackup !== null) {
      const manifestPayload = JSON.stringify({
        version: 1,
        app: 'MeGallery',
        exportedAt: new Date().toISOString(),
        settings: settingsBackup,
        photos: exportedPhotoMeta
      });
      const jsonBytes = textEncoder.encode(manifestPayload);
      const crc = computeCrc32(jsonBytes);
      const nameBytes = textEncoder.encode('_megallery_backup.json');
      const { dosTime, dosDate } = toDosTimeDate(Date.now());
      const localHeader = createLocalHeader(nameBytes, crc, jsonBytes.length, dosTime, dosDate);

      parts.push(localHeader, jsonBytes);
      centralEntries.push({
        nameBytes,
        crc,
        size: jsonBytes.length,
        dosTime,
        dosDate,
        offset
      });
      offset += localHeader.length + jsonBytes.length;
    }

    const blob = finalizeSingleZipBlob(parts, centralEntries, offset);
    const partSuffix = batchesMeta.length > 1 ? `_Part${bIdx + 1}of${batchesMeta.length}` : '';
    archives.push({
      blob,
      filename: `${archiveBaseName}${partSuffix}.zip`,
      photoCount: centralEntries.length - (settingsBackup !== null ? 1 : 0),
      sizeBytes: blob.size
    });
  }

  return { archives, skippedFiles };
}

/**
 * Low-RAM ZIP reader using File/Blob slicing + optional native DecompressionStream for DEFLATE
 */
export async function readBackupZip(zipFile) {
  if (!zipFile || typeof zipFile.size !== 'number' || zipFile.size < 22) {
    throw new Error('File ZIP tidak valid atau kosong.');
  }

  const tailLen = Math.min(zipFile.size, 65558);
  const tailStart = zipFile.size - tailLen;
  const tailBuf = await zipFile.slice(tailStart, zipFile.size).arrayBuffer();
  const tailView = new DataView(tailBuf);

  let eocdOffset = -1;
  for (let i = tailLen - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50) {
      const commentLen = tailView.getUint16(i + 20, true);
      if (i + 22 + commentLen === tailLen) {
        eocdOffset = i;
        break;
      }
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Header ZIP (EOCD) tidak ditemukan. Pastikan file berformat .zip yang valid.');
  }

  const totalEntries = tailView.getUint16(eocdOffset + 10, true);
  const centralDirSize = tailView.getUint32(eocdOffset + 12, true);
  const centralDirOffset = tailView.getUint32(eocdOffset + 16, true);

  if (centralDirOffset + centralDirSize > zipFile.size) {
    throw new Error('Struktur Central Directory ZIP rusak atau terpotong.');
  }

  const cdBuf = await zipFile.slice(centralDirOffset, centralDirOffset + centralDirSize).arrayBuffer();
  const cdView = new DataView(cdBuf);
  const cdBytes = new Uint8Array(cdBuf);

  const entries = [];
  let ptr = 0;

  for (let idx = 0; idx < totalEntries && ptr + 46 <= cdBytes.length; idx++) {
    if (cdView.getUint32(ptr, true) !== 0x02014b50) {
      throw new Error('Central Directory entry ZIP tidak valid.');
    }

    const compressionMethod = cdView.getUint16(ptr + 10, true);
    const compressedSize = cdView.getUint32(ptr + 20, true);
    const nameLen = cdView.getUint16(ptr + 28, true);
    const extraLen = cdView.getUint16(ptr + 30, true);
    const commentLen = cdView.getUint16(ptr + 32, true);
    const localHeaderOffset = cdView.getUint32(ptr + 42, true);

    const fileName = textDecoder.decode(cdBytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (fileName.endsWith('/')) continue;

    entries.push({
      zipPath: fileName,
      compressionMethod,
      compressedSize,
      localHeaderOffset
    });
  }

  const readEntryBlob = async (entry, mimeType = 'application/octet-stream') => {
    const lfhBuf = await zipFile.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer();
    const lfhView = new DataView(lfhBuf);
    if (lfhView.getUint32(0, true) !== 0x04034b50) {
      throw new Error(`Local header rusak untuk ${entry.zipPath}`);
    }
    const lfhNameLen = lfhView.getUint16(26, true);
    const lfhExtraLen = lfhView.getUint16(28, true);
    const dataStart = entry.localHeaderOffset + 30 + lfhNameLen + lfhExtraLen;
    const rawSlice = zipFile.slice(dataStart, dataStart + entry.compressedSize, mimeType);

    if (entry.compressionMethod === 0) {
      return rawSlice;
    }

    if (entry.compressionMethod === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Browser tidak mendukung dekompresi DEFLATE untuk file ZIP ini.');
      }
      const decompressedStream = rawSlice.stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const decompressedBlob = await new Response(decompressedStream).blob();
      return new Blob([decompressedBlob], { type: mimeType });
    }

    throw new Error(`Metode kompresi ZIP (${entry.compressionMethod}) tidak didukung.`);
  };

  let backupData = null;
  const backupEntry = entries.find((e) => e.zipPath === '_megallery_backup.json' || e.zipPath.endsWith('/_megallery_backup.json'));
  if (backupEntry) {
    try {
      const jsonBlob = await readEntryBlob(backupEntry, 'application/json');
      backupData = JSON.parse(await jsonBlob.text());
    } catch (err) {
      console.warn('Gagal mem-parsing _megallery_backup.json:', err);
    }
  }

  const photoEntries = entries
    .filter((e) => /\.(jpe?g|png|webp)$/i.test(e.zipPath) && !e.zipPath.includes('__MACOSX/'))
    .map((e) => {
      const parts = e.zipPath.split('/');
      return {
        zipPath: e.zipPath,
        filename: parts[parts.length - 1] || e.zipPath,
        readBlob: () => readEntryBlob(e, 'image/jpeg')
      };
    });

  return { backupData, photoEntries };
}

/**
 * Trigger standard browser download for a Blob with delayed URL cleanup for iOS Safari safety
 */
export function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Share via iOS/Android Native Share Sheet if file sharing supported, else direct download
 */
export async function shareOrDownloadPhoto(blob, filename) {
  try {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename
        });
        return 'shared';
      }
    }
  } catch (err) {
    // If user explicitly cancelled the share sheet, don't force duplicate download
    if (err && err.name === 'AbortError') {
      return 'cancelled';
    }
    console.warn('Web Share gagal, fallback ke download langsung:', err);
  }

  triggerBrowserDownload(blob, filename);
  return 'downloaded';
}
