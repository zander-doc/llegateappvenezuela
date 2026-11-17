import { useEffect, useRef, useState } from "react";
import { getGoogleConfig } from "../lib/api";

// "Ingresar con Google" (Google Identity Services). El botón solo aparece si la
// API tiene configurado GOOGLE_CLIENT_ID; si no, la página sigue con teléfono.

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (respuesta: { credential?: string }) => void;
    ux_mode?: "popup";
    auto_select?: boolean;
  }) => void;
  renderButton: (elemento: HTMLElement, opciones: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function cargarScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existente ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("google_script")), { once: true });
    if (!existente) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function GoogleButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [listo, setListo] = useState(false);
  const alCredencial = useRef(onCredential);
  alCredencial.current = onCredential;

  useEffect(() => {
    let activo = true;

    (async () => {
      const configuracion = await getGoogleConfig();
      if (!activo || !configuracion.disponible || !configuracion.clientId) return;
      try {
        await cargarScript();
      } catch {
        return;
      }
      const api = window.google?.accounts?.id;
      if (!activo || !api || !contenedor.current) return;

      api.initialize({
        client_id: configuracion.clientId,
        callback: (respuesta) => {
          if (respuesta.credential) alCredencial.current(respuesta.credential);
        },
        ux_mode: "popup",
      });
      api.renderButton(contenedor.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text,
        shape: "pill",
        logo_alignment: "left",
        locale: "es",
        width: Math.min(contenedor.current.clientWidth || 320, 400),
      });
      setListo(true);
    })();

    return () => {
      activo = false;
    };
  }, [text]);

  return (
    <div className={listo ? "block" : "hidden"} data-testid="google-button">
      <div ref={contenedor} className="flex justify-center" />
      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-500">
        <span className="h-px flex-1 bg-asphalt-800" />
        o con tu teléfono
        <span className="h-px flex-1 bg-asphalt-800" />
      </div>
    </div>
  );
}
