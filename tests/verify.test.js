import assert from 'node:assert/strict';
import { extractFolderId, sanitizeFolderId, isValidFolderId, sanitizeFilename, sanitizePrefix } from '../src/utils/gdriveLink.js';
import { formatIndonesianTimestamp } from '../src/utils/geolocation.js';
import { haversineDistance, findNearestSumselLocation } from '../src/data/sumselGeo.js';
import { computeCrc32, chunkPhotoBatches, buildZipBatches, readBackupZip } from '../src/utils/zipExport.js';

console.log('Running verify tests for gdriveLink...');

// Test 1: Standard URL
const url1 = 'https://drive.google.com/drive/folders/1AbC_dEf1234567890-xyz';
assert.equal(extractFolderId(url1), '1AbC_dEf1234567890-xyz', 'Failed standard URL extraction');

// Test 2: URL with user index and query params
const url2 = 'https://drive.google.com/drive/u/0/folders/1-xyzABC1234567890_test?usp=sharing';
assert.equal(extractFolderId(url2), '1-xyzABC1234567890_test', 'Failed user index URL extraction');

// Test 3: Open with ID param
const url3 = 'https://drive.google.com/open?id=1234567890abcdefABCDEF_';
assert.equal(extractFolderId(url3), '1234567890abcdefABCDEF_', 'Failed id param URL extraction');

// Test 4: Raw Folder ID
const rawId = '1AbC_dEf1234567890-xyz';
assert.equal(extractFolderId(rawId), '1AbC_dEf1234567890-xyz', 'Failed raw ID extraction');

// Test 5: Invalid / malicious inputs
assert.equal(extractFolderId('https://evil.com/<script>alert(1)</script>'), null);
assert.equal(extractFolderId('   '), null);
assert.equal(extractFolderId(null), null);
assert.equal(extractFolderId('short'), null);

// Test 6: Sanitization
assert.equal(sanitizeFolderId('1234567890!@#$%^&*()_+'), '1234567890_');
assert.equal(isValidFolderId('1AbC_dEf1234567890-xyz'), true);
assert.equal(isValidFolderId('short'), false);

// Test 7: Filename and state machine validation
const validStatuses = ['pending', 'uploading', 'synced', 'failed'];
function isValidTransition(from, to) {
  const transitions = {
    pending: ['uploading'],
    uploading: ['synced', 'failed'],
    failed: ['uploading'],
    synced: []
  };
  return transitions[from]?.includes(to) ?? false;
}
assert.equal(isValidTransition('pending', 'uploading'), true);
assert.equal(isValidTransition('uploading', 'synced'), true);
assert.equal(isValidTransition('uploading', 'failed'), true);
assert.equal(isValidTransition('failed', 'uploading'), true);
assert.equal(isValidTransition('synced', 'uploading'), false);

// Test 8: Filename and Prefix Sanitization
assert.equal(sanitizeFilename('Kwitansi Makan Siang'), 'Kwitansi Makan Siang.jpg');
assert.equal(sanitizeFilename('Invoice:2026/11/20?.jpg'), 'Invoice_2026_11_20_.jpg');
assert.equal(sanitizeFilename('Dokumen.jpeg'), 'Dokumen.jpeg');
assert.equal(sanitizeFilename('   ').startsWith('MeGallery_'), true);
assert.equal(sanitizePrefix('ProyekA'), 'ProyekA_');
assert.equal(sanitizePrefix('Invoice_'), 'Invoice_');
assert.equal(sanitizePrefix('Foto:Kantor/'), 'Foto_Kantor_');

// Test 9: Indonesian Timestamp Formatting
// Use fixed date: 2026-11-21 11:56:30 (Saturday / Sabtu)
const sampleDate = new Date(2026, 10, 21, 11, 56, 30); // Note: month 10 is November in JS 0-indexed Date
const tsObj = formatIndonesianTimestamp(sampleDate);
assert.equal(tsObj.dateLine, 'Sabtu, 21 November 2026');
assert.equal(tsObj.timeLine, '11:56:30');

// Test 10: Offline Sumatera Selatan & Palembang Nearest Location Resolver
// Coordinate in Palembang (near Bukit Kecil / Ampera)
const palembangLoc = findNearestSumselLocation(-2.9912, 104.7554);
assert.notEqual(palembangLoc, null);
assert.equal(palembangLoc.regency, 'Kota Palembang');
assert.equal(palembangLoc.district, 'Kec. Bukit Kecil');
assert.equal(palembangLoc.village, 'Kel. 24 Ilir');
assert.equal(palembangLoc.distanceKm < 1, true);

// Coordinate in Ogan Ilir (near Indralaya Utara)
const oganIlirLoc = findNearestSumselLocation(-3.1512, 104.6685);
assert.notEqual(oganIlirLoc, null);
assert.equal(oganIlirLoc.regency, 'Kab. Ogan Ilir');
assert.equal(oganIlirLoc.district, 'Kec. Indralaya Utara');
assert.equal(oganIlirLoc.village, 'Desa Pulau Semambu');

// Coordinate in Banyuasin (near Betung)
const banyuasinLoc = findNearestSumselLocation(-2.7125, 104.2152);
assert.notEqual(banyuasinLoc, null);
assert.equal(banyuasinLoc.regency, 'Kab. Banyuasin');
assert.equal(banyuasinLoc.district, 'Kec. Betung');

// Distance calculation check
const dist = haversineDistance(-2.9912, 104.7554, -2.9752, 104.7314);
assert.equal(dist > 2 && dist < 5, true);

// Test 11: CRC-32 standard vector
assert.equal(computeCrc32(new TextEncoder().encode('123456789')), 0xcbf43926, 'CRC-32 mismatch');

// Test 12: Batch chunking for 385 photos
const sampleMeta385 = Array.from({ length: 385 }, (_, i) => ({ id: `id_${i}`, size: 400 * 1024 })); // ~154 MB total
const singleZipBatches = chunkPhotoBatches(sampleMeta385, 250 * 1024 * 1024, Infinity);
assert.equal(singleZipBatches.length, 1, 'Expected 154MB of 385 photos to fit into 1 ZIP');
const smallFallbackBatches = chunkPhotoBatches(sampleMeta385, 30 * 1024 * 1024, 25);
assert.equal(smallFallbackBatches.length, 16, 'Expected 25-file emergency chunking across 385 photos');

// Test 13: ZIP Image-Only mode (no backup JSON) vs Full Backup round-trip + corrupt record tolerance
const mockStore = new Map();
for (let i = 1; i <= 5; i++) {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, i, i + 10, 0xff, 0xd9]);
  mockStore.set(`p_${i}`, {
    id: `p_${i}`,
    filename: `MeGallery_Test_${i}.jpg`,
    size: bytes.length,
    timestamp: 1795612800000 + i * 1000,
    location: { primaryText: 'Muara Gula Baru', secondaryText: 'Kab. Muara Enim, Sumatera Selatan' },
    targetFolderId: '1AbC_dEf1234567890-xyz',
    status: i <= 2 ? 'synced' : 'pending',
    blob: new Blob([bytes], { type: 'image/jpeg' })
  });
}
const mockMetaList = [
  ...Array.from(mockStore.values()).map((r) => ({ id: r.id, filename: r.filename, size: r.size, timestamp: r.timestamp })),
  { id: 'p_corrupt', filename: 'Corrupt_Photo.jpg', size: 100, timestamp: 1795612809000 }
];
const mockGetById = async (id) => {
  if (id === 'p_corrupt') throw new Error('Simulated WebKit Blob read error');
  return mockStore.get(id) || null;
};

// 13a: Image-only ZIP (>= 5 photos) must NOT contain _megallery_backup.json
const imageOnlyResult = await buildZipBatches({
  photoMetaList: mockMetaList,
  getPhotoById: mockGetById,
  folderName: 'MeGallery_Photos',
  archiveBaseName: 'MeGallery_All_Test',
  settingsBackup: null
});
assert.equal(imageOnlyResult.archives.length, 1);
assert.equal(imageOnlyResult.skippedFiles.length, 1);
assert.equal(imageOnlyResult.archives[0].photoCount, 5);
const parsedImgZip = await readBackupZip(imageOnlyResult.archives[0].blob);
assert.equal(parsedImgZip.backupData, null, 'Image-only download must not include backup JSON');
assert.equal(parsedImgZip.photoEntries.length, 5);
assert.equal(parsedImgZip.photoEntries[0].zipPath.startsWith('MeGallery_Photos/'), true);

// 13b: Backup ZIP must preserve settings, metadata, and exact photo bytes
const backupResult = await buildZipBatches({
  photoMetaList: mockMetaList.slice(0, 5),
  getPhotoById: mockGetById,
  folderName: 'MeGallery_Photos',
  archiveBaseName: 'MeGallery_Backup_Test',
  settingsBackup: { folderId: '1AbC_dEf1234567890-xyz', prefix: 'Lapangan_', quality: '0.85', watermarkEnabled: true }
});
assert.equal(backupResult.archives.length, 1);
const parsedBackup = await readBackupZip(backupResult.archives[0].blob);
assert.notEqual(parsedBackup.backupData, null);
assert.equal(parsedBackup.backupData.settings.folderId, '1AbC_dEf1234567890-xyz');
assert.equal(parsedBackup.backupData.settings.prefix, 'Lapangan_');
assert.equal(parsedBackup.backupData.photos.length, 5);
assert.equal(parsedBackup.backupData.photos[0].location.primaryText, 'Muara Gula Baru');
const restoredBlob = await parsedBackup.photoEntries[2].readBlob();
const restoredBytes = new Uint8Array(await restoredBlob.arrayBuffer());
assert.deepEqual(Array.from(restoredBytes), [0xff, 0xd8, 0xff, 0xe0, 3, 13, 0xff, 0xd9]);

console.log('✓ All verification tests passed successfully.');
