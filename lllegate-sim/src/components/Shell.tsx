import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, Smartphone, X } from "lucide-react";
import { useUI } from "../lib/ui";

export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const timer = window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 104;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 80);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

export function InstallBar() {
  const { openModal } = useUI();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("llegate_sim_install_bar") === "1";
    } catch {
      return false;
    }
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !scrolled) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="animate-fade-up flex items-center gap-3 rounded-2xl border border-white/14 bg-ink-850/95 p-3 shadow-[0_18px_50px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">Llégate en tu móvil</p>
          <p className="truncate text-[11.5px] text-ink-400">Te avisamos al lanzar</p>
        </div>
        <button
          type="button"
          onClick={() => openModal({ type: "download" })}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 text-[12.5px] font-bold text-asphalt-950"
        >
          <Download className="h-3.5 w-3.5" /> Avísame
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem("llegate_sim_install_bar", "1");
            } catch {
              /* noop */
            }
          }}
          aria-label="Cerrar aviso de app"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useUI();
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-pop pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] shadow-2xl backdrop-blur-xl ${
            toast.tone === "success"
              ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"
              : "border-white/15 bg-ink-850/95 text-ink-100"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
