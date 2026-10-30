const ITEMS = [
  "Mototaxi, taxi pana y delivery",
  "Tarifa transparente",
  "Conductor verificado",
  "Pago móvil directo",
  "0% comisión conductor pro",
  "Hecho en Venezuela 🇻🇪",
  "24/7 en todas las ciudades",
  "Minivan, autobús y carga: próximas fases",
  "Mercado motor & repuestos",
  "Llega en minutos",
];

const TEXT_TONES = ["text-white", "text-racing-400", "text-brand-400"];
const DOT_TONES = ["bg-racing-500", "bg-brand-500", "bg-flag-500"];

export function Ticker() {
  const items = [...ITEMS, ...ITEMS];

  return (
    <div
      aria-hidden="true"
      className="relative select-none overflow-hidden border-b border-white/8 bg-ink-950"
    >
      <div className="stripes-h h-[2px] w-full opacity-80" />
      <div className="animate-marquee flex min-w-max whitespace-nowrap py-3.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={`mx-4 inline-flex items-center gap-x-3 font-display text-lg uppercase tracking-wider md:text-[22px] ${TEXT_TONES[i % 3]}`}
          >
            {item}
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT_TONES[i % 3]}`} />
          </span>
        ))}
      </div>
      <div className="stripes-h h-[2px] w-full opacity-80" />
    </div>
  );
}
