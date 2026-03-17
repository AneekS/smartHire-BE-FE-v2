#!/usr/bin/env python3

import os
import sys
from pathlib import Path

base_dir = r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment'

file_paths = [
    r'src\modules\preferences\types\.gitkeep',
    r'src\modules\preferences\validators\.gitkeep',
    r'src\modules\preferences\services\.gitkeep',
    r'src\modules\preferences\controllers\.gitkeep',
    r'src\app\api\preferences\.gitkeep',
    r'src\app\api\salary-insights\.gitkeep',
    r'src\app\api\role-fit\.gitkeep',
    r'src\app\(dashboard)\preferences\.gitkeep',
    r'src\components\preferences\.gitkeep'
]

print('Creating directories and .gitkeep files...\n')

success_count = 0
error_count = 0

for file_path in file_paths:
    full_path = os.path.join(base_dir, file_path)
    dir_path = os.path.dirname(full_path)
    
    try:
        # Create directory recursively if it doesn't exist
        os.makedirs(dir_path, exist_ok=True)
        # Create empty .gitkeep file
        Path(full_path).touch()
        print(f'✓ Created: {file_path}')
        success_count += 1
    except Exception as err:
        print(f'✗ Error creating {file_path}: {str(err)}')
        error_count += 1

print(f'\n{"="*60}')
print(f'Summary: {success_count} files created successfully')
if error_count > 0:
    print(f'Errors: {error_count}')
print(f'{"="*60}')
print('All directories and .gitkeep files have been created!\n')
