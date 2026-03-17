import subprocess
import sys

try:
    result = subprocess.run(
        r'cmd /c C:\Users\ANURON\smartHire-BE-FE-v2\create_and_verify_dirs.bat',
        capture_output=True,
        text=True,
        shell=True
    )
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    sys.exit(result.returncode)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
