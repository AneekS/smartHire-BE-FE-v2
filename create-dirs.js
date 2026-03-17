const fs = require('fs');
const path = require('path');

// Use relative paths from current working directory
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

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  DIRECTORY CREATION SCRIPT FOR AI-RECRUITMENT MODULE  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log('Current working directory: ' + process.cwd());
console.log('Total directories to create: ' + dirs.length);
console.log('\n─────────────────────────────────────────────────────────');
console.log('CREATING DIRECTORIES');
console.log('─────────────────────────────────────────────────────────\n');

const created = [];
const alreadyExisted = [];
const errors = [];

dirs.forEach((dir, index) => {
  try {
    const exists = fs.existsSync(dir);
    if (exists) {
      console.log('[' + (index + 1) + '/9] ℹ  Already exists: ' + dir);
      alreadyExisted.push(dir);
    } else {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[' + (index + 1) + '/9] ✓ Created: ' + dir);
      created.push(dir);
    }
    // Create .gitkeep file
    const gitkeepPath = path.join(dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  } catch (err) {
    console.log('[' + (index + 1) + '/9] ✗ Failed: ' + dir);
    console.log('       Error: ' + err.message);
    errors.push({ dir: dir, error: err.message });
  }
});

console.log('\n─────────────────────────────────────────────────────────');
console.log('VERIFICATION');
console.log('─────────────────────────────────────────────────────────\n');

let verified = 0;
dirs.forEach((dir, index) => {
  try {
    if (fs.existsSync(dir)) {
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (fs.existsSync(gitkeepPath)) {
        console.log('[' + (index + 1) + '/9] ✓ Verified: ' + dir + ' (.gitkeep exists)');
      } else {
        console.log('[' + (index + 1) + '/9] ⚠  Directory exists but .gitkeep missing: ' + dir);
      }
      verified++;
    } else {
      console.log('[' + (index + 1) + '/9] ✗ Not found: ' + dir);
    }
  } catch (err) {
    console.log('[' + (index + 1) + '/9] ✗ Error checking: ' + dir);
    console.log('       Error: ' + err.message);
  }
});

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                     FINAL SUMMARY                      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log('Total directories:     ' + dirs.length);
console.log('Newly created:         ' + created.length);
console.log('Already existed:       ' + alreadyExisted.length);
console.log('Errors encountered:    ' + errors.length);
console.log('Successfully verified: ' + verified + ' / ' + dirs.length);

if (created.length > 0) {
  console.log('\n✓ NEWLY CREATED DIRECTORIES:');
  created.forEach(dir => console.log('  • ' + dir));
}

if (alreadyExisted.length > 0) {
  console.log('\nℹ  DIRECTORIES THAT ALREADY EXISTED:');
  alreadyExisted.forEach(dir => console.log('  • ' + dir));
}

if (errors.length > 0) {
  console.log('\n✗ ERRORS:');
  errors.forEach(item => console.log('  • ' + item.dir + '\n    → ' + item.error));
}

console.log('\n' + (verified === dirs.length ? '✓ SUCCESS' : '✗ FAILURE') + ': ' + verified + ' of ' + dirs.length + ' directories verified\n');

if (verified === dirs.length) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        ✓ ALL DIRECTORIES CREATED SUCCESSFULLY!         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  process.exit(0);
} else {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              ✗ SOME DIRECTORIES FAILED                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}
