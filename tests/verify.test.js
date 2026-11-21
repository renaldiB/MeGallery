import assert from 'node:assert/strict';
import { extractFolderId, sanitizeFolderId, isValidFolderId, sanitizeFilename, sanitizePrefix } from '../src/utils/gdriveLink.js';
import { formatIndonesianTimestamp } from '../src/utils/geolocation.js';
import { haversineDistance, findNearestSumselLocation } from '../src/data/sumselGeo.js';

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

console.log('✓ All verification tests passed successfully.');
