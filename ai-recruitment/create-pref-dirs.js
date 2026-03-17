/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const base = path.join('C:', 'Users', 'ANURON', 'smartHire-BE-FE-v2', 'ai-recruitment', 'src');

const dirs = [
  'modules\\preferences\\types',
  'modules\\preferences\\validators',
  'modules\\preferences\\services',
  'modules\\preferences\\controllers',
  'app\\api\\preferences',
  'app\\api\\salary-insights',
  'app\\api\\role-fit',
  'app\\(dashboard)\\preferences',
  'components\\preferences',
];

let allOk = true;

for (const dir of dirs) {
  const full = path.join(base, dir);
  fs.mkdirSync(full, { recursive: true });
  const gk = path.join(full, '.gitkeep');
  fs.writeFileSync(gk, '');
  const dirOk = fs.existsSync(full);
  const fileOk = fs.existsSync(gk);
  console.log(`[${dirOk && fileOk ? 'OK' : 'FAIL'}] ${full}`);
  if (!dirOk || !fileOk) allOk = false;
}

console.log(allOk ? '\nAll directories and .gitkeep files created successfully.' : '\nSome items failed.');
