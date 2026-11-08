path = "C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/pages/WalletScreen.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Añadir el return después de la constante balanceBs
content = content.replace(
    'const balanceBs = balanceUSD * DEMO_BCV_RATE;',
    'const balanceBs = balanceUSD * DEMO_BCV_RATE;\n\n  return (\n    <main className="flex flex-1 flex-col px-4 py-8">'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Added return statement")