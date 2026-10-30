import { Link, useParams } from "react-router-dom";
import { ArrowRight, FileText, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, Button, PageHero } from "../components/ui";
import { useUI } from "../lib/ui";
import { SITE } from "../data/site";

type DocSection = { title: string; paragraphs: string[]; bullets?: string[] };
type Doc = {
  slug: string;
  label: string;
  kicker: string;
  title: string;
  description: string;
  updated: string;
  sections: DocSection[];
};

const DOCS: Doc[] = [
  {
    slug: "terminos",
    label: "Términos",
    kicker: "Legal",
    title: "Términos y condiciones",
    description:
      "Las reglas de uso de la plataforma Llégate: qué ofrece el servicio, cómo funciona la cuenta, cómo se cobran los viajes y qué puedes esperar de nosotros.",
    updated: "Versión de demostración · octubre de 2026",
    sections: [
      {
        title: "1. Qué es Llégate",
        paragraphs: [
          "Llégate es una plataforma tecnológica que conecta pasajeros con conductores y vehículos, y a usuarios con negocios del sector automotor a través del Mercado Motor. Llégate no presta directamente el servicio de transporte: facilita la solicitud, la asignación y el registro del viaje.",
          "La aplicación móvil se encuentra en etapa de lanzamiento. Este sitio es un prototipo de rediseño y no procesa viajes, pagos ni registros reales.",
        ],
      },
      {
        title: "2. Uso de la web y de la app",
        paragraphs: [
          "La web es informativa y de demostración. Los estimadores, calculadoras y formularios muestran cómo funcionaría el servicio, pero no generan solicitudes reales ni reservas.",
          "Al usar la app, en su versión de producción, te comprometes a entregar información veraz, usar tu propia cuenta y no solicitar viajes para fines distintos al traslado de personas o bienes permitidos.",
        ],
      },
      {
        title: "3. Cuenta y verificación",
        paragraphs: [
          "Para viajar o conducir se requiere una cuenta verificada. La verificación de conductores incluye identidad, licencia vigente, documentos del vehículo y antecedentes.",
          "Llégate puede suspender una cuenta si detecta documentación falsa, suplantación de identidad o uso indebido de la plataforma.",
        ],
      },
      {
        title: "4. Tarifas y pagos",
        paragraphs: [
          "El precio del viaje se muestra antes de confirmar, en dólares y en su equivalente en bolívares a la tasa BCV aplicada. La tasa utilizada queda registrada en el comprobante del viaje.",
          "El pago puede realizarse en efectivo, en bolívares o dólares, o con saldo Llégate, según las opciones disponibles en cada ciudad.",
        ],
        bullets: [
          "El monto confirmado no cambia por condiciones de tráfico.",
          "Si se añaden paradas o cambia el destino, la app muestra el nuevo monto antes de aceptarlo.",
          "Los recargos nocturnos o por espera se muestran desglosados antes de confirmar.",
        ],
      },
      {
        title: "5. Conductores y planes",
        paragraphs: [
          "Los conductores pueden elegir entre pagar una comisión por viaje o contratar un plan Pro con comisión cero. Las condiciones, precios y beneficios se muestran en la sección de planes antes de activar cualquier opción.",
          "Los planes son personales, no transferibles, y su activación se realiza desde la app en la versión de producción.",
        ],
      },
      {
        title: "6. Mercado Motor",
        paragraphs: [
          "El Mercado Motor es un directorio de negocios del sector automotor. La verificación de una ficha significa que revisamos datos de contacto, dirección y actividad declarada; no es una garantía de resultados ni de precios.",
          "Las transacciones entre usuarios y negocios ocurren fuera de la plataforma. Confirma condiciones, precios y garantías antes de pagar.",
        ],
      },
      {
        title: "7. Cancelaciones y reclamos",
        paragraphs: [
          "Puedes cancelar antes de que el conductor llegue sin costo. Cancelaciones posteriores pueden generar un cargo por tiempo de espera, que se informa en la app.",
          "Los reclamos sobre un viaje se gestionan desde la app o escribiendo al equipo, con el identificador del viaje como referencia.",
        ],
      },
      {
        title: "8. Propiedad intelectual y cambios",
        paragraphs: [
          "La marca, el diseño, los textos y el software de Llégate pertenecen a sus titulares. No se permite su uso comercial sin autorización.",
          "Estos términos pueden actualizarse. La versión vigente se publica en esta página y, cuando el cambio sea relevante, se notifica dentro de la app.",
        ],
      },
      {
        title: "9. Ley aplicable",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier controversia se someterá a los tribunales competentes del país.",
        ],
      },
    ],
  },
  {
    slug: "privacidad",
    label: "Privacidad",
    kicker: "Legal",
    title: "Política de privacidad",
    description:
      "Qué datos usaría Llégate, para qué, con quién se comparten y cómo puedes ejercer tus derechos. En este prototipo no se envía información a ningún servidor.",
    updated: "Versión de demostración · octubre de 2026",
    sections: [
      {
        title: "1. Qué datos usaríamos",
        paragraphs: [
          "Para operar el servicio, Llégate usaría datos de identificación (nombre, cédula, teléfono y correo), datos del vehículo para conductores, y datos del viaje (origen, destino, ruta, hora y monto).",
          "La ubicación se usaría únicamente durante el viaje activo y para funciones de seguridad, como compartir la ruta o activar una emergencia.",
        ],
      },
      {
        title: "2. Para qué los usaríamos",
        paragraphs: [
          "Para conectar pasajeros y conductores, calcular tarifas, procesar pagos, verificar identidades, prevenir fraudes, atender reclamos y cumplir obligaciones legales.",
          "Con tu consentimiento, también para enviarte novedades del lanzamiento o información de tu interés. Puedes retirar ese consentimiento en cualquier momento.",
        ],
      },
      {
        title: "3. Con quién se comparten",
        paragraphs: [
          "Los datos necesarios para el viaje se comparten entre el pasajero y el conductor asignado. También pueden compartirse con proveedores que prestan servicios de pago, verificación o infraestructura, bajo acuerdos de confidencialidad.",
          "Llégate no vende datos personales. No entregamos tu contacto a negocios del Mercado Motor sin tu autorización.",
        ],
      },
      {
        title: "4. Seguridad y conservación",
        paragraphs: [
          "Aplicaríamos medidas técnicas y organizativas para proteger la información: cifrado en tránsito, control de acceso por roles y registros de auditoría.",
          "Los datos se conservan mientras la cuenta esté activa y durante los plazos exigidos por la ley. Luego se eliminan o anonimizan.",
        ],
      },
      {
        title: "5. Tus derechos",
        paragraphs: [
          "Puedes solicitar acceso, rectificación, actualización o eliminación de tus datos, así como oponerte a determinados tratamientos. Escríbenos a hola@llegate.app para ejercerlos.",
        ],
        bullets: [
          "Escribe desde el correo asociado a tu cuenta.",
          "Indica el derecho que quieres ejercer y los datos afectados.",
          "Responderíamos en un plazo razonable, verificando tu identidad.",
        ],
      },
      {
        title: "6. Menores de edad",
        paragraphs: [
          "El servicio está dirigido a personas mayores de edad. No solicitamos datos de menores de forma consciente. Si detectamos una cuenta de un menor, la suspendemos y eliminamos la información asociada.",
        ],
      },
      {
        title: "7. Sobre este prototipo",
        paragraphs: [
          "Este sitio de demostración no envía datos a un servidor. Los formularios guardan la información solo en el almacenamiento del navegador (localStorage) para simular el flujo. Puedes borrarla limpiando los datos del sitio.",
          "No uses este prototipo para ingresar información personal real.",
        ],
      },
      {
        title: "8. Contacto",
        paragraphs: [
          `Para consultas de privacidad, escribe a ${SITE.email}. En producción, esta política indicaría además la dirección del responsable del tratamiento y el canal formal de reclamos.`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    label: "Cookies",
    kicker: "Legal",
    title: "Política de cookies",
    description:
      "Cómo se usan cookies y almacenamiento local en la web de Llégate, para qué sirven y cómo puedes controlarlas desde tu navegador.",
    updated: "Versión de demostración · octubre de 2026",
    sections: [
      {
        title: "1. Qué son las cookies",
        paragraphs: [
          "Las cookies son pequeños archivos que un sitio guarda en tu dispositivo. Permiten recordar preferencias, mantener una sesión o medir el uso de las páginas.",
          "También existe el almacenamiento local (localStorage), que funciona de forma similar pero no se envía automáticamente al servidor.",
        ],
      },
      {
        title: "2. Qué usa este prototipo",
        paragraphs: [
          "Este sitio de demostración no usa cookies publicitarias ni herramientas de analítica de terceros. Usa almacenamiento local del navegador para guardar los formularios que completas en la simulación y la preferencia de ocultar la barra de instalación.",
        ],
        bullets: [
          "llegate_sim_waitlist: contacto y ciudad del formulario de aviso.",
          "llegate_sim_driver, llegate_sim_empresa, llegate_sim_aliado, llegate_sim_contacto: formularios de la demo.",
          "llegate_sim_install_bar: recuerda que cerraste la barra de instalación.",
        ],
      },
      {
        title: "3. Cookies previstas en producción",
        paragraphs: [
          "En la versión final, la web podría usar cookies necesarias para seguridad y sesión; cookies de preferencias para recordar idioma, ciudad o formato de moneda; y cookies de medición para entender qué páginas se usan, siempre con información agregada.",
          "Las cookies no necesarias se activarían solo con tu consentimiento, mediante un panel de preferencias.",
        ],
      },
      {
        title: "4. Cómo controlarlas",
        paragraphs: [
          "Puedes borrar o bloquear cookies y almacenamiento local desde la configuración de tu navegador. Si bloqueas las cookies necesarias, algunas funciones de la web podrían no funcionar.",
        ],
        bullets: [
          "Chrome: Configuración › Privacidad y seguridad › Cookies.",
          "Safari: Preferencias › Privacidad › Gestionar datos de sitios web.",
          "Firefox: Ajustes › Privacidad y seguridad › Cookies y datos del sitio.",
        ],
      },
      {
        title: "5. Cambios en esta política",
        paragraphs: [
          "Si en producción se incorporan nuevas cookies o proveedores, actualizaremos esta página y, cuando corresponda, solicitaremos tu consentimiento nuevamente.",
        ],
      },
    ],
  },
];

export function LegalPage() {
  const { doc } = useParams();
  const { openModal } = useUI();
  const current = DOCS.find((d) => d.slug === doc);

  if (!current) {
    return (
      <>
        <PageHero
          kicker="Legal"
          title="Documento no encontrado"
          description="El enlace que abriste no corresponde a un documento disponible en este prototipo."
          crumbs={[{ label: "Legal", to: "/legal/terminos" }]}
          compact
        />
        <section className="wrap py-12">
          <div className="flex flex-wrap gap-2">
            {DOCS.map((d) => (
              <Button key={d.slug} variant="secondary" to={`/legal/${d.slug}`}>
                {d.label} <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <div className="mt-6">
            <Button variant="ghost" to="/">
              Volver al inicio
            </Button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        kicker={current.kicker}
        title={current.title}
        description={current.description}
        crumbs={[{ label: "Legal", to: `/legal/${current.slug}` }]}
        compact
        aside={
          <div className="card p-5">
            <Badge tone="danger">
              <TriangleAlert className="h-3 w-3" /> Documento de ejemplo
            </Badge>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
              Este texto es una muestra de redacción para el rediseño. No constituye un contrato vigente ni
              asesoría legal.
            </p>
            <p className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-500">
              <FileText className="h-3.5 w-3.5" /> {current.updated}
            </p>
          </div>
        }
      />

      <section className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Documentos</p>
          <nav className="mt-3 grid gap-1">
            {DOCS.map((d) => {
              const active = d.slug === current.slug;
              return (
                <Link
                  key={d.slug}
                  to={`/legal/${d.slug}`}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] transition ${
                    active
                      ? "bg-brand-500/12 font-semibold text-brand-300"
                      : "text-ink-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {d.label}
                  {active && <span className="stripe-mark" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>
          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
            <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
              Ningún formulario de este prototipo envía datos a un servidor.
            </p>
            <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              <Mail className="h-3.5 w-3.5" /> Consultar
            </Button>
          </div>
        </aside>

        <article className="prose-llegate max-w-2xl">
          <div className="rounded-xl border border-racing-500/20 bg-racing-500/[0.06] px-4 py-3 text-[12.5px] leading-relaxed text-ink-300">
            <span className="font-semibold text-racing-400">Simulación:</span> este documento forma parte de un
            prototipo de rediseño. No reemplaza los términos legales de la app en producción.
          </div>

          {current.sections.map((section) => (
            <div key={section.title} className="mt-8">
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
            <p className="text-[12px] text-ink-500">¿Tienes una duda sobre este documento?</p>
            <Button size="sm" variant="secondary" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              <Mail className="h-3.5 w-3.5" /> Escribir al equipo
            </Button>
          </div>
        </article>
      </section>
    </>
  );
}
