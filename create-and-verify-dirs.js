#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\ANURON\\smartHire-BE-FE-v2';

const directories = [
  'ai-recruitment\\src\\modules\\preferences\\types',
  'ai-recruitment\\src\\modules\\preferences\\validators',
  'ai-recruitment\\src\\modules\\preferences\\services',
  'ai-recruitment\\src\\modules\\preferences\\controllers',
  'ai-recruitment\\src\\app\\api\\preferences',
  'ai-recruitment\\src\\app\\api\\salary-insights',
  'ai-recruitment\\src\\app\\api\\role-fit',
  'ai-recruitment\\src\\app\\(dashboard)\\preferences',
  'ai-recruitment\\src\\components\\preferences'
];

console.log('======================================================================');
console.log('Creating 9 Preference Module Directories');
console.log('======================================================================\n');

let created = 0;
let exists = 0;
let failed = 0;

// Create directories
directories.forEach((dir, index) => {
  const fullPath = path.join(baseDir, dir);
  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✓ Created: ${dir}`);
      created++;
    } else {
      console.log(`- Already exists: ${dir}`);
      exists++;
    }
  } catch (err) {
    console.log(`✗ Failed to create: ${dir} - ${err.message}`);
    failed++;
  }
});

console.log('\n======================================================================');
console.log('Verification');
console.log('======================================================================\n');

let verified = 0;

directories.forEach((dir, index) => {
  const fullPath = path.join(baseDir, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`[OK] ${index + 1}. ${dir}`);
    verified++;
  } else {
    console.log(`[MISSING] ${index + 1}. ${dir}`);
  }
});

console.log('\n======================================================================');
console.log('Summary');
console.log('======================================================================');
console.log(`Result: ${verified}/9 directories verified successfully`);
console.log(`Created: ${created}, Already existed: ${exists}, Failed: ${failed}`);

if (verified === 9) {
  console.log('\n✓ SUCCESS: All 9 directories are ready!');
  process.exit(0);
} else {
  console.log(`\n✗ FAILURE: Only ${verified} out of 9 directories are available`);
  process.exit(1);
}
console.log('======================================================================\n');
