import os
import sys
import subprocess

# Try to execute the directory creation
os.chdir(r'C:\Users\ANURON\smartHire-BE-FE-v2')

base_dir = r'C:\Users\ANURON\smartHire-BE-FE-v2'

directories = [
    r'ai-recruitment\src\modules\preferences\types',
    r'ai-recruitment\src\modules\preferences\validators',
    r'ai-recruitment\src\modules\preferences\services',
    r'ai-recruitment\src\modules\preferences\controllers',
    r'ai-recruitment\src\app\api\preferences',
    r'ai-recruitment\src\app\api\salary-insights',
    r'ai-recruitment\src\app\api\role-fit',
    r'ai-recruitment\src\app\(dashboard)\preferences',
    r'ai-recruitment\src\components\preferences'
]

print("Creating directories...")
for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    os.makedirs(full_path, exist_ok=True)
    gitkeep = os.path.join(full_path, '.gitkeep')
    open(gitkeep, 'a').close()
    print(f"✓ {dir_path}")

print("\nVerifying...")
all_ok = True
for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    gitkeep = os.path.join(full_path, '.gitkeep')
    if os.path.isdir(full_path) and os.path.isfile(gitkeep):
        print(f"✓ {dir_path}")
    else:
        print(f"✗ {dir_path}")
        all_ok = False

print("\n" + "="*70)
if all_ok:
    print("✓ SUCCESS: All 9 directories created with .gitkeep files!")
else:
    print("✗ FAILURE: Some directories were not created properly")
print("="*70)
