import { useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  LogOut,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { Badge, Button } from "./ui";
import { RealWallet } from "./RealWallet";
import { formatUSD } from "../lib/format";
import { VENEZUELA_LOCATIONS } from "../data/locations";
import { isPersonName, isVenezuelanPhone, toVenezuelanE164 } from "../lib/validation";
import {
  ApiError,
  clearSession,
  getCuenta,
  loadSession,
  logout,
  maskPhone,
  requestOtp,
  updatePerfil,
  verifyOtp,
  type Cuenta,
  type Rol,
} from "../lib/api";

type Paso = "datos" | "codigo" | "cuenta";

const ROL_LABEL: Record<Rol, string> = {
  cliente: "Pasajero",
  conductor: "Piloto",
  admin: "Administrador",
};

const RESEND_SECONDS = 30;

const ESTADOS = VENEZUELA_LOCATIONS.map((state) => ({
  name: state.name.replace(/\s*\(.*\)$/, ""),
  cities: state.cities,
}));

function ErrorBox({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
    >
      {children}
    </p>
  );
}

function RealNote() {
  return (
    <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-300">
      <span className="font-semibold text-emerald-300">Cuenta real:</span> tu teléfono se envía a la API de Llégate
      solo para verificar tu identidad. No usamos contraseña ni guardamos tu cédula en este navegador.
    </p>
  );
}

export function RealAuth({ mode }: { mode: "login" | "register" }) {
  const [paso, setPaso] = useState<Paso>("datos");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState(ESTADOS[0].name);
  const [ciudad, setCiudad] = useState(ESTADOS[0].cities[0]);
  const [consent, setConsent] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);
  const [revisando, setRevisando] = useState(() => loadSession() !== null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [editando, setEditando] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formEstado, setFormEstado] = useState(ESTADOS[0].name);
  const [formCiudad, setFormCiudad] = useState(ESTADOS[0].cities[0]);
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [avisoPerfil, setAvisoPerfil] = useState("");

  const telefonoId = useId();
  const nombreId = useId();
  const estadoId = useId();
  const ciudadId = useId();
  const consentId = useId();
  const codigoId = useId();
  const editarNombreId = useId();
  const editarEstadoId = useId();
  const editarCiudadId = useId();

  const e164 = toVenezuelanE164(telefono);

  useEffect(() => {
    if (!loadSession()) return;
    let activo = true;

    getCuenta()
      .then((actual) => {
        if (!activo) return;
        setCuenta(actual);
        setPaso("cuenta");
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => {
        if (activo) setRevisando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (resendIn === 0) return;
    const id = window.setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  async function enviarCodigo(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!isVenezuelanPhone(telefono) || !e164) {
      setError("Escribe un número venezolano, por ejemplo 0414 1234567.");
      return;
    }
    if (mode === "register" && !isPersonName(nombre)) {
      setError("Escribe tu nombre y apellido como aparecen en tu cédula.");
      return;
    }
    if (mode === "register" && (!estado || !ciudad)) {
      setError("Elige tu estado y tu ciudad.");
      return;
    }
    if (mode === "register" && !consent) {
      setError("Acepta los términos para crear tu cuenta.");
      return;
    }

    setCargando(true);
    try {
      const mensaje = await requestOtp({
        telefono: e164,
        nombre: mode === "register" ? nombre.trim() : undefined,
        estado: mode === "register" ? estado : undefined,
        ciudad: mode === "register" ? ciudad : undefined,
        rol: "cliente",
      });
      setAviso(mensaje);
      setPaso("codigo");
      setCodigo("");
      setResendIn(RESEND_SECONDS);
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No pudimos enviar el código. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCodigo(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(codigo.trim())) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    if (!e164) {
      setPaso("datos");
      return;
    }

    setCargando(true);
    try {
      const actual = await verifyOtp({ telefono: e164, token: codigo.trim() });
      setCuenta(actual);
      setPaso("cuenta");
      setCodigo("");
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No pudimos validar el código. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    if (!e164 || resendIn > 0) return;
    setError("");
    setCargando(true);
    try {
      const mensaje = await requestOtp({
        telefono: e164,
        nombre: mode === "register" ? nombre.trim() : undefined,
        estado: mode === "register" ? estado : undefined,
        ciudad: mode === "register" ? ciudad : undefined,
        rol: "cliente",
      });
      setAviso(mensaje);
      setResendIn(RESEND_SECONDS);
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No pudimos reenviar el código.");
    } finally {
      setCargando(false);
    }
  }

  async function cerrarSesion() {
    setCargando(true);
    await logout();
    setCuenta(null);
    setPaso("datos");
    setCodigo("");
    setTelefono("");
    setNombre("");
    setConsent(false);
    setAviso("");
    setError("");
    setEditando(false);
    setAvisoPerfil("");
    setErrorPerfil("");
    setCargando(false);
  }

  async function actualizarCuenta() {
    try {
      setCuenta(await getCuenta());
    } catch {
      // Si la sesión venció, el propio cliente de la API la limpia.
    }
  }

  function abrirEdicion() {
    if (!cuenta) return;
    const guardado = ESTADOS.find((item) => item.name === cuenta.usuario.estado) ?? ESTADOS[0];
    const ciudadGuardada = cuenta.usuario.ciudad;
    setFormNombre(cuenta.usuario.nombre);
    setFormEstado(guardado.name);
    setFormCiudad(
      ciudadGuardada && guardado.cities.includes(ciudadGuardada) ? ciudadGuardada : guardado.cities[0],
    );
    setErrorPerfil("");
    setAvisoPerfil("");
    setEditando(true);
  }

  async function guardarPerfil(event: FormEvent) {
    event.preventDefault();
    setErrorPerfil("");

    if (!isPersonName(formNombre)) {
      setErrorPerfil("Escribe un nombre de al menos 3 letras, sin números.");
      return;
    }
    if (!formEstado || !formCiudad) {
      setErrorPerfil("Elige tu estado y tu ciudad.");
      return;
    }

    setGuardando(true);
    try {
      const actual = await updatePerfil({
        nombre: formNombre.trim(),
        estado: formEstado,
        ciudad: formCiudad,
      });
      setCuenta(actual);
      setEditando(false);
      setAvisoPerfil("Listo: tu nombre y tu ciudad quedaron guardados en la cuenta real.");
    } catch (fallo) {
      setErrorPerfil(
        fallo instanceof ApiError ? fallo.message : "No pudimos guardar tus datos. Intenta de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (revisando) {
    return (
      <div className="mt-6 flex min-h-[240px] flex-col items-center justify-center gap-3 text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" aria-hidden="true" />
        <p className="text-[13px]">Revisando tu sesión…</p>
      </div>
    );
  }

  if (paso === "cuenta" && cuenta) {
    const { usuario, conductor, capacidades } = cuenta;
    const primerNombre = usuario.nombre.trim().split(/\s+/)[0] ?? usuario.nombre;

    return (
      <div className="animate-pop py-2 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <Badge tone="success" className="mt-5 uppercase tracking-[0.14em]">
          Cuenta real
        </Badge>
        <h2 className="heading mt-4 text-[26px] font-extrabold text-white sm:text-[30px]">Listo, {primerNombre}.</h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-300">
          Tu cuenta ya está creada en el backend de Llégate. La web y la app comparten este mismo perfil, saldo y rol.
        </p>

        <dl className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Nombre</dt>
            <dd className="mt-1 truncate text-[13px] text-ink-200">{usuario.nombre}</dd>
          </div>
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Rol</dt>
            <dd className="mt-1 text-[13px] text-ink-200">{ROL_LABEL[usuario.rol]}</dd>
          </div>
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Teléfono</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-200">
              {maskPhone(usuario.telefono)}
              {usuario.telefonoVerificado && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-label="Verificado" />
              )}
            </dd>
          </div>
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Saldo</dt>
            <dd className="mt-1 text-[13px] text-ink-200">{formatUSD(usuario.saldoBilletera)}</dd>
          </div>
          <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3 sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Ubicación</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-200">
              <MapPin className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
              {usuario.ciudad || usuario.estado ? `${usuario.ciudad ?? ""}, ${usuario.estado ?? ""}` : "Sin indicar"}
            </dd>
          </div>
        </dl>

        <p className="mx-auto mt-3 max-w-md text-left text-[11.5px] leading-relaxed text-ink-500">
          {capacidades.puedeConducir
            ? "Puedes recibir viajes como piloto y tu comisión se descuenta del saldo prepago."
            : conductor
              ? `Tu registro de piloto está ${conductor.verificacion ?? "pendiente"} de verificación.`
              : "Como pasajero puedes pedir mototaxi, taxi pana y delivery desde la app."}
        </p>

        {editando ? (
          <form
            className="mx-auto mt-5 max-w-md text-left"
            onSubmit={guardarPerfil}
            noValidate
            aria-label="Editar mis datos"
          >
            <div className="rounded-2xl border border-asphalt-800 bg-asphalt-950/70 p-4">
              <label htmlFor={editarNombreId} className="label">
                Nombre
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id={editarNombreId}
                  name="nombre"
                  autoComplete="name"
                  maxLength={120}
                  value={formNombre}
                  onChange={(event) => setFormNombre(event.target.value)}
                  className="field pl-10"
                  placeholder="Cómo te llamamos"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={editarEstadoId} className="label">
                    Estado
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                    <select
                      id={editarEstadoId}
                      name="estado"
                      value={formEstado}
                      onChange={(event) => {
                        const elegido = event.target.value;
                        setFormEstado(elegido);
                        setFormCiudad(ESTADOS.find((item) => item.name === elegido)?.cities[0] ?? "");
                      }}
                      className="field appearance-none pl-10 pr-10"
                    >
                      {ESTADOS.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                  </div>
                </div>
                <div>
                  <label htmlFor={editarCiudadId} className="label">
                    Ciudad
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                    <select
                      id={editarCiudadId}
                      name="ciudad"
                      value={formCiudad}
                      onChange={(event) => setFormCiudad(event.target.value)}
                      className="field appearance-none pl-10 pr-10"
                    >
                      {(ESTADOS.find((item) => item.name === formEstado)?.cities ?? []).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">
                El teléfono y el rol no se editan aquí: el teléfono es tu identidad y el rol lo define el equipo de
                Llégate.
              </p>

              {errorPerfil && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
                >
                  {errorPerfil}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={guardando} aria-busy={guardando}>
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Guardar cambios
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mx-auto mt-4 max-w-md text-center">
            <button
              type="button"
              onClick={abrirEdicion}
              className="inline-flex min-h-[40px] items-center gap-1.5 text-[12.5px] font-semibold text-brand-400 transition hover:text-brand-300"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar mi nombre y mi ciudad
            </button>
            {avisoPerfil && (
              <p className="mt-1 text-[12px] leading-relaxed text-emerald-300">{avisoPerfil}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button to="/app">
            Ver la app <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={cerrarSesion} disabled={cargando}>
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Cerrar sesión
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px]">
          {usuario.rol === "admin" ? (
            <Link
              to="/admin"
              className="inline-flex min-h-[36px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
            >
              Panel de operaciones
            </Link>
          ) : (
            <Link
              to="/conductores/verificacion"
              className="inline-flex min-h-[36px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
            >
              Verificación de piloto
            </Link>
          )}
        </div>

        <div className="mt-6 text-left">
          <RealNote />
        </div>

        <RealWallet onCuentaActualizada={actualizarCuenta} />
      </div>
    );
  }

  if (paso === "codigo") {
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            setPaso("datos");
            setError("");
          }}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-ink-300 transition hover:text-white"
        >
          Cambiar número
        </button>
        <h2 className="heading mt-3 text-3xl font-extrabold text-white sm:text-[34px]">Escribe el código.</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
          Enviamos 6 dígitos a <span className="font-semibold text-white">{maskPhone(e164)}</span> por WhatsApp o SMS.
        </p>
        {aviso && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-300">
            <MessageSquareText className="h-3.5 w-3.5" /> {aviso}
          </p>
        )}

        <form className="mt-5 grid gap-4" onSubmit={confirmarCodigo} noValidate>
          <div>
            <label htmlFor={codigoId} className="label">
              Código de acceso
            </label>
            <input
              id={codigoId}
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ""))}
              className="field mono text-center text-[22px] tracking-[0.35em]"
              placeholder="000000"
              aria-describedby={error ? `${codigoId}-error` : undefined}
            />
            {error && (
              <span id={`${codigoId}-error`} className="mt-1.5 block text-[11.5px] text-red-300">
                {error}
              </span>
            )}
          </div>

          <Button type="submit" full disabled={cargando} aria-busy={cargando}>
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
              </>
            ) : (
              <>
                Entrar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-400">
            <span>¿No llegó?</span>
            <button
              type="button"
              onClick={reenviar}
              disabled={resendIn > 0 || cargando}
              className="inline-flex min-h-[40px] items-center font-semibold text-brand-400 transition hover:text-brand-300 disabled:text-ink-600"
            >
              {resendIn > 0 ? `Reenviar en ${resendIn}s` : "Reenviar código"}
            </button>
          </div>

          <RealNote />
        </form>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <h2 className="heading text-3xl font-extrabold text-white sm:text-[34px]">
        {mode === "register" ? "Crea tu cuenta real." : "Entra con tu teléfono."}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
        Sin contraseñas: te enviamos un código por WhatsApp o SMS. La misma cuenta funciona en la web y en la app.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={enviarCodigo} noValidate>
        {mode === "register" && (
          <div>
            <label htmlFor={nombreId} className="label">
              Nombre y apellido
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                id={nombreId}
                name="nombre"
                autoComplete="name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="field pl-10"
                placeholder="María Rodríguez"
              />
            </div>
          </div>
        )}

        {mode === "register" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={estadoId} className="label">
                Estado
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <select
                  id={estadoId}
                  name="estado"
                  autoComplete="address-level1"
                  value={estado}
                  onChange={(event) => {
                    const elegido = event.target.value;
                    setEstado(elegido);
                    setCiudad(ESTADOS.find((item) => item.name === elegido)?.cities[0] ?? "");
                  }}
                  className="field appearance-none pl-10 pr-10"
                >
                  {ESTADOS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              </div>
            </div>
            <div>
              <label htmlFor={ciudadId} className="label">
                Ciudad
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <select
                  id={ciudadId}
                  name="ciudad"
                  autoComplete="address-level2"
                  value={ciudad}
                  onChange={(event) => setCiudad(event.target.value)}
                  className="field appearance-none pl-10 pr-10"
                >
                  {(ESTADOS.find((item) => item.name === estado)?.cities ?? []).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor={telefonoId} className="label">
            Teléfono
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              id={telefonoId}
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              className="field pl-10"
              placeholder="+58 414 1234567"
            />
          </div>
          <span className="mt-1.5 block text-[11.5px] text-ink-500">
            Puedes escribirlo con +58 o empezando por 0.
          </span>
        </div>

        {mode === "register" && (
          <div className="flex items-start gap-3">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1.5 h-4 w-4 shrink-0 rounded border-asphalt-600 bg-asphalt-900 accent-brand-500"
            />
            <label htmlFor={consentId} className="text-[12px] leading-relaxed text-ink-400">
              Acepto los{" "}
              <Link to="/legal/terminos" className="font-semibold text-brand-400 hover:text-brand-300">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link to="/legal/privacidad" className="font-semibold text-brand-400 hover:text-brand-300">
                política de privacidad
              </Link>
              . Entiendo que se creará una cuenta real en Llégate.
            </label>
          </div>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <Button type="submit" full disabled={cargando} aria-busy={cargando}>
          {cargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando código…
            </>
          ) : (
            <>
              {mode === "register" ? "Crear cuenta y enviar código" : "Enviar código"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <RealNote />

        <p className="text-center text-[12px] text-ink-400">
          {mode === "register" ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/ingresar"
                className="inline-flex min-h-[40px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
              >
                Ingresar
              </Link>
            </>
          ) : (
            <>
              ¿Aún no tienes cuenta?{" "}
              <Link
                to="/registro"
                className="inline-flex min-h-[40px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
              >
                Crear una
              </Link>
            </>
          )}
        </p>
      </form>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
        <Smartphone className="h-3.5 w-3.5" /> Misma cuenta en la web y en la app
      </p>
    </div>
  );
}
