import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { asignarPersonal, getPersonal, type MiembroPersonal, type RolPersonal } from "../../lib/api";
import { ETIQUETA_ROL_PERSONAL } from "./AdminLayout";

const ROLES: RolPersonal[] = ["superadmin", "operaciones", "finanzas", "soporte"];
const DESCRIPCION: Record<RolPersonal, string> = {
  superadmin: "Ve y hace todo, incluida la gestión del personal.",
  operaciones: "Revisa documentos de pilotos y comercios. No ve dinero.",
  finanzas: "Confirma recargas y ve las cifras de dinero.",
  soporte: "Atiende solicitudes y mensajes.",
};

export function AdminPersonalPage() {
  const [lista, setLista] = useState<MiembroPersonal[] | null>(null);
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState<RolPersonal>("operaciones");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    getPersonal()
      .then(setLista)
      .catch(() => setMensaje("No pudimos cargar el personal."));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(destino: string, nuevo: RolPersonal | null) {
    setEnviando(true);
    setMensaje("");
    try {
      await asignarPersonal(destino, nuevo);
      setMensaje(nuevo ? "Rol asignado." : "Rol retirado.");
      setTelefono("");
      cargar();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No pudimos guardar el cambio.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4 p-4 sm:p-6">
      <h1 className="heading text-[28px] font-extrabold text-white">Personal</h1>
      <p className="text-[13.5px] text-ink-300">
        La persona primero se registra con su teléfono como cualquier usuario; aquí le das su rol.
      </p>

      <form
        className="grid gap-3 rounded-2xl border border-asphalt-800 bg-asphalt-900/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar(telefono.trim(), rol);
        }}
      >
        <label className="grid gap-1 text-[13px] font-semibold text-ink-200">
          Teléfono (con código de país)
          <input
            className="min-h-11 rounded-xl border border-asphalt-700 bg-asphalt-950 px-3 text-[14px] text-white"
            inputMode="tel"
            placeholder="+584141234567"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-ink-200">
          Rol
          <select
            className="min-h-11 rounded-xl border border-asphalt-700 bg-asphalt-950 px-3 text-[14px] text-white"
            value={rol}
            onChange={(e) => setRol(e.target.value as RolPersonal)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL_PERSONAL[r]} — {DESCRIPCION[r]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 rounded-xl bg-brand-500 px-4 text-[14px] font-bold text-ink-950 disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Asignar rol"}
        </button>
      </form>

      {mensaje ? (
        <p role="status" className="text-[13px] text-ink-200">
          {mensaje}
        </p>
      ) : null}

      {!lista ? (
        <div className="flex items-center gap-2 text-[13px] text-ink-400" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <ul className="grid gap-2">
          {lista.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-asphalt-800 bg-asphalt-900/60 p-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-white">{m.nombre}</p>
                <p className="text-[12px] text-ink-400">
                  {m.telefono} · {ETIQUETA_ROL_PERSONAL[m.rolPersonal]}
                </p>
              </div>
              <button
                type="button"
                disabled={enviando}
                onClick={() => void guardar(m.telefono, null)}
                className="min-h-11 rounded-xl border border-asphalt-700 px-3 text-[13px] font-semibold text-ink-200 hover:text-white disabled:opacity-60"
              >
                Quitar rol
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
