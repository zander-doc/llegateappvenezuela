import { afterEach, describe, expect, it, vi } from "vitest";

const API = "https://api.llegate.test";
const SESSION_KEY = "llegate_sesion_v1";

async function cargarApi() {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", API);
  return import("./api");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchMock(...responses: Array<Response | Error>) {
  const mock = vi.fn();
  for (const response of responses) {
    mock.mockImplementationOnce(() =>
      response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
    );
  }
  vi.stubGlobal("fetch", mock);
  return mock;
}

function guardarSesion(overrides: Partial<{ access_token: string; refresh_token: string; expires_at: number }> = {}) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    }),
  );
}

const ME = {
  ok: true,
  usuario: {
    id: "u1",
    rol: "cliente",
    nombre: "María Rodríguez",
    telefono: "+584141234567",
    telefono_verificado: true,
    email: null,
    whatsapp: "+584141234567",
    saldo_billetera: "9.90",
  },
  conductor: null,
  capacidades: { puede_pedir_viajes: true, puede_conducir: false },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("cliente de API", () => {
  it("queda desactivado sin VITE_API_URL", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const api = await import("./api");
    expect(api.realAuthEnabled).toBe(false);
    await expect(api.requestOtp({ telefono: "+584141234567" })).rejects.toMatchObject({
      code: "api_no_configurada",
    });
  });

  it("envía el teléfono al pedir el código", async () => {
    const mock = fetchMock(jsonResponse({ ok: true, mensaje: "Código enviado" }));
    const api = await cargarApi();

    const mensaje = await api.requestOtp({ telefono: "+584141234567", nombre: "María", rol: "cliente" });

    expect(mensaje).toBe("Código enviado");
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/auth/otp`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      telefono: "+584141234567",
      nombre: "María",
      rol: "cliente",
    });
  });

  it("guarda la sesión al verificar y consulta el perfil con el token", async () => {
    const mock = fetchMock(
      jsonResponse({
        ok: true,
        access_token: "access-9",
        refresh_token: "refresh-9",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        usuario: { id: "u1", telefono: "+584141234567" },
      }),
      jsonResponse(ME),
    );
    const api = await cargarApi();

    const cuenta = await api.verifyOtp({ telefono: "+584141234567", token: "123456" });

    expect(cuenta.usuario).toMatchObject({
      nombre: "María Rodríguez",
      telefonoVerificado: true,
      saldoBilletera: 9.9,
    });
    expect(cuenta.conductor).toBeNull();
    expect(cuenta.capacidades).toEqual({ puedePedirViajes: true, puedeConducir: false });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toMatchObject({ access_token: "access-9" });

    const [meUrl, meInit] = mock.mock.calls[1] as [string, RequestInit];
    expect(meUrl).toBe(`${API}/auth/me`);
    expect((meInit.headers as Record<string, string>).Authorization).toBe("Bearer access-9");
  });

  it("renueva el token cuando está por vencer", async () => {
    guardarSesion({ access_token: "viejo", expires_at: Math.floor(Date.now() / 1000) - 10 });
    const mock = fetchMock(
      jsonResponse({
        ok: true,
        access_token: "nuevo",
        refresh_token: "refresh-2",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
      jsonResponse(ME),
    );
    const api = await cargarApi();

    await api.getCuenta();

    const [refreshUrl, refreshInit] = mock.mock.calls[0] as [string, RequestInit];
    expect(refreshUrl).toBe(`${API}/auth/refresh`);
    expect(JSON.parse(String(refreshInit.body))).toEqual({ refresh_token: "refresh-1" });
    expect((mock.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer nuevo" });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toMatchObject({ access_token: "nuevo" });
  });

  it("cierra la sesión local si el refresh es rechazado", async () => {
    guardarSesion();
    fetchMock(jsonResponse({ error: "sesion_invalida", mensaje: "Sesión vencida" }, 401));
    const api = await cargarApi();

    await expect(api.refreshSession("refresh-1")).rejects.toMatchObject({ code: "sesion_invalida", status: 401 });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("cierra la sesión local si el perfil responde 401", async () => {
    guardarSesion();
    fetchMock(jsonResponse({ error: "no_autorizado", mensaje: "Token inválido" }, 401));
    const api = await cargarApi();

    await expect(api.getCuenta()).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("mapea los errores de la API y la falta de conexión", async () => {
    fetchMock(jsonResponse({ error: "codigo_invalido", mensaje: "El código no sirve", detalles: { intentos: 3 } }, 400));
    const api = await cargarApi();

    const fallo = await api.verifyOtp({ telefono: "+584141234567", token: "000000" }).catch((error) => error);
    expect(fallo).toBeInstanceOf(api.ApiError);
    expect(fallo).toMatchObject({ code: "codigo_invalido", status: 400, message: "El código no sirve" });

    fetchMock(new TypeError("failed to fetch"));
    await expect(api.requestOtp({ telefono: "+584141234567" })).rejects.toMatchObject({ code: "sin_conexion" });
  });

  it("avisa al cerrar sesión y limpia los tokens igual", async () => {
    guardarSesion();
    const mock = fetchMock(new Response(null, { status: 204 }));
    const api = await cargarApi();

    await api.logout();

    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/auth/logout`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-1");
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("limpia sesiones guardadas inválidas y enmascara teléfonos", async () => {
    localStorage.setItem(SESSION_KEY, "{no-json");
    const api = await cargarApi();

    expect(api.loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(api.maskPhone("+584141234567")).toBe("+58 ••• 4567");
    expect(api.maskPhone(null)).toBe("—");
  });

  it("consulta la billetera real y los métodos de pago", async () => {
    guardarSesion();
    const mock = fetchMock(
      jsonResponse({
        ok: true,
        billetera: "piloto",
        saldo_billetera: "20.50",
        reservado_usd: "1.10",
        disponible_usd: "19.40",
        estado_billetera: "activo",
        limites: {
          comision_porcentaje: "10",
          comision_minima_usd: "0.10",
          saldo_minimo_usd: "1",
          alerta_saldo_bajo_usd: "2",
          recarga_minima_usd: "5",
          recarga_maxima_usd: "50",
          sla_aprobacion_minutos: "15",
          bienvenida_usd: "2",
        },
      }),
      jsonResponse({
        ok: true,
        metodos: [
          { id: "pago_movil", disponible: true, revision: "manual" },
          { id: "binance_pay", disponible: false, revision: "automatica" },
        ],
      }),
    );
    const api = await cargarApi();

    const billetera = await api.getWallet();
    const metodos = await api.getPaymentMethods();

    expect(billetera).toMatchObject({
      tipo: "piloto",
      saldoUSD: 20.5,
      reservadoUSD: 1.1,
      disponibleUSD: 19.4,
      estado: "activo",
    });
    expect(billetera.limites.recargaMinimaUSD).toBe(5);
    expect(metodos).toEqual([
      { id: "pago_movil", disponible: true, revision: "manual" },
      { id: "binance_pay", disponible: false, revision: "automatica" },
    ]);
    const [walletUrl, walletInit] = mock.mock.calls[0] as [string, RequestInit];
    expect(walletUrl).toBe(`${API}/wallet/billetera`);
    expect((walletInit.headers as Record<string, string>).Authorization).toBe("Bearer access-1");
  });

  it("lista y crea intenciones de pago con el contrato del API", async () => {
    guardarSesion();
    const mock = fetchMock(
      jsonResponse({
        ok: true,
        pagos: [
          {
            id: "pago-1",
            codigo: "LLG-AAAA111111",
            metodo: "pago_movil",
            estado: "pendiente",
            monto_usd: "10.00",
            monto_bs: "1000.00",
            tasa_bs: "100",
            checkout_url: null,
            instrucciones: { tipo: "pago_movil", banco: "Banesco" },
            referencia_reportada: null,
            created_at: "2026-10-31T12:00:00.000Z",
          },
        ],
      }),
      jsonResponse({
        ok: true,
        pago: {
          id: "pago-2",
          codigo: "LLG-BBBB222222",
          metodo: "binance_pay",
          estado: "pendiente",
          monto_usd: 12,
          monto_bs: null,
          tasa_bs: null,
          checkout_url: "https://pay.binance.test/checkout/1",
          instrucciones: { tipo: "binance_pay" },
          expira_en: "2026-10-31T13:00:00.000Z",
        },
      }),
    );
    const api = await cargarApi();

    const pagos = await api.listPayments();
    const creado = await api.createPaymentIntent({ metodo: "binance_pay", montoUSD: 12 });

    expect(pagos[0]).toMatchObject({
      id: "pago-1",
      metodo: "pago_movil",
      estado: "pendiente",
      montoUSD: 10,
      montoBs: 1000,
      checkoutUrl: null,
    });
    expect(creado).toMatchObject({
      codigo: "LLG-BBBB222222",
      metodo: "binance_pay",
      montoUSD: 12,
      checkoutUrl: "https://pay.binance.test/checkout/1",
    });

    const [createUrl, createInit] = mock.mock.calls[1] as [string, RequestInit];
    expect(createUrl).toBe(`${API}/payments/intents`);
    expect(createInit.method).toBe("POST");
    expect(JSON.parse(String(createInit.body))).toEqual({ metodo: "binance_pay", monto_usd: 12 });
  });

  it("reporta la referencia y traduce los errores de pago", async () => {
    guardarSesion();
    const mock = fetchMock(jsonResponse({ ok: true, estado: "en_revision", ya_reportado: false }));
    const api = await cargarApi();

    const resultado = await api.reportPayment({ id: "pago-1", referencia: " 12345678 " });

    expect(resultado).toEqual({ ok: true, estado: "en_revision", motivo: undefined, yaReportado: false });
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/payments/pago-1/report`);
    expect(JSON.parse(String(init.body))).toEqual({ referencia: "12345678" });

    expect(
      api.paymentErrorMessage(new api.ApiError("23505", 409, "REFERENCIA_DUPLICADA")),
    ).toBe("Esa referencia ya está registrada. Revisa el número que te dio tu banco.");
    expect(api.paymentErrorMessage(new api.ApiError("P0001", 400, "PAGO_EN_REVISION"))).toBe(
      "Ya reportaste este pago: no se puede cancelar, solo esperar la revisión.",
    );
    expect(api.paymentErrorMessage(new Error("otra cosa"))).toBe(
      "No pudimos completar el pago. Intenta de nuevo.",
    );
  });
});
