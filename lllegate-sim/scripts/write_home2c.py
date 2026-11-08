from pathlib import Path
path_more = Path("C:/Users/alexg/Documents/Qoder/2026-10-27/a2bce96f/lllegate-sim/src/pages/Home.tsx")

lines_more = [
    '',
    '      {/* FAQ */}',
    '      <section className="wrap px-4 py-14 sm:py-20">',
    '        <SectionHead',
    '          kicker="Preguntas frecuentes"',
    '          title={',
    '            <>',
    '              Todo lo que necesitas saber.',
    '              <br className="hidden sm:block" /> Sin complicación.',
    '            </>',
    '          }',
    '          text="Si tu duda no está aquí, el centro de ayuda está organizado por tema: viajes, pagos, conductores, app y mercado."',
    '          action={',
    '            <Button variant="secondary" to="/ayuda" className="mt-5">',
    '              Centro de ayuda <ArrowRight className="h-4 w-4" />',
    '            </Button>',
    '          }',
    '        />',
    '        <div className="mt-8 max-w-3xl">',
    '          <Accordion items={homeFaqItems} />',
    '        </div>',
    '      </section>',
    '',
]

with open(path_more, "a", encoding="utf-8") as f:
    f.write("\\n".join(lines_more))

print("Part 2c written:", len(lines_more), "lines")
