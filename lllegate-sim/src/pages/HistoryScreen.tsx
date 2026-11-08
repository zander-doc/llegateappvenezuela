import { History } from "lucide-react";
import { useNavSection } from "../lib/navigation";

export function HistoryScreen() {
  useNavSection();
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-asphalt-900/60 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
          <History className="h-7 w-7" />
        </div>
        <h1 className="display mt-5 text-2xl font-bold text-white">Historial</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
          Aquí verás tus viajes y recargas recientes. Pronto tendrás reseñas de pilotos, filtros por servicio y acceso a viajes programados.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            className="h-12 rounded-xl border border-white/12 bg-white/[0.04] px-5 text-[14px] font-semibold text-white transition hover:border-brand-500/40 hover:text-white"
          >
            Ver todas las actividades
          </button>
          <button
            type="button"
            className="h-12 rounded-xl bg-brand-500 px-5 text-[14px] font-bold text-asphalt-950 transition hover:bg-brand-400 active:scale-[0.98]"
          >
            ¿Qué verá aquí?
          </button>
        </div>
      </div>
    </main>
  );
}

