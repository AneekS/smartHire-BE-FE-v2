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

dirs.forEach(d => console.log(d + ': ' + (fs.existsSync(d) ? 'EXISTS' : 'NOT FOUND')));
