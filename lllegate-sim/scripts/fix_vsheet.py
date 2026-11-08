path = r"C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Add TabIcon variable before return inside map
old1 = "            const active = activeTab === tab;\n\n            return ("
new1 = "            const active = activeTab === tab;\n            const TabIcon = tabIcons[tab];\n\n            return ("

# Fix 2: Replace <tabIcons[tab]> with <TabIcon>
old2 = "<tabIcons[tab] className=\u0060h-4 w-4 mr-2 \u0060${active ? \\u0060text-racing-500\u0060 : \\u0060text-ink-400\u0060}\\u0060 />"
new2 = "<TabIcon className=\u0060h-4 w-4 mr-2 \u0060${active ? \\u0060text-racing-500\u0060 : \\u0060text-ink-400\u0060}\\u0060 />"

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fix applied")
