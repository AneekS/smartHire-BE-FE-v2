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
console.log('Creating 9 Preference Module Directories with .gitkeep');
console.log('======================================================================\n');

let created = 0;
let exists = 0;
let failed = 0;
let gitkeepCreated = 0;
let gitkeepFailed = 0;

// Create directories and .gitkeep files
directories.forEach((dir, index) => {
  const fullPath = path.join(baseDir, dir);
  const gitkeepPath = path.join(fullPath, '.gitkeep');
  
  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✓ Created: ${dir}`);
      created++;
    } else {
      console.log(`- Already exists: ${dir}`);
      exists++;
    }
    
    // Create .gitkeep file
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
      gitkeepCreated++;
      console.log(`  ✓ Created .gitkeep`);
    } else {
      console.log(`  - .gitkeep already exists`);
    }
  } catch (err) {
    console.log(`✗ Failed to create: ${dir} - ${err.message}`);
    failed++;
    gitkeepFailed++;
  }
});

console.log('\n======================================================================');
console.log('Verification');
console.log('======================================================================\n');

let verified = 0;
let gitkeepVerified = 0;

directories.forEach((dir, index) => {
  const fullPath = path.join(baseDir, dir);
  const gitkeepPath = path.join(fullPath, '.gitkeep');
  
  if (fs.existsSync(fullPath)) {
    if (fs.existsSync(gitkeepPath)) {
      console.log(`[✓] ${index + 1}. ${dir} (.gitkeep exists)`);
      verified++;
      gitkeepVerified++;
    } else {
      console.log(`[⚠] ${index + 1}. ${dir} (missing .gitkeep)`);
      verified++;
    }
  } else {
    console.log(`[✗] ${index + 1}. ${dir} (directory missing)`);
  }
});

console.log('\n======================================================================');
console.log('Summary');
console.log('======================================================================');
console.log(`Directories verified: ${verified}/9`);
console.log(`.gitkeep files verified: ${gitkeepVerified}/9`);
console.log(`Created: ${created}, Already existed: ${exists}, Failed: ${failed}`);

if (verified === 9 && gitkeepVerified === 9) {
  console.log('\n✓ SUCCESS: All 9 directories created with .gitkeep files!');
  process.exit(0);
} else if (verified === 9) {
  console.log(`\n⚠ PARTIAL SUCCESS: Directories exist but only ${gitkeepVerified}/9 have .gitkeep`);
  process.exit(1);
} else {
  console.log(`\n✗ FAILURE: Only ${verified} out of 9 directories are available`);
  process.exit(1);
}
console.log('======================================================================\n');
