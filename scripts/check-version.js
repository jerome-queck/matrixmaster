const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const lockPath = path.join(__dirname, '..', 'package-lock.json');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

if (!version || version === '0.0.0') {
  console.error('Set package.json version before release.');
  process.exit(1);
}

if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const lockVersions = [
    ['package-lock.json version', lock.version],
    ['package-lock.json root package version', lock.packages?.['']?.version],
  ];

  for (const [label, lockVersion] of lockVersions) {
    if (lockVersion && lockVersion !== version) {
      console.error(`${label} (${lockVersion}) must match package.json version (${version}).`);
      process.exit(1);
    }
  }
}

console.log(`Version: ${version}`);
