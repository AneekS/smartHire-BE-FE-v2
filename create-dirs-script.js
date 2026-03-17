const fs = require('fs');
const path = require('path');

const filePaths = [
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\types\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\validators\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\services\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\controllers\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\preferences\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\salary-insights\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\role-fit\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\(dashboard)\\preferences\\.gitkeep',
  'C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\components\\preferences\\.gitkeep'
];

filePaths.forEach(filePath => {
  const dir = path.dirname(filePath);
  try {
    // Create directory recursively if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    // Create empty .gitkeep file
    fs.writeFileSync(filePath, '');
    console.log(`✓ Created: ${filePath}`);
  } catch (err) {
    console.error(`✗ Error creating ${filePath}:`, err.message);
  }
});

console.log('\nAll directories and .gitkeep files have been created!');
