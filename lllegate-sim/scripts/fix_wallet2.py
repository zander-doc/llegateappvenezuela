path = "C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/pages/WalletScreen.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the last line and add closing brace
last_line_idx = len(lines) - 1
lines[last_line_idx] = lines[last_line_idx].rstrip() + "}\n}\n"

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Added closing brace")