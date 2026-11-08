path = "C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('import { Link } from "react-router-dom";\n', '')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
