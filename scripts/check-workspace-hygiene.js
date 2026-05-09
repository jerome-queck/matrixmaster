#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  '.cache',
  '.claude',
  '.codex',
  'dist',
  'electron-dist',
  'node_modules',
  'test-results',
  'playwright-report',
  'blob-report'
]);

const duplicateNamePattern = /(?:^|[/\\])[^/\\]+ 2(?:\.[^/\\]+)?$/;
const violations = [];

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (entry.name === '.DS_Store') {
      violations.push(relativePath);
      continue;
    }

    if (duplicateNamePattern.test(relativePath)) {
      violations.push(relativePath);
      continue;
    }

    if (entry.isDirectory()) {
      if (directory === root && ignoredDirectories.has(entry.name)) continue;
      walk(fullPath);
    }
  }
};

walk(root);

if (violations.length > 0) {
  console.error('Workspace hygiene check failed. Remove duplicate/conflict artifacts:');
  for (const violation of violations.sort()) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Workspace hygiene check passed.');
