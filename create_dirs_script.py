import os
import sys

# Change to the working directory
os.chdir('C:\\Users\\ANURON\\smartHire-BE-FE-v2')

# List of directories to create
dirs = [
    'ai-recruitment/src/modules/preferences/types',
    'ai-recruitment/src/modules/preferences/validators',
    'ai-recruitment/src/modules/preferences/services',
    'ai-recruitment/src/modules/preferences/controllers',
    'ai-recruitment/src/app/api/preferences',
    'ai-recruitment/src/app/api/salary-insights',
    'ai-recruitment/src/app/api/role-fit',
    'ai-recruitment/src/app/(dashboard)/preferences',
    'ai-recruitment/src/components/preferences'
]

print('\n' + '='*60)
print('DIRECTORY CREATION SCRIPT FOR AI-RECRUITMENT MODULE')
print('='*60)
print(f'\nCurrent working directory: {os.getcwd()}')
print(f'Total directories to create: {len(dirs)}')
print('\n' + '-'*60)
print('CREATING DIRECTORIES')
print('-'*60 + '\n')

created = []
already_existed = []
errors = []

for idx, dir_path in enumerate(dirs, 1):
    try:
        if os.path.exists(dir_path):
            print(f'[{idx}/9] ℹ  Already exists: {dir_path}')
            already_existed.append(dir_path)
        else:
            os.makedirs(dir_path, exist_ok=True)
            print(f'[{idx}/9] ✓ Created: {dir_path}')
            created.append(dir_path)
        
        # Create .gitkeep file
        gitkeep_path = os.path.join(dir_path, '.gitkeep')
        if not os.path.exists(gitkeep_path):
            with open(gitkeep_path, 'w') as f:
                pass
    except Exception as e:
        print(f'[{idx}/9] ✗ Failed: {dir_path}')
        print(f'       Error: {str(e)}')
        errors.append({'dir': dir_path, 'error': str(e)})

print('\n' + '-'*60)
print('VERIFICATION')
print('-'*60 + '\n')

verified = 0
for idx, dir_path in enumerate(dirs, 1):
    try:
        if os.path.exists(dir_path):
            gitkeep_path = os.path.join(dir_path, '.gitkeep')
            if os.path.exists(gitkeep_path):
                print(f'[{idx}/9] ✓ Verified: {dir_path} (.gitkeep exists)')
            else:
                print(f'[{idx}/9] ⚠  Directory exists but .gitkeep missing: {dir_path}')
            verified += 1
        else:
            print(f'[{idx}/9] ✗ Not found: {dir_path}')
    except Exception as e:
        print(f'[{idx}/9] ✗ Error checking: {dir_path}')
        print(f'       Error: {str(e)}')

print('\n' + '='*60)
print('FINAL SUMMARY')
print('='*60 + '\n')
print(f'Total directories:     {len(dirs)}')
print(f'Newly created:         {len(created)}')
print(f'Already existed:       {len(already_existed)}')
print(f'Errors encountered:    {len(errors)}')
print(f'Successfully verified: {verified} / {len(dirs)}')

if created:
    print('\n✓ NEWLY CREATED DIRECTORIES:')
    for d in created:
        print(f'  • {d}')

if already_existed:
    print('\nℹ  DIRECTORIES THAT ALREADY EXISTED:')
    for d in already_existed:
        print(f'  • {d}')

if errors:
    print('\n✗ ERRORS:')
    for item in errors:
        print(f'  • {item["dir"]}')
        print(f'    → {item["error"]}')

print()
if verified == len(dirs):
    print('='*60)
    print('✓ ALL DIRECTORIES CREATED SUCCESSFULLY!')
    print('='*60 + '\n')
    sys.exit(0)
else:
    print('='*60)
    print('✗ SOME DIRECTORIES FAILED')
    print('='*60 + '\n')
    sys.exit(1)
