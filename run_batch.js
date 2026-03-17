const { execSync } = require('child_process');

try {
  const output = execSync('cmd /c C:\\Users\\ANURON\\smartHire-BE-FE-v2\\create_and_verify_dirs.bat', {
    encoding: 'utf-8',
    stdio: 'pipe',
    windowsHide: false
  });
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
  if (error.stdout) console.log('Output:', error.stdout);
  if (error.stderr) console.log('Error Output:', error.stderr);
  process.exit(1);
}
