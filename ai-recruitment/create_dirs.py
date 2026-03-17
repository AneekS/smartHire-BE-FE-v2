#!/usr/bin/env python3
import os
import sys
from pathlib import Path

base = Path(r"C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src")

dirs = [
    "modules/preferences/types",
    "modules/preferences/validators",
    "modules/preferences/services",
    "modules/preferences/controllers",
    "app/api/preferences",
    "app/api/salary-insights",
    "app/api/role-fit",
    "app/(dashboard)/preferences",
    "components/preferences",
]

all_ok = True

for dir_path in dirs:
    full_path = base / dir_path
    full_path.mkdir(parents=True, exist_ok=True)
    
    gitkeep = full_path / ".gitkeep"
    gitkeep.touch()
    
    dir_ok = full_path.exists()
    file_ok = gitkeep.exists()
    status = "OK" if (dir_ok and file_ok) else "FAIL"
    print(f"[{status}] {full_path}")
    
    if not (dir_ok and file_ok):
        all_ok = False

print(f"\n{'All directories and .gitkeep files created successfully!' if all_ok else 'Some items failed.'}")
sys.exit(0 if all_ok else 1)
