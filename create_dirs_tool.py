#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Define base path
base = Path("C:/Users/ANURON/smartHire-BE-FE-v2")

# List of directories to create
dirs = [
    "ai-recruitment/src/modules/preferences/types",
    "ai-recruitment/src/modules/preferences/validators",
    "ai-recruitment/src/modules/preferences/services",
    "ai-recruitment/src/modules/preferences/controllers",
    "ai-recruitment/src/app/api/preferences",
    "ai-recruitment/src/app/api/salary-insights",
    "ai-recruitment/src/app/api/role-fit",
    "ai-recruitment/src/app/(dashboard)/preferences",
    "ai-recruitment/src/components/preferences"
]

print("\n" + "="*60)
print("  DIRECTORY CREATION WITH .GITKEEP FILES")
print("="*60 + "\n")

created = []
verified = []
errors = []

# Create directories and .gitkeep files
for i, dir_path in enumerate(dirs, 1):
    full_path = base / dir_path
    gitkeep_path = full_path / ".gitkeep"
    
    try:
        # Create directory
        full_path.mkdir(parents=True, exist_ok=True)
        
        # Create .gitkeep file
        gitkeep_path.touch()
        
        print(f"[{i}/9] ✓ Created: {dir_path}")
        created.append(dir_path)
    except Exception as e:
        print(f"[{i}/9] ✗ Error: {dir_path}")
        print(f"       {str(e)}")
        errors.append((dir_path, str(e)))

# Verify directories
print("\n" + "-"*60)
print("VERIFICATION")
print("-"*60 + "\n")

for i, dir_path in enumerate(dirs, 1):
    full_path = base / dir_path
    gitkeep_path = full_path / ".gitkeep"
    
    try:
        if full_path.exists() and gitkeep_path.exists():
            print(f"[{i}/9] ✓ Verified: {dir_path} (.gitkeep exists)")
            verified.append(dir_path)
        elif full_path.exists():
            print(f"[{i}/9] ⚠ Directory exists but .gitkeep missing: {dir_path}")
        else:
            print(f"[{i}/9] ✗ Directory not found: {dir_path}")
    except Exception as e:
        print(f"[{i}/9] ✗ Error checking: {dir_path}")
        print(f"       {str(e)}")

# Summary
print("\n" + "="*60)
print("  FINAL SUMMARY")
print("="*60 + "\n")
print(f"Total directories:     {len(dirs)}")
print(f"Successfully created:  {len(created)}")
print(f"Successfully verified: {len(verified)}/{len(dirs)}")
print(f"Errors:                {len(errors)}")

if created:
    print("\n✓ CREATED DIRECTORIES:")
    for d in created:
        print(f"  • {d}")

if errors:
    print("\n✗ ERRORS:")
    for d, e in errors:
        print(f"  • {d}")
        print(f"    → {e}")

if len(verified) == len(dirs):
    print("\n✓ SUCCESS: All directories created and verified!")
    sys.exit(0)
else:
    print(f"\n✗ FAILURE: Only {len(verified)}/{len(dirs)} directories verified")
    sys.exit(1)
