path = "C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/components/VehicleSelectionSheet.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Replace lines 54-73 (0-indexed 53-72)
start = 53
end = 73

new_lines = [
    '        {Object.keys(tabLabels).map((tab) => {\n',
    '          const active = activeTab === tab;\n',
    '          const TabIcon = tabIcons[tab as Tab];\n',
    '          return (\n',
    '            <button\n',
    '              key={tab}\n',
    '              type="button"\n',
    '              onClick={() => setActiveTab(tab as Tab)}\n',
    '              className={`flex h-12 shrink-0 items-center justify-center border-b-2 px-4 text-sm font-bold transition ${active ? "border-racing-500 text-white" : "border-transparent text-ink-500 hover:text-white hover:bg-white/5"}`}\n',
    '            >\n',
    '              <TabIcon className="h-4 w-4 mr-2" />\n',
    '              {tabLabels[tab as Tab]}\n',
    '            </button>\n',
    '          );\n',
    '        })}\n',
]

lines[start:end] = new_lines

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Done")
