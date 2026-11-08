import { MapPin, Search } from "lucide-react";

export function SearchBar() {
  return (
    <div className="wrap px-4">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          type="text"
          placeholder="¿A dónde vas en Aragua / la ARC?"
          className="w-full pl-13 pr-16 py-4 rounded-2xl border border-white/10 bg-asphalt-900/80 text-white placeholder:text-ink-500 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-ink-400 transition hover:bg-white/8 hover:text-white"
          aria-label="Buscar destino"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
