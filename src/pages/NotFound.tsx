import { Link } from "react-router-dom";
import {
  ArrowRight,
  Car,
  Compass,
  Home,
  MapPin,
  MessageCircle,
  Search,
  Smartphone,
  Wrench,
} from "lucide-react";
import { Badge, Button, Eyebrow, PageHero } from "../components/ui";
import { useUI } from "../lib/ui";

const suggestions = [
  {
    icon: Car,
    title: "Servicios",
    text: "Moto, carro, minivan, autobús, delivery y carga.",
    to: "/servicios",
  },
  {
    icon: MapPin,
    title: "Cobertura",
    text: "Consulta si tu ciudad está en la lista de lanzamiento.",
    to: "/cobertura",
  },
  {
    icon: Smartphone,
    title: "Probar la app",
    text: "Una demo interactiva, sin descargas ni registros.",
    to: "/app",
  },
  {
    icon: Wrench,
    title: "Mercado Motor",
    text: "Talleres, repuestos y grúas de ejemplo.",
    to: "/mercado",
  },
  {
    icon: Compass,
    title: "Conductores",
    text: "Requisitos, planes y calculadora de ganancias.",
    to: "/conductores",
  },
  {
    icon: MessageCircle,
    title: "Ayuda",
    text: "Preguntas frecuentes y contacto con el equipo.",
    to: "/ayuda",
  },
];

export function NotFoundPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Error 404"
        title={
          <>
            Esta ruta
            <br />
            se perdió.
          </>
        }
        description="La página que buscas no existe o cambió de lugar. Te dejamos los caminos más útiles para seguir."
        actions={
          <>
            <Button size="lg" to="/">
              <Home className="h-4 w-4" /> Volver al inicio
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              <MessageCircle className="h-4 w-4" /> Reportar un enlace roto
            </Button>
          </>
        }
        aside={
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <span className="display block text-[104px] leading-none text-white/[0.08]" aria-hidden="true">
              404
            </span>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="neutral">
                <Search className="h-3 w-3" /> Ruta no encontrada
              </Badge>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
              En este prototipo, los enlaces válidos están en el menú superior y en el pie de página.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <Eyebrow>Quizá buscabas</Eyebrow>
        <h2 className="heading mt-3 text-[26px] font-bold text-white sm:text-[32px]">Puntos de partida</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="card card-hover p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="heading mt-3 text-[15.5px] font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{item.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-400">
                  Ir a {item.title.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
