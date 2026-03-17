import os

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

print("Creating directories with .gitkeep files...\n")

for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    
    # Create directory
    try:
        os.makedirs(full_path, exist_ok=True)
        print(f"✓ Created: {dir_path}")
    except Exception as e:
        print(f"✗ Error creating {dir_path}: {e}")
        continue
    
    # Create .gitkeep file
    gitkeep_path = os.path.join(full_path, '.gitkeep')
    try:
        with open(gitkeep_path, 'w') as f:
            pass
    except Exception as e:
        print(f"  ✗ Error creating .gitkeep: {e}")

print("\n" + "="*70)
print("VERIFICATION")
print("="*70 + "\n")

all_exist = True
for dir_path in directories:
    full_path = os.path.join(base_dir, dir_path)
    gitkeep_path = os.path.join(full_path, '.gitkeep')
    
    dir_exists = os.path.isdir(full_path)
    gitkeep_exists = os.path.isfile(gitkeep_path)
    
    if dir_exists and gitkeep_exists:
        print(f"✓ EXISTS: {dir_path}")
        print(f"  └─ .gitkeep: Present")
    else:
        print(f"✗ MISSING: {dir_path}")
        if not dir_exists:
            print(f"  └─ Directory: Not found")
        if not gitkeep_exists:
            print(f"  └─ .gitkeep: Not found")
        all_exist = False

print("\n" + "="*70)
if all_exist:
    print("✓ SUCCESS: All 9 directories created successfully!")
else:
    print("✗ FAILURE: Some directories failed to create")
print("="*70)
