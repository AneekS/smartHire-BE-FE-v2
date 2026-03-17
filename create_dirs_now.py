#!/usr/bin/env python3
import os
import sys

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

results = []
results.append("="*70)
results.append("DIRECTORY CREATION PROCESS")
results.append("="*70)
results.append("")

for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    
    try:
        os.makedirs(full_path, exist_ok=True)
        results.append(f"✓ Created: {dir_path}")
    except Exception as e:
        results.append(f"✗ Error creating {dir_path}: {e}")
        continue
    
    gitkeep_path = os.path.join(full_path, '.gitkeep')
    try:
        with open(gitkeep_path, 'w') as f:
            pass
        results.append(f"  ✓ .gitkeep created")
    except Exception as e:
        results.append(f"  ✗ Error creating .gitkeep: {e}")

results.append("")
results.append("="*70)
results.append("VERIFICATION")
results.append("="*70)
results.append("")

all_exist = True
for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    gitkeep_path = os.path.join(full_path, '.gitkeep')
    
    dir_exists = os.path.isdir(full_path)
    gitkeep_exists = os.path.isfile(gitkeep_path)
    
    if dir_exists and gitkeep_exists:
        results.append(f"✓ {dir_path}")
        results.append(f"  └─ .gitkeep: Present")
    else:
        results.append(f"✗ {dir_path}")
        if not dir_exists:
            results.append(f"  └─ Directory: Not found")
        if not gitkeep_exists:
            results.append(f"  └─ .gitkeep: Not found")
        all_exist = False

results.append("")
results.append("="*70)
if all_exist:
    results.append("✓ SUCCESS: All 9 directories created successfully!")
else:
    results.append("✗ FAILURE: Some directories failed to create")
results.append("="*70)

output = "\n".join(results)
print(output)

# Write to log file
with open(r'C:\Users\ANURON\smartHire-BE-FE-v2\directory_creation_log.txt', 'w') as f:
    f.write(output)
