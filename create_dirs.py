import os
import sys

directories = [
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\types',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\validators',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\services',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\controllers',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\preferences',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\salary-insights',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\role-fit',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\(dashboard)\preferences',
    r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\components\preferences'
]

print('\n╔════════════════════════════════════════════════════════╗')
print('║  DIRECTORY CREATION SCRIPT FOR AI-RECRUITMENT MODULE  ║')
print('╚════════════════════════════════════════════════════════╝\n')

created = []
already_existed = []
errors = []

for index, directory in enumerate(directories, 1):
    try:
        os.makedirs(directory, exist_ok=True)
        gitkeep_path = os.path.join(directory, '.gitkeep')
        
        # Create .gitkeep file
        if not os.path.exists(gitkeep_path):
            with open(gitkeep_path, 'w') as f:
                pass
        
        if os.path.exists(gitkeep_path):
            print(f'[{index}/9] ✓ Created: {directory}')
            created.append(directory)
        else:
            print(f'[{index}/9] ✗ Failed to create .gitkeep: {directory}')
            errors.append({'dir': directory, 'error': 'Could not create .gitkeep'})
    except Exception as err:
        print(f'[{index}/9] ✗ Failed: {directory}')
        print(f'       Error: {str(err)}')
        errors.append({'dir': directory, 'error': str(err)})

print('\n─────────────────────────────────────────────────────────')
print('VERIFICATION')
print('─────────────────────────────────────────────────────────\n')

verified = 0
for index, directory in enumerate(directories, 1):
    try:
        gitkeep_path = os.path.join(directory, '.gitkeep')
        if os.path.exists(gitkeep_path):
            print(f'[{index}/9] ✓ Verified: {directory} (.gitkeep exists)')
            verified += 1
        else:
            print(f'[{index}/9] ✗ Missing .gitkeep: {directory}')
    except Exception as err:
        print(f'[{index}/9] ✗ Error checking: {directory}')
        print(f'       Error: {str(err)}')

print('\n╔════════════════════════════════════════════════════════╗')
print('║                     FINAL SUMMARY                      ║')
print('╚════════════════════════════════════════════════════════╝\n')

print(f'Total directories:     {len(directories)}')
print(f'Successfully created:  {len(created)}')
print(f'Errors encountered:    {len(errors)}')
print(f'Successfully verified: {verified} / {len(directories)}')

if created:
    print('\n✓ NEWLY CREATED DIRECTORIES:')
    for d in created:
        print(f'  • {d}')

if errors:
    print('\n✗ ERRORS:')
    for item in errors:
        print(f'  • {item["dir"]}')
        print(f'    → {item["error"]}')

if verified == len(directories):
    print('\n╔════════════════════════════════════════════════════════╗')
    print('║        ✓ ALL DIRECTORIES CREATED SUCCESSFULLY!         ║')
    print('╚════════════════════════════════════════════════════════╝\n')
else:
    print('\n╔════════════════════════════════════════════════════════╗')
    print('║              ✗ SOME DIRECTORIES FAILED                ║')
    print('╚════════════════════════════════════════════════════════╝\n')
