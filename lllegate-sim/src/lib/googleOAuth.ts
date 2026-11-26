// Ingreso con Google con botón propio: abre la ventana de Google con el
// selector de cuentas (prompt=select_account), así no se ofrece ninguna sesión
// preactivada. Google devuelve el ID token a /google/callback, que se lo pasa
// a esta ventana; el servidor lo sigue verificando igual que antes.

const TIPO_MENSAJE = "llegate-google";
const CLAVE_ESTADO = "llegate_google_estado";

export const RUTA_RETORNO_GOOGLE = "/google/callback";

export function urlGoogle(clientId: string, origen: string, estado: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origen}${RUTA_RETORNO_GOOGLE}`,
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    hl: "es",
    state: estado,
    nonce,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function aleatorio(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class GoogleCancelado extends Error {
  constructor(motivo: "cerrada" | "bloqueada" | "error") {
    super(motivo);
    this.name = "GoogleCancelado";
  }
}

/** Abre Google y resuelve con el ID token. Debe llamarse desde un clic. */
export function pedirCredencialGoogle(clientId: string): Promise<string> {
  const estado = aleatorio();
  const nonce = aleatorio();
  try {
    sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify({ estado, nonce }));
  } catch {
    /* sin almacenamiento: el estado igual viaja en el mensaje */
  }

  const ancho = 480;
  const alto = 640;
  const izquierda = Math.max(0, Math.round(window.screenX + (window.outerWidth - ancho) / 2));
  const arriba = Math.max(0, Math.round(window.screenY + (window.outerHeight - alto) / 2));
  const ventana = window.open(
    urlGoogle(clientId, window.location.origin, estado, nonce),
    "llegate-google",
    `width=${ancho},height=${alto},left=${izquierda},top=${arriba}`,
  );
  if (!ventana) return Promise.reject(new GoogleCancelado("bloqueada"));

  return new Promise((resolve, reject) => {
    const vigilante = window.setInterval(() => {
      if (ventana.closed) {
        limpiar();
        reject(new GoogleCancelado("cerrada"));
      }
    }, 500);

    function limpiar() {
      window.clearInterval(vigilante);
      window.removeEventListener("message", alMensaje);
    }

    function alMensaje(evento: MessageEvent) {
      if (evento.origin !== window.location.origin) return;
      const datos = evento.data as { tipo?: string; idToken?: string; estado?: string; nonce?: string } | null;
      if (!datos || datos.tipo !== TIPO_MENSAJE) return;
      limpiar();
      if (datos.estado !== estado || datos.nonce !== nonce || !datos.idToken) {
        reject(new GoogleCancelado("error"));
        return;
      }
      resolve(datos.idToken);
    }

    window.addEventListener("message", alMensaje);
  });
}

function decodificarNonce(idToken: string): string | null {
  try {
    const carga = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(decodeURIComponent(escape(atob(carga)))) as { nonce?: string };
    return json.nonce ?? null;
  } catch {
    return null;
  }
}

/** Lo usa la página /google/callback: lee el hash, avisa a la ventana y se cierra. */
export function entregarCredencialGoogle(hash: string, opener: Window | null, origen: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const idToken = params.get("id_token");
  const estado = params.get("state");
  if (!opener || !idToken || !estado) return false;
  opener.postMessage({ tipo: TIPO_MENSAJE, idToken, estado, nonce: decodificarNonce(idToken) }, origen);
  return true;
}
