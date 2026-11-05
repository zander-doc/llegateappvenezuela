import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ClipboardList, Clock, Mail, MapPin, ShieldCheck, Store } from "lucide-react";
import { Badge, Button, Eyebrow, PageHero, SectionHead } from "../components/ui";
import { VENDOR_CATEGORIES } from "../data/vendors";

// Mercado Motor es la vitrina de negocios del mundo motor. Todavía no está
// abierta: no hay catálogo que mostrar, así que la página describe el plan.

const PASOS = [
  {
    icon: ClipboardList,
    title: "Publicas tu ficha",
    detail:
      "Nombre, categoría, ciudad y zona, horario y la oferta que quieres dar a los conductores y pasajeros de Llégate.",
  },
  {
    icon: ShieldCheck,
    title: "La verificamos antes de publicar",
    detail:
      "Confirmamos que el negocio existe, que el contacto es tuyo y que la oferta es real. Nada sale publicado sin esa revisión.",
  },
  {
    icon: Store,
    title: "Apareces en la vitrina",
    detail:
      "Tu ficha queda visible con tus datos y tu beneficio para la comunidad, y puedes actualizarla cuando cambie el horario o la promoción.",
  },
];

const PEDIREMOS = [
  {
    icon: Store,
    texto: "Nombre del negocio y categoría: repuestos, taller, cauchos, grúa, lubricantes o accesorios.",
  },
  { icon: MapPin, texto: "Ciudad y zona, para aparecer cerca de quien puede llegar." },
  { icon: Clock, texto: "Horario de atención real, no el de cortesía." },
  {
    icon: BadgeCheck,
    texto: "Un contacto directo tuyo y el beneficio que quieres dar a quienes usan la app.",
  },
];

export function MercadoPage() {
  return (
    <>
      <PageHero
        kicker="Mercado Motor"
        title={
          <>
            La vitrina se abre
            <br />
            con negocios de verdad.
          </>
        }
        description="Repuestos, talleres, cauchos, grúas, lubricantes y accesorios cerca de ti. Todavía no hay ninguna ficha publicada: no llenamos el directorio con negocios de ejemplo."
        crumbs={[{ label: "Mercado", to: "/mercado" }]}
        actions={
          <>
            <Button size="lg" to="/mercado/publicar">
              <Mail className="h-4 w-4" /> Quiero que me avisen
            </Button>
            <Button size="lg" variant="secondary" to="/ayuda">
              Preguntas frecuentes <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Badge tone="yellow">En preparación</Badge>
              <Badge tone="neutral">Sin catálogo</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">Negocios publicados</dt>
                <dd className="mono text-white">0</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">Categorías previstas</dt>
                <dd className="mono text-white">{VENDOR_CATEGORIES.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">Verificación</dt>
                <dd className="text-white">Ficha por ficha, antes de publicar</dd>
              </div>
            </dl>
          </div>
        }
      />

      <section className="section" aria-label="Cómo funciona la vitrina">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Cómo funciona"
            title="Tres pasos, y el segundo es el que falta."
            text="El proceso está definido; lo que todavía faltan son los negocios. Cuando tengamos los primeros firmados, la vitrina se abre."
          />
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {PASOS.map((paso) => (
              <li key={paso.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <paso.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-heading text-[17px] tracking-tight text-white">{paso.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{paso.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section border-t border-white/8 bg-asphalt-950/60" aria-label="Categorías previstas">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Categorías previstas"
            title="Estas son las secciones que vamos a abrir."
            text="Ninguna tiene negocios todavía. Si conoces un taller o una repuestera que quiera entrar, escríbenos."
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VENDOR_CATEGORIES.map((categoria) => (
              <li key={categoria} className="card flex items-center justify-between gap-3 p-4">
                <span className="font-heading text-[16px] tracking-tight text-white">{categoria}</span>
                <span className="text-[11.5px] uppercase tracking-wider text-ink-400">0 negocios</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

export function PublicarPage() {
  return (
    <>
      <PageHero
        kicker="Mercado Motor"
        title={
          <>
            Aún no recibimos
            <br />
            fichas nuevas.
          </>
        }
        description="No tiene sentido un formulario que no va a ninguna parte. Cuando la vitrina esté lista, aquí se podrá publicar el negocio; mientras tanto, el correo sí llega."
        crumbs={[{ label: "Mercado", to: "/mercado" }, { label: "Publicar", to: "/mercado/publicar" }]}
        actions={
          <>
            <Button size="lg" href="mailto:hola@llegate.app?subject=Quiero%20una%20ficha%20en%20Mercado%20Motor">
              <Mail className="h-4 w-4" /> Escribir a hola@llegate.app
            </Button>
            <Button size="lg" variant="secondary" to="/mercado">
              Ver el plan de la vitrina <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Eyebrow>Esta página no guarda datos</Eyebrow>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
              No hay formulario porque no hay vitrina que llenar todavía. El correo es el único canal real
              de esta pantalla: lo leemos y respondemos.
            </p>
          </div>
        }
      />

      <section className="section" aria-label="Lo que vamos a pedir">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Ve preparándolo"
            title="Esto es lo que vamos a pedir cuando abramos."
            text="Si ya lo tienes a mano, tu ficha sale el mismo día que abramos la recepción."
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {PEDIREMOS.map((item) => (
              <li key={item.texto} className="card flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] leading-relaxed text-ink-300">{item.texto}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[12.5px] text-ink-400">
            ¿Tienes dudas antes de escribir?{" "}
            <Link to="/ayuda" className="font-semibold text-brand-400 hover:text-brand-300">
              Ver los canales de contacto <ArrowRight className="inline h-3 w-3" />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
