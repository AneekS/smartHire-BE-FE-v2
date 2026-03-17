const fs = require('fs');

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

const basePath = 'C:/Users/ANURON/smartHire-BE-FE-v2/';

dirs.forEach(d => {
  const p = basePath + d;
  try {
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(p + '/.gitkeep', '');
    console.log('Created: ' + p);
  } catch (err) {
    console.error('Error creating ' + p + ': ' + err.message);
  }
});
