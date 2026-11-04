import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { InstallBar, ScrollManager, Toasts } from "./Shell";
import { ModalHost } from "./ModalHost";

export function Layout() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#contenido"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-full bg-racing-500 px-4 py-2 text-[13px] font-bold text-ink-950 transition focus:translate-y-0"
      >
        Ir al contenido
      </a>
      <ScrollManager />
      <Header />
      <div className="h-16 shrink-0 lg:h-[100px]" aria-hidden="true" />
      <main id="contenido" className="flex-1">
        <Suspense
          fallback={
            <div className="grid min-h-[60dvh] place-items-center" role="status" aria-label="Cargando página">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-brand-500" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <InstallBar />
      <ModalHost />
      <Toasts />
    </div>
  );
}
