import os
import sys

directories = [
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\types",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\validators",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\services",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\modules\preferences\controllers",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\preferences",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\salary-insights",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\api\role-fit",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\(dashboard)\preferences",
    r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\components\preferences"
]

print("Creating directories...\n")

created = 0
failed = 0
exists = 0

for dir_path in directories:
    try:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
            print(f"✓ {dir_path}")
            created += 1
        else:
            print(f"- {dir_path} (already exists)")
            exists += 1
    except Exception as e:
        print(f"✗ {dir_path} (FAILED: {str(e)})")
        failed += 1

print(f"\nSummary: {created} created, {failed} failed, {exists} already exist")
