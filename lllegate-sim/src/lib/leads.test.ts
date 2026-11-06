import { afterEach, describe, expect, it, vi } from "vitest";

const API = "https://api.llegate.test";

async function cargarLeads(url: string) {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", url);
  return import("./leads");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("guardarSolicitud", () => {
  it("sin API configurada deja el dato en el navegador y lo dice", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { guardarSolicitud } = await cargarLeads("");

    const destino = await guardarSolicitud({ tipo: "contacto", contacto: "04141234567" }, { name: "Ana" });

    expect(destino).toBe("demo");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("llegate_sim_contacto")).toContain("Ana");
  });

  it("con API configurada envía el contacto normalizado y no toca el almacén", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, id: "s1", estado: "nueva" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { guardarSolicitud } = await cargarLeads(API);

    const destino = await guardarSolicitud(
      { tipo: "conductor", nombre: "Ana Pérez", contacto: "0414 1234567", ciudad: "Caracas" },
      { name: "Ana Pérez" },
    );

    expect(destino).toBe("real");
    expect(localStorage.getItem("llegate_sim_conductor")).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/solicitudes`);
    expect(JSON.parse(init.body)).toMatchObject({
      tipo: "conductor",
      contacto: "+584141234567",
      nombre: "Ana Pérez",
      ciudad: "Caracas",
    });
  });

  it("propaga el mensaje de la API cuando rechaza el formulario", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "demasiados_intentos", mensaje: "Espera unos minutos." }, 429)),
    );
    const { guardarSolicitud } = await cargarLeads(API);
    const { solicitudErrorMessage } = await import("./api");

    const error = await guardarSolicitud({ tipo: "cobertura", contacto: "ana@ejemplo.com" }, {}).then(
      () => null,
      (fallo) => fallo,
    );

    expect(error).not.toBeNull();
    expect(solicitudErrorMessage(error)).toBe("Ya tenemos varios mensajes tuyos. Espera unos minutos y vuelve a enviarlo.");
  });
});
