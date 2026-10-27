import { useMemo, useState } from "react";
import { ArrowRight, BellRing, CheckCircle2, MapPin, Search, X } from "lucide-react";
import { Badge, Button } from "./ui";
import { useUI } from "../lib/ui";
import { searchVenezuelaLocations, VENEZUELA_LOCATIONS } from "../data/locations";
import { COVERAGE_LABEL, HUBS, coverageForState, type CoverageStatus } from "../data/site";

interface Found {
  city: string;
  state: string;
  display: string;
  status: CoverageStatus;
}

const statusTone: Record<CoverageStatus, "success" | "yellow" | "neutral"> = {
  launch: "success",
  pilot: "yellow",
  waitlist: "neutral",
};

export function CoverageSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const { openModal } = useUI();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Found | null>(null);

  const results = useMemo<Found[]>(() => {
    if (!query.trim()) return [];
    return searchVenezuelaLocations(query)
      .slice(0, 6)
      .map((r) => {
        const state = VENEZUELA_LOCATIONS.find((s) => s.name === r.state);
        return { ...r, status: state ? coverageForState(state.id) : "waitlist" };
      });
  }, [query]);

  const popular = HUBS.slice(0, 8);

  function pick(item: Found) {
    setSelected(item);
    setQuery(item.city);
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-brand-400" />
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">Busca tu zona</p>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
        Escribe tu ciudad o municipio para ver si está en la lista de lanzamiento.
      </p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
          className="field pl-10 pr-10"
          placeholder="Ej. Maracaibo, Valencia, Mérida..."
          aria-label="Buscar ciudad o municipio"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelected(null);
            }}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.trim() && !selected && (
        <div className="mt-2 max-h-[230px] overflow-y-auto rounded-xl border border-white/8 bg-ink-950/60">
          {results.length === 0 ? (
            <div className="p-4 text-[12.5px] text-ink-400">
              No encontramos esa zona. Puedes solicitar cobertura y te avisamos.
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => openModal({ type: "coverage", city: query })}
              >
                Solicitar cobertura
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-white/8">
              {results.map((r) => (
                <li key={`${r.city}-${r.state}`}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-white">{r.city}</span>
                      <span className="block truncate text-[11px] text-ink-400">{r.state}</span>
                    </span>
                    <Badge tone={statusTone[r.status]}>{COVERAGE_LABEL[r.status].replace("Cobertura de ", "")}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="mt-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">Ciudades principales</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {popular.map((h) => (
              <button
                key={h.stateId}
                type="button"
                onClick={() =>
                  pick({
                    city: h.city,
                    state: h.stateName,
                    display: `${h.city}, ${h.stateName}`,
                    status: h.status,
                  })
                }
                className="chip py-1.5 text-[11.5px]"
              >
                {h.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="animate-fade-in mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-white">{selected.city}</p>
              <p className="text-[11.5px] text-ink-400">{selected.state}</p>
            </div>
            <Badge tone={statusTone[selected.status]}>
              {selected.status === "launch" && <CheckCircle2 className="h-3 w-3" />}
              {COVERAGE_LABEL[selected.status]}
            </Badge>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
            {selected.status === "launch"
              ? "Esta zona está en el plan de lanzamiento. Déjanos tu contacto y te avisamos cuando abramos."
              : selected.status === "pilot"
                ? "Es una ciudad piloto: abrimos por etapas. Déjanos tu contacto para entrar en la primera tanda."
                : "Todavía no tenemos cobertura aquí. Solicítala y te avisamos cuando lleguemos."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {selected.status === "waitlist" ? (
              <Button
                size="sm"
                onClick={() => openModal({ type: "coverage", city: selected.city })}
                className="sm:col-span-2"
              >
                <BellRing className="h-3.5 w-3.5" /> Solicitar cobertura
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={() => openModal({ type: "download" })}>
                  <BellRing className="h-3.5 w-3.5" /> Avísame
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openModal({ type: "coverage", city: selected.city })}
                >
                  Pedir en mi zona <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-500">
        Cobertura propuesta para el lanzamiento. No es una operación activa.
      </p>
    </div>
  );
}
