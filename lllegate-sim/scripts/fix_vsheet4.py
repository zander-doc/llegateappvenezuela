path = "C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Add ServiceIcon to imports
content = content.replace('import { Button } from "./ui";', 'import { Button, ServiceIcon } from "./ui";')

# Fix 2: Remove unused rateBs
content = content.replace('  const rateBs = Math.round(service.minFareUSD * 887.3);\n', '')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
