import { useEffect, useState } from "react";
import { entregarCredencialGoogle } from "../lib/googleOAuth";

// Página de retorno de Google (se abre en la ventana emergente).
export function GoogleCallbackPage() {
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const entregado = entregarCredencialGoogle(window.location.hash, window.opener, window.location.origin);
    if (entregado) window.close();
    else setFallo(true);
  }, []);

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-asphalt-950 p-6 text-center text-[14px] text-ink-300">
      {fallo ? "No pudimos completar el ingreso con Google. Cierra esta ventana e inténtalo de nuevo." : "Entrando…"}
    </div>
  );
}
