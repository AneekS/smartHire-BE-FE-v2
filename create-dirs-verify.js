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

console.log('Creating directories with .gitkeep files...\n');

directories.forEach((dir) => {
  const fullPath = path.join(baseDir, dir);
  
  try {
    // Create directory recursively
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } catch (err) {
    console.log(`✗ Error creating ${dir}: ${err.message}`);
    return;
  }
  
  // Create .gitkeep file
  const gitkeepPath = path.join(fullPath, '.gitkeep');
  try {
    fs.writeFileSync(gitkeepPath, '');
  } catch (err) {
    console.log(`  ✗ Error creating .gitkeep: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('VERIFICATION');
console.log('='.repeat(70) + '\n');

let allExist = true;
let successCount = 0;

directories.forEach((dir) => {
  const fullPath = path.join(baseDir, dir);
  const gitkeepPath = path.join(fullPath, '.gitkeep');
  
  try {
    const dirExists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    const gitkeepExists = fs.existsSync(gitkeepPath) && fs.statSync(gitkeepPath).isFile();
    
    if (dirExists && gitkeepExists) {
      console.log(`✓ EXISTS: ${dir}`);
      console.log(`  └─ .gitkeep: Present`);
      successCount++;
    } else {
      console.log(`✗ MISSING: ${dir}`);
      if (!dirExists) console.log(`  └─ Directory: Not found`);
      if (!gitkeepExists) console.log(`  └─ .gitkeep: Not found`);
      allExist = false;
    }
  } catch (err) {
    console.log(`✗ Error checking ${dir}: ${err.message}`);
    allExist = false;
  }
});

console.log('\n' + '='.repeat(70));
if (allExist) {
  console.log('✓ SUCCESS: All 9 directories created successfully!');
} else {
  console.log(`⚠ PARTIAL: ${successCount}/9 directories verified`);
}
console.log('='.repeat(70));

process.exit(allExist ? 0 : 1);
