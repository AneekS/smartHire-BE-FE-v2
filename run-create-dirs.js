#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment';

const filePaths = [
  'src\\modules\\preferences\\types\\.gitkeep',
  'src\\modules\\preferences\\validators\\.gitkeep',
  'src\\modules\\preferences\\services\\.gitkeep',
  'src\\modules\\preferences\\controllers\\.gitkeep',
  'src\\app\\api\\preferences\\.gitkeep',
  'src\\app\\api\\salary-insights\\.gitkeep',
  'src\\app\\api\\role-fit\\.gitkeep',
  'src\\app\\(dashboard)\\preferences\\.gitkeep',
  'src\\components\\preferences\\.gitkeep'
];

console.log('Creating directories and .gitkeep files...\n');

let successCount = 0;
let errorCount = 0;

filePaths.forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  const dir = path.dirname(fullPath);
  try {
    // Create directory recursively if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    // Create empty .gitkeep file
    fs.writeFileSync(fullPath, '');
    console.log(`✓ Created: ${filePath}`);
    successCount++;
  } catch (err) {
    console.error(`✗ Error creating ${filePath}: ${err.message}`);
    errorCount++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Summary: ${successCount} files created successfully`);
if (errorCount > 0) {
  console.log(`Errors: ${errorCount}`);
}
console.log(`${'='.repeat(60)}`);
console.log('All directories and .gitkeep files have been created!\n');
