import { describe, expect, it, vi } from "vitest";
import { entregarCredencialGoogle, urlGoogle } from "./googleOAuth";

function token(carga: object) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  return `${b64({ alg: "RS256" })}.${b64(carga)}.firma`;
}

describe("googleOAuth", () => {
  it("pide el selector de cuentas y un id_token", () => {
    const url = new URL(urlGoogle("cli.apps", "https://sitio.dev", "e1", "n1"));
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("response_type")).toBe("id_token");
    expect(url.searchParams.get("redirect_uri")).toBe("https://sitio.dev/google/callback");
    expect(url.searchParams.get("nonce")).toBe("n1");
  });

  it("entrega el token con su estado y nonce a la ventana de origen", () => {
    const opener = { postMessage: vi.fn() } as unknown as Window;
    const idToken = token({ nonce: "n1" });
    expect(entregarCredencialGoogle(`#id_token=${idToken}&state=e1`, opener, "https://sitio.dev")).toBe(true);
    expect(opener.postMessage).toHaveBeenCalledWith(
      { tipo: "llegate-google", idToken, estado: "e1", nonce: "n1" },
      "https://sitio.dev",
    );
  });

  it("no entrega nada sin token o sin ventana de origen", () => {
    expect(entregarCredencialGoogle("#error=access_denied", null, "https://sitio.dev")).toBe(false);
  });
});
