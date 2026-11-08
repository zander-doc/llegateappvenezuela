path = r"C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix line 69 (index 68)
new_line = '                <TabIcon className="h-4 w-4 mr-2" />\n'
lines[68] = new_line

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed line 69")
