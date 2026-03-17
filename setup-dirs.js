#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dirs = [
  'ai-recruitment/src/modules/preferences/types',
  'ai-recruitment/src/modules/preferences/validators',
  'ai-recruitment/src/modules/preferences/services',
  'ai-recruitment/src/modules/preferences/controllers',
  'ai-recruitment/src/app/api/preferences',
  'ai-recruitment/src/app/api/salary-insights',
  'ai-recruitment/src/app/api/role-fit',
  'ai-recruitment/src/app/(dashboard)/preferences',
  'ai-recruitment/src/components/preferences'
];

let success = 0;
let errors = 0;

console.log('\n════════════════════════════════════════════════════════');
console.log('Creating directories and .gitkeep files...');
console.log('════════════════════════════════════════════════════════\n');

dirs.forEach((dir, idx) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.gitkeep'), '');
    console.log(`✓ [${idx + 1}/9] Created: ${dir}/.gitkeep`);
    success++;
  } catch (e) {
    console.error(`✗ [${idx + 1}/9] Failed: ${dir} - ${e.message}`);
    errors++;
  }
});

console.log('\n════════════════════════════════════════════════════════');
console.log(`Results: ${success} created, ${errors} errors`);
console.log('════════════════════════════════════════════════════════\n');

// Verify
console.log('Verifying all .gitkeep files exist...\n');
let verified = 0;
dirs.forEach((dir, idx) => {
  const gitkeepPath = path.join(dir, '.gitkeep');
  if (fs.existsSync(gitkeepPath)) {
    console.log(`✓ [${idx + 1}/9] Verified: ${gitkeepPath}`);
    verified++;
  } else {
    console.log(`✗ [${idx + 1}/9] Missing: ${gitkeepPath}`);
  }
});

console.log(`\n✓ All done! ${verified}/${dirs.length} directories verified.\n`);
