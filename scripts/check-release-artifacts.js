const fs = require('fs');
const path = require('path');

const platform = process.env.RELEASE_ARTIFACTS_PLATFORM || process.platform;
const expectedFiles = [];

if (platform === 'darwin') {
  expectedFiles.push('latest-mac.yml');
} else if (platform === 'win32') {
  expectedFiles.push('latest.yml');
} else {
  expectedFiles.push('latest-linux.yml');
}

const candidates = expectedFiles.flatMap((filename) => [
  path.join(__dirname, '..', 'dist', filename),
  path.join(__dirname, '..', 'electron-dist', filename),
]);

const found = candidates.find((file) => fs.existsSync(file));

if (!found) {
  console.error(`Missing update metadata for ${platform} release artifacts.`);
  console.error(`Expected one of: ${expectedFiles.join(', ')}`);
  console.error('Looked in:');
  candidates.forEach((file) => console.error(`- ${file}`));
  console.error('Ensure electron-builder generated update metadata before releasing.');
  process.exit(1);
}

console.log(`✅ Found update metadata: ${found}`);
