const fs = require('fs');
const path = require('path');

const directories = [
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\types",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\validators",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\services",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\modules\\preferences\\controllers",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\preferences",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\salary-insights",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\api\\role-fit",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\app\\(dashboard)\\preferences",
    "C:\\Users\\ANURON\\smartHire-BE-FE-v2\\ai-recruitment\\src\\components\\preferences"
];

console.log('Creating directories...\n');

let created = 0;
let failed = 0;

directories.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✓ ${dir}`);
            created++;
        } else {
            console.log(`- ${dir} (already exists)`);
        }
    } catch (err) {
        console.log(`✗ ${dir} (FAILED: ${err.message})`);
        failed++;
    }
});

console.log(`\nSummary: ${created} created, ${failed} failed, ${directories.length - created - failed} already exist`);
