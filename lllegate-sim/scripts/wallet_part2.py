path = r"C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/pages/WalletScreen.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Encontrar la línea que cierra el div del saldo y añadir las pestañas después
# Buscamos la línea: "      </div>\n    </main>"
target_idx = None
for i, line in enumerate(lines):
    if '"><main className="flex flex-1 flex-col px-4 py-8">' in lines[i]:
        target_idx = i + 1  # Insertar después de esta línea
        break

if target_idx:
    # Código de las pestañas a insertar
    tab_code = [
        "\n      {/* Pestañas */}\n",
        "      <div className=\"flex gap-2 mb-6\">\n",
        "        <button\ntype=\"button\"\n          className=\"flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-racing-500 hover:text-white hover:bg-racing-400 transition\"\n          + (activeTab === \"pm\" ? \"border-racing-500 text-white\" : \"border-transparent text-ink-500\")\n        >Pago Móvil</button>\n        <button\ntype=\"button\"\n          className=\"flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-ink-500 hover:text-white hover:bg-white/5 transition\"\n          + (activeTab === \"zelle\" ? \"border-racing-500 text-white\" : \"border-transparent text-ink-500\")\n        >Zelle</button>\n        <button\ntype=\"button\"\n          className=\"flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-ink-500 hover:text-white hover:bg-white/5 transition\"\n          + (activeTab === \"c2p\" ? \"border-racing-500 text-white\" : \"border-transparent text-ink-500\")\n        >Débito C2P</button>\n        </div>\n"
    ]
    
    lines[target_idx:target_idx] = tab_code
    
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    
    print(f"Insertadas pestañas en la línea {target_idx+1}")