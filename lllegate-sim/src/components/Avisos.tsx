import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { getAvisos, marcarAvisosLeidos, type Aviso } from "../lib/api";

const fechaFmt = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Avisos de la cuenta (aprobación o corrección del registro de piloto). Los
// pendientes se marcan como leídos al descartarlos, no al verlos.
export function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    let activo = true;
    getAvisos()
      .then((respuesta) => {
        if (activo) setAvisos(respuesta.avisos.filter((aviso) => !aviso.leida));
      })
      .catch(() => {
        // Sin avisos no se muestra nada: no bloquea la pantalla.
      });
    return () => {
      activo = false;
    };
  }, []);

  if (avisos.length === 0) return null;

  async function descartar() {
    setAvisos([]);
    await marcarAvisosLeidos().catch(() => {});
  }

  return (
    <section aria-label="Avisos de tu cuenta" className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-400">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Avisos
        </p>
        <button
          type="button"
          onClick={() => void descartar()}
          className="inline-flex min-h-[32px] items-center gap-1 text-[12px] font-semibold text-ink-300 transition hover:text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Marcar como leídos
        </button>
      </div>
      <ul className="mt-3 grid gap-2.5">
        {avisos.map((aviso) => (
          <li key={aviso.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[13px] font-semibold text-white">{aviso.titulo}</p>
            {aviso.cuerpo && <p className="mt-1 text-[12px] leading-relaxed text-ink-300">{aviso.cuerpo}</p>}
            <p className="mono mt-1.5 text-[10.5px] text-ink-500">{fechaFmt.format(new Date(aviso.creadoEn))}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
