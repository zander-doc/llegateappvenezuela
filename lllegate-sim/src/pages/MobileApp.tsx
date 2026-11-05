import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  History,
  MessageSquareText,
  Smartphone,
  Store,
  Wallet,
} from "lucide-react";
import { Badge, Button, Eyebrow, PageHero, SectionHead } from "../components/ui";
import { Logo } from "../components/Logo";

// La app de Android corre contra el mismo backend que esta web: misma cuenta,
// mismo saldo y mismos viajes. Esta pantalla describe lo que funciona hoy, con
// nombres de funciones que existen, y dice con claridad lo que todavía no.

const FUNCIONA = [
  {
    icon: MessageSquareText,
    title: "Ingreso con código por WhatsApp",
    detail:
      "Pides el código con tu teléfono y te llega por WhatsApp desde la cuenta de Meta de Llégate. Sin contraseña, y la sesión sirve igual en la web y en la app.",
  },
  {
    icon: Smartphone,
    title: "Viajes reales, no simulados",
    detail:
      "La app envía la solicitud al backend, muestra el estado del viaje, permite cancelarla y la retoma si la cierras a mitad. El historial sale de tus viajes guardados.",
  },
  {
    icon: Wallet,
    title: "Billetera con saldo de verdad",
    detail:
      "El saldo, lo reservado en un viaje y las recargas son datos de la base, no números pintados. Se ven idénticos en la web y en la app.",
  },
  {
    icon: History,
    title: "Cuenta compartida con la web",
    detail:
      "Un mismo perfil con rol de pasajero, piloto o administrador. El panel de operaciones de la web es el que revisa a los pilotos de esa misma cuenta.",
  },
];

const PENDIENTE = [
  {
    title: "Aún no hay pilotos dados de alta",
    detail:
      "La solicitud de viaje se registra y se puede cancelar, pero nadie la va a aceptar hasta que los primeros pilotos pasen la verificación de documentos.",
  },
  {
    title: "Las recargas automáticas no están activas",
    detail:
      "Pago Móvil se revisa a mano y Binance Pay espera su webhook. Por eso los botones de recarga salen deshabilitados en lugar de fingir un cobro.",
  },
  {
    title: "No estamos en tiendas de aplicaciones",
    detail:
      "Durante el piloto la app se instala directo. Cuando esté publicada, aquí aparecerán los botones de Google Play y App Store.",
  },
];

export function MobileAppPage() {
  return (
    <>
      <PageHero
        kicker="La app ya está aquí"
        title={
          <>
            La misma cuenta,
            <br />
            en tu teléfono.
          </>
        }
        description="Llégate App corre contra el mismo backend de esta web: el mismo ingreso por código, el mismo saldo y los mismos viajes. No es una maqueta, es la aplicación de Android en fase de piloto."
        crumbs={[{ label: "App", to: "/app" }]}
        actions={
          <>
            <Button size="lg" to="/ingresar">
              <BadgeCheck className="h-4 w-4" /> Entrar con mi teléfono
            </Button>
            <Button size="lg" variant="secondary" to="/tarifas">
              Ver las tarifas <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Logo forma="redondo" link={false} className="mx-auto h-28 w-28 rounded-2xl" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="success">Cuenta real</Badge>
              <Badge tone="yellow">Piloto cerrado</Badge>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-300">
              Se prueba con números venezolanos y con la base de datos oficial del proyecto. Para entrar
              solo hace falta tu teléfono.
            </p>
          </div>
        }
      />

      <section className="section" aria-label="Qué funciona hoy">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Qué funciona hoy"
            title="Cuatro cosas que ya puedes hacer."
            text="Todo lo de esta lista está en la aplicación y responde por la API, no son promesas de lanzamiento."
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FUNCIONA.map((item) => (
              <li key={item.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-heading text-[17px] tracking-tight text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section border-t border-white/8 bg-asphalt-950/60" aria-label="Lo que falta">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Lo que falta"
            title="Prefiero que lo sepas antes de instalarla."
            text="El piloto es cerrado mientras montamos la red de pilotos y las pasarelas de pago."
          />
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {PENDIENTE.map((item) => (
              <li key={item.title} className="card p-5">
                <Eyebrow>Pendiente</Eyebrow>
                <h3 className="mt-2 font-heading text-[16px] tracking-tight text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-label="Cómo se instala">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="card p-6">
            <SectionHead
              kicker="Cómo se instala"
              title="Directo, sin tiendas todavía."
              text="Durante el piloto la aplicación se entrega y se instala de forma directa, sin pasar por Google Play ni la App Store."
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button to="/ingresar">
                <Download className="h-4 w-4" /> Entrar con mi teléfono
              </Button>
              <Button variant="secondary" disabled>
                <Store className="h-4 w-4" /> Google Play · próximamente
              </Button>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-heading text-[18px] tracking-tight text-white">¿Ya tienes cuenta?</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
              No hace falta registrarse de nuevo. El mismo teléfono que usaste en la web abre la sesión en
              la app, con el mismo saldo y el mismo historial de viajes.
            </p>
            <Link
              to="/registro"
              className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-400 hover:text-brand-300"
            >
              Crear una cuenta nueva <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default MobileAppPage;
