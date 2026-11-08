path = r"C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the line with <tabIcons[tab]>
target_idx = None
for i, line in enumerate(lines):
    if "<tabIcons[tab]>" in line:
        target_idx = i
        break

if target_idx is None:
    print("Not found")
else:
    # Replace lines target_idx-4 to target_idx+4 with clean block
    new_lines = [
        "            const active = activeTab === tab;\n",
        "            const TabIcon = tabIcons[tab];\n",
        "\n",
        "            return (\n",
        "              <button\n",
        "                key={tab}\n",
        '                type="button"\n',
        "                onClick={() => setActiveTab(tab)}\n",
        '                className={`flex h-12 shrink-0 items-center justify-center border-b-2 px-4 text-sm font-bold transition ${active ? "border-racing-500 text-white" : "border-transparent text-ink-500 hover:text-white hover:bg-white/5"}`}\n',
        "              >\n",
        '                <TabIcon className={`h-4 w-4 mr-2 ${active ? "text-racing-500" : "text-ink-400"}`} />\n',
        "                {tabLabels[tab]}\n",
        "              </button>\n",
        "            );\n",
    ]
    
    lines[target_idx-4:target_idx+5] = new_lines
    
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    
    print(f"Replaced lines around {target_idx+1}")
