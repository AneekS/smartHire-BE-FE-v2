import os

base = r"C:\Users\ANURON\smartHire-BE-FE-v2"
dirs = [
    r"ai-recruitment\src\modules\preferences\types",
    r"ai-recruitment\src\modules\preferences\validators",
    r"ai-recruitment\src\modules\preferences\services",
    r"ai-recruitment\src\modules\preferences\controllers",
    r"ai-recruitment\src\app\api\preferences",
    r"ai-recruitment\src\app\api\salary-insights",
    r"ai-recruitment\src\app\api\role-fit",
    r"ai-recruitment\src\app\(dashboard)\preferences",
    r"ai-recruitment\src\components\preferences",
]

for d in dirs:
    full = os.path.join(base, d)
    os.makedirs(full, exist_ok=True)
    gk = os.path.join(full, ".gitkeep")
    with open(gk, "w") as f:
        pass
    print(f"Created: {full}")

print("Done.")
