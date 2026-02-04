const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', 'dist', 'latest-mac.yml'),
  path.join(__dirname, '..', 'electron-dist', 'latest-mac.yml'),
];

const found = candidates.find((file) => fs.existsSync(file));

if (!found) {
  console.error('Missing latest-mac.yml in release artifacts.');
  console.error('Expected one of:');
  candidates.forEach((file) => console.error(`- ${file}`));
  console.error('Ensure electron-builder generated update metadata before releasing.');
  process.exit(1);
}

console.log(`✅ Found update metadata: ${found}`);
