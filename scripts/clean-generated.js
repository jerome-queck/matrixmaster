#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const generatedDirectories = ['dist', 'electron-dist', '.cache'];

for (const directory of generatedDirectories) {
  const target = path.join(root, directory);
  fs.rmSync(target, { recursive: true, force: true });
}

const removeDesktopMetadata = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.name === '.DS_Store') {
      fs.rmSync(fullPath, { force: true });
      continue;
    }
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      removeDesktopMetadata(fullPath);
    }
  }
};

removeDesktopMetadata(root);
console.log('Removed generated build outputs and desktop metadata.');
