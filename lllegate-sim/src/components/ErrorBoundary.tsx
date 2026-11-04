import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Llégate sim] Error de render:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-[100dvh] place-items-center bg-ink-950 px-5 py-16 text-center">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-racing-500/30 bg-racing-500/10 text-racing-400">
            <TriangleAlert className="h-6 w-6" />
          </span>
          <h1 className="heading mt-4 text-[24px] font-bold text-white">Algo se rompió en la simulación</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
            Recarga la página para volver a empezar. Esta demo no envía datos ni guarda información sensible.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[13px] font-bold text-asphalt-950 transition hover:bg-brand-400"
            >
              <RefreshCw className="h-4 w-4" /> Recargar
            </button>
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/12 px-4 text-[13px] font-semibold text-ink-200 transition hover:border-white/25 hover:text-white"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
