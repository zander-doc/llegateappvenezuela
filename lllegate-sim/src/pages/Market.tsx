import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { Badge, Button, Eyebrow, PageHero, SectionHead } from "../components/ui";
import { Reveal } from "../components/Motion";
import { FieldError, SelectField, TextAreaField, TextField } from "../components/modals/shared";
import {
  CATEGORIAS_NEGOCIO,
  CATEGORIA_LABEL,
  getNegocio,
  listNegocios,
  negocioErrorMessage,
  realAuthEnabled,
  type CategoriaNegocio,
  type Negocio,
  type VitrinaNegocios,
} from "../lib/api";
import { proponerNegocio, type DestinoNegocio } from "../lib/mercado";
import { isContact } from "../lib/validation";

// Mercado Motor es la vitrina de negocios del mundo motor. Lo que se ve aquí
// son fichas reales: una nace `pendiente`, operaciones la verifica y solo
// publicada llega al catálogo. No hay negocios de ejemplo.

const CATEGORIA_ICONO: Record<CategoriaNegocio, typeof Wrench> = {
  repuestos: Store,
  talleres: Wrench,
  cauchos: ShieldCheck,
  gruas: ShieldCheck,
  lubricantes: Store,
  accesorios: Store,
};

function Ficha({ negocio }: { negocio: Negocio }) {
  const Icono = CATEGORIA_ICONO[negocio.categoria] ?? Store;

  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Icono className="h-5 w-5" />
        </span>
        {negocio.verificado && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
            <BadgeCheck className="h-3 w-3" /> Verificado
          </span>
        )}
      </div>

      <h3 className="mt-3 font-heading text-[17px] tracking-tight text-white">{negocio.nombre}</h3>
      <p className="mt-1 text-[11.5px] uppercase tracking-wider text-ink-500">
        {CATEGORIA_LABEL[negocio.categoria]} · {negocio.ciudad}
        {negocio.zona ? ` · ${negocio.zona}` : ""}
      </p>

      {negocio.oferta && <p className="mt-3 text-[13px] leading-relaxed text-ink-200">{negocio.oferta}</p>}

      <div className="mt-4 grid gap-1.5 text-[12px] text-ink-400">
        {negocio.horario && (
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" /> {negocio.horario}
          </p>
        )}
        {negocio.direccion && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {negocio.direccion}
          </p>
        )}
        {negocio.telefonoPublico && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" /> {negocio.telefonoPublico}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 pt-1">
        <Button size="sm" to={`/mercado/negocio/${negocio.slug}`}>
          Ver ficha <ArrowRight className="h-4 w-4" />
        </Button>
        {negocio.sitio && (
          <Button size="sm" variant="secondary" href={negocio.sitio} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> Sitio
          </Button>
        )}
      </div>
    </li>
  );
}

function EstadoVitrina({ cargando, texto }: { cargando: boolean; texto: string }) {
  return (
    <div className="card flex items-center justify-center gap-2 p-10 text-[13px] text-ink-400">
      {cargando ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> {texto}
        </>
      ) : (
        texto
      )}
    </div>
  );
}

export function MercadoPage() {
  const [categoria, setCategoria] = useState<CategoriaNegocio | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [terminos, setTerminos] = useState("");
  const [vitrina, setVitrina] = useState<VitrinaNegocios | null>(null);
  const [cargando, setCargando] = useState(realAuthEnabled);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!realAuthEnabled) return;
    setCargando(true);
    setError("");
    try {
      setVitrina(await listNegocios({ categoria: categoria || undefined, q: terminos || undefined }));
    } catch (fallo) {
      setError(negocioErrorMessage(fallo));
    } finally {
      setCargando(false);
    }
  }, [categoria, terminos]);

  useEffect(() => {
    // Lectura externa al cambiar el filtro: no es estado derivado de otra prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const total = vitrina?.total ?? 0;

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
        description={
          realAuthEnabled
            ? "Repuestos, talleres, cauchos, grúas, lubricantes y accesorios cerca de ti. Cada ficha la revisamos antes de publicarla: aquí solo hay negocios reales, no de ejemplo."
            : "Repuestos, talleres, cauchos, grúas, lubricantes y accesorios cerca de ti. Todavía no hay ninguna ficha publicada: no llenamos el directorio con negocios de ejemplo."
        }
        crumbs={[{ label: "Mercado", to: "/mercado" }]}
        actions={
          <>
            <Button size="lg" to="/mercado/publicar">
              <Store className="h-4 w-4" /> Publicar mi negocio
            </Button>
            <Button size="lg" variant="secondary" to="/ayuda">
              Preguntas frecuentes <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Badge tone={total > 0 ? "success" : "yellow"}>
                {realAuthEnabled ? (total > 0 ? "Vitrina abierta" : "En preparación") : "Sin catálogo"}
              </Badge>
              <Badge tone="neutral">{CATEGORIAS_NEGOCIO.length} categorías</Badge>
            </div>
            <dl className="mt-4 grid gap-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">Negocios publicados</dt>
                <dd className="mono text-white">{cargando ? "…" : total}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">Verificación</dt>
                <dd className="text-white">Ficha por ficha, antes de publicar</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-400">¿Aparezco ya?</dt>
                <dd className="text-white">Envía tu ficha: queda en revisión</dd>
              </div>
            </dl>
          </div>
        }
      />

      <section className="section" aria-label="Vitrina del Mercado Motor">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Directorio"
            title={total > 0 ? `${total} ${total === 1 ? "negocio publicado" : "negocios publicados"}.` : "Todavía no hay fichas publicadas."}
            text={
              total > 0
                ? "Filtra por categoría o busca por lo que necesitas. La ficha te dice dónde queda, su horario y su beneficio."
                : "El formulario ya recibe fichas: cada una la revisamos y, si el negocio existe y el contacto es suyo, queda publicada."
            }
          />

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setTerminos(busqueda.trim());
            }}
            className="mt-6 flex flex-wrap items-end gap-2"
          >
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-asphalt-950/60 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-500" />
              <span className="sr-only">Buscar en la vitrina</span>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                maxLength={80}
                placeholder="Cambio de aceite, cauchos Radial, taller…"
                className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-ink-600"
              />
            </label>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          <div role="tablist" aria-label="Categoría" className="mt-4 flex flex-wrap gap-1.5">
            {[
              { id: "" as const, label: "Todas" },
              ...CATEGORIAS_NEGOCIO.map((clave) => ({ id: clave, label: CATEGORIA_LABEL[clave] })),
            ].map((opcion) => (
              <button
                key={opcion.id || "todas"}
                type="button"
                role="tab"
                aria-selected={categoria === opcion.id}
                onClick={() => setCategoria(opcion.id)}
                className={`min-h-[34px] rounded-lg px-3 text-[11.5px] font-semibold transition ${
                  categoria === opcion.id ? "bg-brand-500 text-asphalt-950" : "border border-white/10 text-ink-300 hover:text-white"
                }`}
              >
                {opcion.label}
                {opcion.id && vitrina?.categorias[opcion.id] ? ` (${vitrina.categorias[opcion.id]})` : ""}
              </button>
            ))}
          </div>

          {error && (
            <FieldError>{error}</FieldError>
          )}

          <div className="mt-6">
            {!realAuthEnabled ? (
              <div className="card flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                  <Store className="h-5 w-5" />
                </span>
                <p className="text-[13px] font-semibold text-white">Sin catálogo en la demostración</p>
                <p className="max-w-md text-[11.5px] leading-relaxed text-ink-400">
                  Esta versión del sitio no está conectada a la API, así que no hay fichas publicadas que mostrar. Los
                  negocios reales aparecen cuando el sitio lee la vitrina de Llégate.
                </p>
              </div>
            ) : cargando ? (
              <EstadoVitrina cargando texto="Abriendo la vitrina…" />
            ) : (vitrina?.negocios.length ?? 0) === 0 ? (
              <div className="card flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                  <Search className="h-5 w-5" />
                </span>
                <p className="text-[13px] font-semibold text-white">
                  {terminos || categoria ? "Ninguna ficha coincide con la búsqueda." : "Aún no hay negocios publicados."}
                </p>
                <p className="max-w-md text-[11.5px] leading-relaxed text-ink-400">
                  {terminos || categoria
                    ? "Prueba con otra palabra o quita el filtro de categoría."
                    : "Envía la tuya: se revisa y publica en cuanto confirmamos el negocio."}
                </p>
                {!terminos && !categoria && (
                  <Button to="/mercado/publicar" size="sm">
                    Publicar mi negocio <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vitrina?.negocios.map((negocio) => (
                  <Ficha key={negocio.id} negocio={negocio} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="section border-t border-white/8 bg-asphalt-950/60" aria-label="Cómo funciona la vitrina">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            kicker="Cómo funciona"
            title="Tres pasos, y el segundo somos nosotros."
            text="Nada sale publicado sin revisión: confirmamos que el negocio existe y que quien envía la ficha es su dueño."
          />
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Store,
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
                icon: BadgeCheck,
                title: "Apareces en la vitrina",
                detail:
                  "Tu ficha queda visible con el sello Verificado y puedes pedir que la actualicemos cuando cambie el horario o la promoción.",
              },
            ].map((paso) => (
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
    </>
  );
}

export function NegocioDetallePage() {
  const { slug = "" } = useParams();
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [cargando, setCargando] = useState(realAuthEnabled);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!realAuthEnabled) return;
    let activo = true;
    getNegocio(slug)
      .then((datos) => {
        if (activo) setNegocio(datos);
      })
      .catch((fallo) => {
        if (activo) setError(negocioErrorMessage(fallo));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [slug]);

  const detalle = [
    { icon: MapPin, texto: negocio?.direccion ?? null },
    { icon: Clock, texto: negocio?.horario ?? null },
    { icon: Phone, texto: negocio?.telefonoPublico ?? null },
  ].filter((item) => item.texto);

  return (
    <>
      <PageHero
        compact
        kicker={negocio ? CATEGORIA_LABEL[negocio.categoria] : "Mercado Motor"}
        title={<>{negocio?.nombre ?? "Ficha del negocio"}</>}
        description={
          negocio?.oferta ??
          "La vitrina del Mercado Motor solo muestra negocios revisados por el equipo de Llégate."
        }
        crumbs={[
          { label: "Mercado", to: "/mercado" },
          { label: negocio?.nombre ?? "Ficha", to: `/mercado/negocio/${slug}` },
        ]}
        actions={
          negocio?.sitio ? (
            <Button size="lg" href={negocio.sitio} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Ver sitio del negocio
            </Button>
          ) : (
            <Button size="lg" to="/mercado">
              Volver a la vitrina <ArrowRight className="h-4 w-4" />
            </Button>
          )
        }
        aside={
          negocio ? (
            <div className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                {negocio.verificado && (
                  <Badge tone="success">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verificado
                  </Badge>
                )}
                <Badge tone="neutral">{negocio.ciudad}</Badge>
                {negocio.zona && <Badge tone="neutral">{negocio.zona}</Badge>}
              </div>
              <dl className="mt-4 grid gap-2.5 text-[12.5px]">
                {detalle.map((item) => (
                  <div key={item.texto} className="flex items-start gap-2">
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                    <dd className="text-ink-200">{item.texto}</dd>
                  </div>
                ))}
              </dl>
              {negocio.publicadaEn && (
                <p className="mt-4 text-[11px] text-ink-500">
                  Publicada el {new Date(negocio.publicadaEn).toLocaleDateString("es-VE")}
                </p>
              )}
            </div>
          ) : null
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              {!realAuthEnabled ? (
                <div className="card p-6 text-center">
                  <Eyebrow>Sin backend configurado</Eyebrow>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-300">
                    En la demostración no hay fichas publicadas que abrir. La vitrina real lee los negocios verificados
                    por el equipo de Llégate.
                  </p>
                  <div className="mt-5">
                    <Button to="/mercado">Volver a la vitrina</Button>
                  </div>
                </div>
              ) : cargando ? (
                <EstadoVitrina cargando texto="Abriendo la ficha…" />
              ) : !negocio ? (
                <div className="card p-6 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                    <Store className="h-6 w-6" />
                  </span>
                  <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Esta ficha no está publicada</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                    {error || "Puede que esté en revisión o que hayamos archivado la ficha."}
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button to="/mercado">Ver la vitrina <ArrowRight className="h-4 w-4" /></Button>
                    <Button variant="secondary" to="/mercado/publicar">
                      Publicar mi negocio
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {negocio.descripcion && (
                    <div className="card p-6">
                      <h2 className="font-heading text-[19px] tracking-tight text-white">Sobre {negocio.nombre}</h2>
                      <p className="mt-3 text-[14px] leading-relaxed text-ink-200">{negocio.descripcion}</p>
                    </div>
                  )}
                  <div className="card mt-4 flex items-start gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-ink-300">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <p className="text-[11.5px] leading-relaxed text-ink-400">
                      El contacto privado del dueño y las notas internas no se publican. Si ves un dato equivocado,
                      escríbenos desde{" "}
                      <Link to="/ayuda" className="font-semibold text-brand-400 hover:text-brand-300">
                        ayuda
                      </Link>
                      .
                    </p>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

interface FormNegocio {
  nombre: string;
  categoria: string;
  ciudad: string;
  zona: string;
  direccion: string;
  horario: string;
  oferta: string;
  descripcion: string;
  sitio: string;
  contacto: string;
  telefonoPublico: string;
}

const VACIO: FormNegocio = {
  nombre: "",
  categoria: "",
  ciudad: "",
  zona: "",
  direccion: "",
  horario: "",
  oferta: "",
  descripcion: "",
  sitio: "",
  contacto: "",
  telefonoPublico: "",
};

function validar(values: FormNegocio) {
  const errores: Partial<Record<keyof FormNegocio, string>> = {};
  if (values.nombre.trim().length < 3) errores.nombre = "Escribe el nombre del negocio.";
  if (!values.categoria) errores.categoria = "Elige la categoría que mejor te describe.";
  if (values.ciudad.trim().length < 2) errores.ciudad = "Indica la ciudad del negocio.";
  if (!isContact(values.contacto)) {
    errores.contacto = "Necesitamos un correo o un teléfono con código de país para confirmarte la propiedad.";
  }
  if (values.sitio.trim() && !/^https?:\/\/[^\s]+\.[^\s]{2,}$/.test(values.sitio.trim())) {
    errores.sitio = "Escribe el enlace completo, con https:// al inicio.";
  }
  return errores;
}

export function PublicarPage() {
  const [values, setValues] = useState<FormNegocio>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof FormNegocio, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const [destino, setDestino] = useState<DestinoNegocio | null>(null);
  const [error, setError] = useState("");

  function set<Campo extends keyof FormNegocio>(campo: Campo, valor: string) {
    setValues((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setError("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (enviando) return;

    const hallados = validar(values);
    setErrores(hallados);
    if (Object.keys(hallados).length > 0) return;

    setEnviando(true);
    setError("");
    try {
      const creada = await proponerNegocio({
        nombre: values.nombre,
        categoria: values.categoria as CategoriaNegocio,
        ciudad: values.ciudad,
        zona: values.zona,
        direccion: values.direccion,
        horario: values.horario,
        oferta: values.oferta,
        descripcion: values.descripcion,
        sitio: values.sitio,
        contacto: values.contacto,
        telefonoPublico: values.telefonoPublico,
      });
      setDestino(creada);
    } catch (fallo) {
      setError(negocioErrorMessage(fallo));
    } finally {
      setEnviando(false);
    }
  }

  if (destino) {
    return (
      <>
        <PageHero
          compact
          kicker="Mercado Motor"
          title={<>Recibimos tu ficha.</>}
          description={
            destino === "real"
              ? "Quedó en revisión. El equipo de operaciones te escribe por el contacto que diste; apenas la publiquemos aparece en la vitrina con el sello Verificado."
              : "En la demostración la ficha se guardó en este navegador. No aparece en la vitrina pública: esa necesita la API de Llégate."
          }
          crumbs={[{ label: "Mercado", to: "/mercado" }, { label: "Publicar", to: "/mercado/publicar" }]}
          actions={
            <>
              <Button size="lg" to="/mercado">
                Ver la vitrina <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  setDestino(null);
                  setValues(VACIO);
                }}
              >
                Publicar otra ficha
              </Button>
            </>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHero
        compact
        kicker="Mercado Motor"
        title={
          <>
            Publica tu negocio
            <br />
            en la vitrina.
          </>
        }
        description="La ficha queda en revisión antes de aparecer: confirmamos que el negocio existe y que el contacto es tuyo. Por eso pedimos un canal privado además del teléfono visible."
        crumbs={[{ label: "Mercado", to: "/mercado" }, { label: "Publicar", to: "/mercado/publicar" }]}
        aside={
          <div className="card p-5">
            <Eyebrow>Qué pasa después</Eyebrow>
            <ol className="mt-3 grid gap-2.5 text-[12.5px] leading-relaxed text-ink-300">
              <li>1. Envías la ficha y queda pendiente.</li>
              <li>2. Operaciones revisa el negocio y te contacta.</li>
              <li>3. Si todo cuadra, publicamos con sello Verificado.</li>
            </ol>
            {!realAuthEnabled && (
              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
                Sin API conectada la ficha se guarda en este navegador para la demostración; no aparece en la vitrina
                pública.
              </p>
            )}
          </div>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            <form onSubmit={onSubmit} noValidate className="card mx-auto max-w-3xl grid gap-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Nombre del negocio"
                  required
                  value={values.nombre}
                  onChange={(event) => set("nombre", event.target.value)}
                  maxLength={120}
                  error={errores.nombre}
                  placeholder="Taller El Guaire"
                  autoComplete="organization"
                />
                <SelectField
                  label="Categoría"
                  required
                  value={values.categoria}
                  onChange={(event) => set("categoria", event.target.value)}
                  error={errores.categoria}
                >
                  <option value="">Elige una categoría</option>
                  {CATEGORIAS_NEGOCIO.map((clave) => (
                    <option key={clave} value={clave}>
                      {CATEGORIA_LABEL[clave]}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Ciudad"
                  required
                  value={values.ciudad}
                  onChange={(event) => set("ciudad", event.target.value)}
                  maxLength={80}
                  error={errores.ciudad}
                  placeholder="Caracas"
                />
                <TextField
                  label="Zona o parroquia"
                  value={values.zona}
                  onChange={(event) => set("zona", event.target.value)}
                  maxLength={120}
                  placeholder="Valles del Tuy"
                />
              </div>

              <TextField
                label="Dirección"
                value={values.direccion}
                onChange={(event) => set("direccion", event.target.value)}
                maxLength={240}
                placeholder="Av. Principal, local 3, cerca de la parada"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Horario de atención"
                  value={values.horario}
                  onChange={(event) => set("horario", event.target.value)}
                  maxLength={240}
                  placeholder="Lun a sáb 8am-6pm"
                />
                <TextField
                  label="Teléfono visible en la ficha"
                  value={values.telefonoPublico}
                  onChange={(event) => set("telefonoPublico", event.target.value)}
                  maxLength={40}
                  hint="Es el único número que ve el público."
                  placeholder="+58 414 123 4567"
                  inputMode="tel"
                />
              </div>

              <TextField
                label="Contacto privado para verificarte"
                required
                value={values.contacto}
                onChange={(event) => set("contacto", event.target.value)}
                maxLength={200}
                error={errores.contacto}
                hint="Correo o teléfono con código de país. No se publica: lo usamos para confirmar que el negocio es tuyo."
                placeholder="dueno@eltaller.com o +584141234567"
              />

              <TextField
                label="Oferta o beneficio"
                value={values.oferta}
                onChange={(event) => set("oferta", event.target.value)}
                maxLength={500}
                hint="Qué gana quien llegue desde Llégate: descuento, revisión gratis, prioridad."
                placeholder="Afinación de motor con repuestos originales"
              />

              <TextAreaField
                label="Descripción del negocio"
                value={values.descripcion}
                onChange={(event) => set("descripcion", event.target.value)}
                maxLength={2000}
                placeholder="Taller familiar con doce años en la zona, dos elevadores y servicio de grúa propio."
              />

              <TextField
                label="Sitio o red social"
                value={values.sitio}
                onChange={(event) => set("sitio", event.target.value)}
                maxLength={300}
                error={errores.sitio}
                placeholder="https://instagram.com/el-taller"
                inputMode="url"
              />

              {error && <FieldError>{error}</FieldError>}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" disabled={enviando}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {enviando ? "Enviando ficha…" : "Enviar ficha para revisión"}
                </Button>
                <Link to="/mercado" className="text-[12.5px] font-semibold text-ink-300 hover:text-white">
                  Ver la vitrina primero
                </Link>
              </div>

              <p className="text-[11.5px] leading-relaxed text-ink-500">
                Solo puedes tener un par de fichas en revisión a la vez: así el equipo de operaciones puede responder
                a todas.
              </p>
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}
