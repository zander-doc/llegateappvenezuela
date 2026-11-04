import {
  ArrowRight,
  Check,
  Handshake,
  HeartHandshake,
  Megaphone,
  Newspaper,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  PageHero,
  SectionHead,
} from "../components/ui";
import { useUI } from "../lib/ui";

const allianceTypes = [
  {
    icon: Megaphone,
    title: "Marcas y patrocinios",
    text: "Presencia de marca en la app, la web y las comunicaciones de lanzamiento.",
    fit: "Consumo masivo, telecomunicaciones, bebidas, seguros.",
  },
  {
    icon: Wrench,
    title: "Talleres y comercios",
    text: "Fichas verificadas en el Mercado Motor y beneficios para conductores de la red.",
    fit: "Repuestos, cauchos, lubricantes, talleres, grúas.",
  },
  {
    icon: Newspaper,
    title: "Medios y creadores",
    text: "Contenido sobre movilidad venezolana, lanzamientos y uso real de la app.",
    fit: "Medios digitales, podcasts, creadores de tecnología y ciudad.",
  },
  {
    icon: HeartHandshake,
    title: "Instituciones y ONG",
    text: "Programas de movilidad segura, capacitación y acceso al transporte.",
    fit: "Universidades, fundaciones, gremios y organismos locales.",
  },
];

const offer = [
  "Presencia en la app y en la web para tu marca",
  "Fichas y ofertas para conductores en el Mercado Motor",
  "Contenido conjunto para canales y redes",
  "Acceso anticipado a novedades del lanzamiento",
];

const ask = [
  "Una propuesta con objetivos claros y plazo",
  "Un contacto responsable del proyecto",
  "Materiales de marca listos para publicar",
  "Respeto por las reglas de publicidad y datos",
];

const process = [
  {
    n: "01",
    title: "Conversación inicial",
    text: "Entendemos qué busca tu marca y qué podemos ofrecer sin prometer más de lo que existe.",
  },
  {
    n: "02",
    title: "Propuesta conjunta",
    text: "Definimos alcance, piezas, calendario y cómo mediremos el resultado.",
  },
  {
    n: "03",
    title: "Ejecución y revisión",
    text: "Publicamos, medimos y ajustamos. Sin contratos eternos ni letra pequeña.",
  },
];

export function AliadosPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Alianzas y patrocinios"
        title={
          <>
            Hay algo
            <br />
            que construir.
          </>
        }
        description="Marcas, talleres, comercios, medios e instituciones: si tu audiencia se mueve por Venezuela, podemos hacer algo juntos."
        crumbs={[{ label: "Aliados", to: "/nosotros/aliados" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "lead", intent: "aliado" })}>
              <Handshake className="h-4 w-4" /> Enviar propuesta
            </Button>
            <Button size="lg" variant="secondary" to="/nosotros/aliados#tipos">
              Ver tipos de alianza
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Badge tone="yellow">
              <Users className="h-3 w-3" /> Convocatoria abierta
            </Badge>
            <p className="heading mt-3 text-[19px] font-bold text-white">Buscamos aliados para el lanzamiento</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
              Estamos construyendo la red de lanzamiento. Todavía no hay contratos ni tarifas públicas: cada alianza se
              conversa.
            </p>
            <div className="mt-4 grid gap-2">
              {["Marcas", "Talleres y comercios", "Medios", "Instituciones"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-[12.5px] text-ink-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={() => openModal({ type: "lead", intent: "aliado" })}>
              Contar mi idea
            </Button>
            <p className="mt-2 text-center text-[10px] text-ink-500">Simulación: no se envía información real.</p>
          </div>
        }
      />

      <section id="tipos" className="wrap scroll-mt-32 py-12 sm:py-16">
        <SectionHead
          kicker="Tipos de alianza"
          title="Cuatro caminos, una misma ciudad"
          text="No todas las alianzas son patrocinios. También buscamos servicios que mejoren la experiencia de pasajeros y conductores."
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {allianceTypes.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="heading mt-3.5 text-[18px] font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-300">{item.text}</p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">Encaja con: {item.fit}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-2">
          <div className="card p-5">
            <Eyebrow>Lo que ofrecemos</Eyebrow>
            <div className="mt-4">
              <CheckList items={offer} />
            </div>
            <p className="mt-4 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-[11px] leading-relaxed text-ink-500">
              El alcance y los espacios se definen en la propuesta. No inventamos cifras de audiencia en esta
              demostración.
            </p>
          </div>
          <div className="card p-5">
            <Eyebrow>Lo que pedimos</Eyebrow>
            <div className="mt-4">
              <CheckList items={ask} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-racing-500/20 bg-racing-500/[0.06] px-3 py-2 text-[11.5px] text-ink-300">
              <Store className="h-4 w-4 shrink-0 text-racing-400" />
              Si tienes un negocio automotriz, quizá te convenga primero una ficha en el Mercado Motor.
            </div>
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Cómo avanza</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Simple y sin vueltas</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Una conversación, una propuesta y un piloto. Si funciona, se amplía.
            </p>
            <Button className="mt-4" onClick={() => openModal({ type: "lead", intent: "aliado" })}>
              Empezar la conversación <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3">
            {process.map((step) => (
              <div key={step.n} className="flex gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <span className="mono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-[13px] font-semibold text-brand-300">
                  {step.n}
                </span>
                <div>
                  <p className="heading text-[15.5px] font-bold text-white">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Preguntas frecuentes</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Antes de escribirnos</h2>
          </div>
          <Accordion
            items={[
              {
                q: "¿Llégate ya tiene tarifas de patrocinio?",
                a: "No hay una lista pública todavía. El sitio está en etapa de lanzamiento y cada alianza se define según objetivos, alcance y disponibilidad.",
              },
              {
                q: "¿Puedo entregar muestras o beneficios a conductores?",
                a: "Sí, es una de las alianzas más directas. Se coordina la entrega en ciudades con cobertura y se mide la participación.",
              },
              {
                q: "¿Trabajan con marcas competidoras entre sí?",
                a: "Se evalúa por categoría y por espacio disponible. Puede haber más de un aliado en la misma industria si no compiten por el mismo lugar.",
              },
              {
                q: "¿Cómo protegen los datos de los usuarios?",
                a: "Las alianzas no incluyen entrega de datos personales. Cualquier comunicación se hace desde los canales de Llégate y con consentimiento del usuario.",
              },
            ]}
          />
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-racing-500/25 bg-gradient-to-br from-racing-500/[0.1] to-brand-500/[0.05] p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="heading text-[22px] font-bold text-white">Construyamos algo juntos.</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-300">
                Cuéntanos qué tienes en mente. En producción, revisaríamos la propuesta y te responderíamos por correo.
              </p>
            </div>
            <Button variant="yellow" onClick={() => openModal({ type: "lead", intent: "aliado" })}>
              <Handshake className="h-4 w-4" /> Enviar propuesta
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
