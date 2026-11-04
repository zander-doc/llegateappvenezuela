import { useMemo } from "react";
import { ArrowRight, BellRing, CheckCircle2, MapPin, Users } from "lucide-react";
import { Badge, Button, Eyebrow, PageHero, SectionHead } from "../components/ui";
import { CoverageSearch } from "../components/CoverageSearch";
import { useUI } from "../lib/ui";
import { VENEZUELA_LOCATIONS } from "../data/locations";
import { COVERAGE_LABEL, coverageForState, type CoverageStatus } from "../data/site";

function shortState(name: string) {
  return name.replace(/\s*\(.*\)$/, "");
}

const tone: Record<CoverageStatus, "success" | "yellow" | "neutral"> = {
  launch: "success",
  pilot: "yellow",
  waitlist: "neutral",
};

export function CoberturaPage() {
  const { openModal } = useUI();

  const groups = useMemo(() => {
    const all = VENEZUELA_LOCATIONS.map((s) => ({ ...s, status: coverageForState(s.id) }));
    return [
      {
        status: "launch" as CoverageStatus,
        title: "Estados de lanzamiento",
        description: "La primera etapa: viajes urbanos y servicios principales desde el día uno.",
        states: all.filter((s) => s.status === "launch"),
      },
      {
        status: "pilot" as CoverageStatus,
        title: "Ciudades piloto",
        description: "Abrimos por etapas, con menos unidades y horarios progresivos.",
        states: all.filter((s) => s.status === "pilot"),
      },
      {
        status: "waitlist" as CoverageStatus,
        title: "Lista de espera",
        description: "Aún sin fecha. Puedes solicitar cobertura para tu zona.",
        states: all.filter((s) => s.status === "waitlist"),
      },
    ];
  }, []);

  const launchCount = groups[0].states.length;
  const pilotCount = groups[1].states.length;

  return (
    <>
      <PageHero
        kicker="Cobertura"
        title={
          <>
            ¿Dónde está
            <br />
            Llégate?
          </>
        }
        description="El lanzamiento arranca en ocho estados y avanza por etapas. Busca tu ciudad para ver si está en la primera tanda o solicitar cobertura."
        crumbs={[{ label: "Cobertura", to: "/cobertura" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "coverage" })}>
              <BellRing className="h-4 w-4" /> Solicitar cobertura
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "download" })}>
              Avísame del lanzamiento
            </Button>
          </>
        }
        aside={
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: launchCount, label: "lanzamiento", tone: "text-emerald-400" },
              { value: pilotCount, label: "piloto", tone: "text-racing-400" },
              { value: VENEZUELA_LOCATIONS.length, label: "estados", tone: "text-white" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className={`mono text-[26px] font-semibold leading-none ${s.tone}`}>{s.value}</p>
                <p className="mt-1 text-[10.5px] leading-tight text-ink-400">{s.label}</p>
              </div>
            ))}
            <p className="col-span-3 text-[10.5px] leading-relaxed text-ink-500">
              Cobertura propuesta para este prototipo. No hay operación activa.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Eyebrow>Busca tu zona</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Dinos dónde te mueves.
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">
              Si tu ciudad está en lanzamiento o piloto, te avisamos cuando abramos. Si no aparece, puedes pedir
              cobertura y guardamos tu solicitud.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <Badge key={g.status} tone={tone[g.status]}>
                  {COVERAGE_LABEL[g.status]}
                </Badge>
              ))}
            </div>
          </div>
          <CoverageSearch />
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Mapa de estados"
            title="Dónde estamos y dónde vamos"
            text="Abre un estado para ver las ciudades incluidas en esta propuesta."
          />
          <div className="mt-8 grid gap-8">
            {groups.map((group) => (
              <div key={group.status}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={tone[group.status]}>{COVERAGE_LABEL[group.status]}</Badge>
                  <span className="text-[12px] text-ink-500">{group.states.length} estados</span>
                </div>
                <p className="mb-4 max-w-2xl text-[13.5px] leading-relaxed text-ink-400">{group.description}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.states.map((state) => (
                    <details key={state.id} className="group card overflow-hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <MapPin className={`h-4 w-4 shrink-0 ${group.status === "launch" ? "text-emerald-400" : group.status === "pilot" ? "text-racing-400" : "text-ink-500"}`} />
                          <span className="truncate text-[13.5px] font-semibold text-white">{shortState(state.name)}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-500">
                          <Users className="h-3.5 w-3.5" /> {state.cities.length}
                        </span>
                      </summary>
                      <div className="border-t border-white/8 px-4 pb-4 pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {state.cities.slice(0, 8).map((city) => (
                            <span key={city} className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[10.5px] text-ink-300">
                              {city}
                            </span>
                          ))}
                          {state.cities.length > 8 && (
                            <span className="px-1 py-1 text-[10.5px] text-ink-500">+{state.cities.length - 8}</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={group.status === "waitlist" ? "secondary" : "primary"}
                          className="mt-3 w-full"
                          onClick={() =>
                            group.status === "waitlist"
                              ? openModal({ type: "coverage", city: state.cities[0] })
                              : openModal({ type: "download" })
                          }
                        >
                          {group.status === "waitlist" ? (
                            <>
                              <BellRing className="h-3.5 w-3.5" /> Solicitar cobertura
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Avísame
                            </>
                          )}
                        </Button>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "1. Demanda",
              text: "Medimos solicitudes de pasajeros y conductores en cada zona antes de abrir.",
            },
            {
              title: "2. Conductores verificados",
              text: "Necesitamos una base mínima de unidades verificadas para responder en horarios clave.",
            },
            {
              title: "3. Apertura por etapas",
              text: "Abrimos zonas, medimos tiempos de respuesta y ampliamos la cobertura.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <p className="mono text-[13px] font-semibold text-brand-400">{item.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-300">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center">
          <div>
            <p className="heading text-[18px] font-bold text-white">¿No ves tu ciudad?</p>
            <p className="mt-1 text-[13px] text-ink-400">Solicita cobertura y te avisamos cuando abramos en tu zona.</p>
          </div>
          <Button onClick={() => openModal({ type: "coverage" })}>
            Solicitar cobertura <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
