from pathlib import Path
path_more = Path("C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/pages/Home.tsx")

lines_more = [
    '',
    '      {/* How it works */}',
    '      <section className="border-y border-white/8 bg-ink-900">',
    '        <div className="wrap px-4 py-10">',
    '          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">',
    '            {STEPS.map((step) => (',
    '              <div key={step.n} className="relative">',
    '                <span className="text-2xl font-bold text-brand-500">{step.n}</span>',
    '                <h3 className="display mt-2 text-lg font-bold text-white">{step.title}</h3>',
    '                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">{step.text}</p>',
    '              </div>',
    '            ))}',
    '            <div className="lg:col-span-2">',
    '              <div className="rounded-2xl border border-white/10 bg-asphalt-900/60 p-5">',
    '                <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink-400">Seguridad en cada viaje</p>',
    '                <div className="mt-4 grid gap-4 sm:grid-cols-2">',
    '                  {SAFETY_POINTS.map((point) => (',
    '                    <div key={point.title} className="flex gap-3">',
    '                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">',
    '                        <ShieldCheck className="h-5 w-5" />',
    '                      </div>',
    '                      <div>',
    '                        <p className="text-sm font-bold text-white">{point.title}</p>',
    '                        <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{point.text}</p>',
    '                      </div>',
    '                    </div>',
    '                  ))}',
    '                </div>',
    '              </div>',
    '            </div>',
    '          </div>',
    '        </div>',
    '      </section>',
    '',
]

with open(path_more, "a", encoding="utf-8") as f:
    f.write("\\n".join(lines_more))

print("Part 2b written:", len(lines_more), "lines")
