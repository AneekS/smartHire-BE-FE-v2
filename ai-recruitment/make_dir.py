import os
p = r'C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\src\app\(dashboard)\preferences'
os.makedirs(p, exist_ok=True)
open(os.path.join(p, '.gitkeep'), 'w').close()
print('Created:', os.path.join(p, '.gitkeep'))
print('Exists:', os.path.exists(os.path.join(p, '.gitkeep')))
