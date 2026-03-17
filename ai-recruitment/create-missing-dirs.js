#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const base = path.join('C:', 'Users', 'ANURON', 'smartHire-BE-FE-v2', 'ai-recruitment', 'src');
const dirs = [
  'app/api/preferences',
  'app/api/salary-insights',
  'app/api/role-fit',
  'app/(dashboard)/preferences',
];

for (const dir of dirs) {
  const full = path.join(base, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`Created directory: ${full}`);
  }
  
  const gk = path.join(full, '.gitkeep');
  if (!fs.existsSync(gk)) {
    fs.writeFileSync(gk, '');
    console.log(`Created .gitkeep: ${gk}`);
  } else {
    console.log(`Already exists: ${gk}`);
  }
}

console.log('\nDone!');
