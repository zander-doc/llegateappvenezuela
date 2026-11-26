import { useEffect, useState } from "react";
import { getGoogleConfig } from "../lib/api";
import { GoogleCancelado, pedirCredencialGoogle } from "../lib/googleOAuth";

// "Ingresar con Google" con botón propio. Solo aparece si la API tiene
// GOOGLE_CLIENT_ID; si no, la página sigue con teléfono.

const TEXTOS = {
  signin_with: "Ingresar con Google",
  signup_with: "Registrarme con Google",
  continue_with: "Continuar con Google",
} as const;

function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function GoogleButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: keyof typeof TEXTOS;
}) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let activo = true;
    getGoogleConfig().then((configuracion) => {
      if (activo && configuracion.disponible && configuracion.clientId) setClientId(configuracion.clientId);
    });
    return () => {
      activo = false;
    };
  }, []);

  async function abrir() {
    if (!clientId || abierto) return;
    setAviso("");
    setAbierto(true);
    try {
      onCredential(await pedirCredencialGoogle(clientId));
    } catch (error) {
      if (error instanceof GoogleCancelado && error.message === "bloqueada") {
        setAviso("Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.");
      } else if (error instanceof GoogleCancelado && error.message === "error") {
        setAviso("No pudimos validar el ingreso con Google. Inténtalo de nuevo.");
      }
    } finally {
      setAbierto(false);
    }
  }

  if (!clientId) return null;

  return (
    <div data-testid="google-button">
      <button
        type="button"
        onClick={abrir}
        disabled={abierto}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-5 text-[14.5px] font-semibold text-ink-950 transition hover:bg-white/90 disabled:opacity-70"
      >
        <LogoGoogle />
        {abierto ? "Esperando a Google…" : TEXTOS[text]}
      </button>
      {aviso ? (
        <p role="alert" className="mt-2 text-center text-[12.5px] text-racing-400">
          {aviso}
        </p>
      ) : null}
      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-ink-500">
        <span className="h-px flex-1 bg-asphalt-800" />
        o con tu teléfono
        <span className="h-px flex-1 bg-asphalt-800" />
      </div>
    </div>
  );
}
