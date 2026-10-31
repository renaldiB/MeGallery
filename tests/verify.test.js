import assert from 'node:assert/strict';
import { extractFolderId, sanitizeFolderId, isValidFolderId } from '../src/utils/gdriveLink.js';

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

console.log('✓ All verification tests passed successfully.');
