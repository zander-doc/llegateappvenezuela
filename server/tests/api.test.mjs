import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const OK_TRIP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const NO_FUNDS_TRIP = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const FORBIDDEN_TRIP = "cccccccc-cccc-cccc-cccc-cccccccccccc";

let authCalls = 0;
const rpcCalls = [];
const logoutCalls = [];

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

// Supabase falso: GoTrue para validar el JWT y PostgREST para las RPC.
// Permite probar el API completo sin proyecto ni credenciales reales.
const fakeSupabase = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let raw = "";
  for await (const chunk of req) raw += chunk;

  if (url.pathname === "/auth/v1/user") {
    authCalls += 1;
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (token === "valid-client") {
      return json(res, 200, {
        id: CLIENT_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "ana@example.com",
        phone: "",
      });
    }
    return json(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
  }

  if (url.pathname === "/auth/v1/token") {
    const body = raw ? JSON.parse(raw) : {};
    if (url.searchParams.get("grant_type") === "refresh_token" && body.refresh_token === "valid-refresh") {
      return json(res, 200, {
        access_token: "new-access",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 1790000000,
        refresh_token: "new-refresh",
        user: {
          id: CLIENT_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "ana@example.com",
          phone: "+584142222222",
        },
      });
    }
    return json(res, 400, {
      error: "invalid_grant",
      error_description: "Invalid Refresh Token: Refresh Token Not Found",
    });
  }

  if (url.pathname === "/auth/v1/logout") {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    logoutCalls.push({ token, scope: url.searchParams.get("scope") });
    if (token !== "valid-client") {
      return json(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    }
    res.writeHead(204);
    return res.end();
  }

  if (url.pathname === "/rest/v1/perfil_usuario") {
    return json(res, 200, [
      {
        id: CLIENT_ID,
        rol: "conductor",
        nombre: "Ana Cliente",
        telefono: "+584142222222",
        telefono_verificado: true,
        email: "ana@example.com",
        whatsapp: null,
        saldo_billetera: 20,
        es_conductor: true,
        tipo_vehiculo: "moto",
        placa: "AB123CD",
        verificacion: "aprobado",
        estado_conductor: "activo",
        motivo_rechazo: null,
        verificado_en: "2026-10-30T12:00:00.000Z",
        puede_pedir_viajes: false,
        puede_conducir: true,
      },
    ]);
  }

  if (url.pathname === "/rest/v1/transacciones_billetera") {
    return json(res, 200, [
      {
        id: "9f1c0000-0000-0000-0000-000000000001",
        tipo: "comision",
        estado: "aprobada",
        metodo: "saldo",
        monto_usd: -1,
        saldo_resultante: 19,
        billetera: "piloto",
        viaje_id: OK_TRIP,
        banco: null,
        referencia: null,
        comprobante_url: null,
        motivo_rechazo: null,
        nota: "Comisión 10% del viaje Chacao → Altamira",
        created_at: "2026-10-30T12:00:00.000Z",
        aprobada_en: null,
      },
    ]);
  }

  if (url.pathname.startsWith("/rest/v1/rpc/")) {
    const fn = url.pathname.slice("/rest/v1/rpc/".length);
    const payload = raw ? JSON.parse(raw) : {};
    rpcCalls.push({ fn, payload, authorization: req.headers.authorization });

    if (fn === "mi_billetera") {
      return json(res, 200, {
        billetera: "piloto",
        saldo_billetera: 20,
        reservado_usd: 1,
        disponible_usd: 19,
        estado_billetera: "activo",
        conductor_estado: "activo",
        limites: {
          comision_porcentaje: 0.1,
          comision_minima_usd: 0.1,
          saldo_minimo_usd: 1,
          alerta_saldo_bajo_usd: 2,
          recarga_minima_usd: 5,
          recarga_maxima_usd: 50,
          sla_aprobacion_minutos: 15,
          bienvenida_usd: 2,
        },
      });
    }

    if (fn === "cancelar_viaje") {
      if (payload.p_viaje_id === OK_TRIP) {
        return json(res, 200, {
          ok: true,
          viaje_id: OK_TRIP,
          estado: "cancelado",
          reserva_liberada: true,
          motivo: payload.p_motivo,
        });
      }
    }

    if (fn === "pagar_viaje_con_saldo") {
      if (payload.p_viaje_id === OK_TRIP) {
        return json(res, 200, {
          ok: true,
          ya_procesado: false,
          viaje_id: OK_TRIP,
          estado_viaje: "finalizado",
          precio_usd: 10,
          comision_usd: 1,
          neto_conductor: 9,
          saldo_cliente: 10,
          saldo_conductor: 19,
          conductor_activo: true,
        });
      }
      if (payload.p_viaje_id === NO_FUNDS_TRIP) {
        return json(res, 200, {
          ok: false,
          motivo: "saldo_insuficiente",
          requiere_recarga: true,
          viaje_id: NO_FUNDS_TRIP,
          precio_usd: 50,
          saldo_cliente: 10,
        });
      }
      if (payload.p_viaje_id === FORBIDDEN_TRIP) {
        return json(res, 403, { code: "42501", message: "NO_AUTORIZADO" });
      }
    }

    if (fn === "reportar_recarga") {
      return json(res, 200, {
        ok: true,
        transaccion_id: "9f1c0000-0000-0000-0000-000000000000",
        estado: "pendiente",
        metodo: payload.p_metodo,
        monto_usd: payload.p_monto_usd,
      });
    }

    return json(res, 404, { code: "PGRST202", message: "rpc no encontrada" });
  }

  return json(res, 404, { error: "not_found" });
});

let appServer;

await new Promise((resolve) => fakeSupabase.listen(0, "127.0.0.1", resolve));
const fakeUrl = `http://127.0.0.1:${fakeSupabase.address().port}`;

process.env.SUPABASE_URL = fakeUrl;
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.CORS_ORIGIN = "http://localhost:5173";

const { app } = await import("../src/app.js");

await new Promise((resolve) => {
  appServer = app.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${appServer.address().port}`;

test.after(async () => {
  await new Promise((resolve) => appServer.close(resolve));
  await new Promise((resolve) => fakeSupabase.close(resolve));
});

function post(path, { token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function lastRpc() {
  return rpcCalls.at(-1);
}

test("POST /trips/:id/pagar-saldo cobra con saldo y devuelve los saldos", async () => {
  const before = rpcCalls.length;
  const response = await post(`/trips/${OK_TRIP}/pagar-saldo`, { token: "valid-client" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.comision_usd, 1);
  assert.equal(body.saldo_cliente, 10);
  assert.equal(body.saldo_conductor, 19);
  assert.equal(rpcCalls.length, before + 1);

  const rpc = lastRpc();
  assert.equal(rpc.fn, "pagar_viaje_con_saldo");
  assert.deepEqual(rpc.payload, { p_viaje_id: OK_TRIP });
  assert.equal(rpc.authorization, "Bearer valid-client");
});

test("POST /trips/:id/pagar-saldo responde 409 cuando el cliente no tiene saldo", async () => {
  const response = await post(`/trips/${NO_FUNDS_TRIP}/pagar-saldo`, { token: "valid-client" });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.ok, false);
  assert.equal(body.motivo, "saldo_insuficiente");
  assert.equal(body.requiere_recarga, true);
});

test("POST /trips/:id/pagar-saldo traduce el rechazo de la RPC a 403", async () => {
  const response = await post(`/trips/${FORBIDDEN_TRIP}/pagar-saldo`, { token: "valid-client" });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error, "no_autorizado");
});

test("POST /trips/:id/pagar-saldo exige token", async () => {
  const before = rpcCalls.length;
  const response = await post(`/trips/${OK_TRIP}/pagar-saldo`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "token_requerido");
  assert.equal(rpcCalls.length, before);
});

test("POST /trips/:id/pagar-saldo rechaza un token inválido", async () => {
  const response = await post(`/trips/${OK_TRIP}/pagar-saldo`, { token: "expirado" });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "token_invalido");
});

test("POST /trips/:id/pagar-saldo valida el UUID antes de llamar a la RPC", async () => {
  const before = rpcCalls.length;
  const response = await post("/trips/no-es-un-uuid/pagar-saldo", { token: "valid-client" });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error, "datos_invalidos");
  assert.equal(body.detalles[0].campo, "id");
  assert.equal(rpcCalls.length, before);
});

test("POST /wallet/recargas/pago-movil rechaza referencias que no son numéricas", async () => {
  const before = rpcCalls.length;
  const response = await post("/wallet/recargas/pago-movil", {
    token: "valid-client",
    body: { monto_usd: 5, banco: "Banesco", referencia: "REF-001" },
  });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error, "datos_invalidos");
  assert.equal(body.detalles[0].campo, "referencia");
  assert.equal(rpcCalls.length, before);
});

test("POST /wallet/recargas/pago-movil reporta la recarga con datos válidos", async () => {
  const response = await post("/wallet/recargas/pago-movil", {
    token: "valid-client",
    body: { monto_usd: 5, banco: "Banesco", referencia: "0123456789" },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.estado, "pendiente");

  const rpc = lastRpc();
  assert.equal(rpc.fn, "reportar_recarga");
  assert.deepEqual(rpc.payload, {
    p_metodo: "pago_movil",
    p_monto_usd: 5,
    p_banco: "Banesco",
    p_referencia: "0123456789",
    p_comprobante_url: null,
  });
});

test("POST /wallet/recargas/binance acepta el ID de orden y rechaza el formato corto", async () => {
  const short = await post("/wallet/recargas/binance", {
    token: "valid-client",
    body: { monto_usd: 10, referencia: "ABC" },
  });
  assert.equal(short.status, 422);

  const response = await post("/wallet/recargas/binance", {
    token: "valid-client",
    body: { monto_usd: 10, referencia: "TX-123456789" },
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.estado, "pendiente");
  assert.equal(lastRpc().payload.p_metodo, "binance_pay");
  assert.equal(lastRpc().payload.p_banco, "Binance");
});

test("GET /wallet/billetera devuelve saldo, reserva y límites del prepago", async () => {
  const response = await fetch(`${baseUrl}/wallet/billetera`, {
    headers: { authorization: "Bearer valid-client" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.billetera, "piloto");
  assert.equal(body.saldo_billetera, 20);
  assert.equal(body.reservado_usd, 1);
  assert.equal(body.disponible_usd, 19);
  assert.equal(body.limites.sla_aprobacion_minutos, 15);
  assert.equal(body.limites.recarga_minima_usd, 5);

  const rpc = lastRpc();
  assert.equal(rpc.fn, "mi_billetera");
});

test("GET /wallet/movimientos lista el libro mayor con la billetera explícita", async () => {
  const response = await fetch(`${baseUrl}/wallet/movimientos`, {
    headers: { authorization: "Bearer valid-client" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.movimientos.length, 1);
  assert.equal(body.movimientos[0].billetera, "piloto");
  assert.equal(body.movimientos[0].tipo, "comision");
});

test("POST /trips/:id/cancelar libera la reserva de comisión", async () => {
  const response = await post(`/trips/${OK_TRIP}/cancelar`, {
    token: "valid-client",
    body: { motivo: "El pasajero no salió" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.reserva_liberada, true);
  assert.deepEqual(lastRpc().payload, {
    p_viaje_id: OK_TRIP,
    p_motivo: "El pasajero no salió",
  });
});

test("POST /trips/:id/cancelar valida el UUID antes de llamar a la RPC", async () => {
  const before = rpcCalls.length;
  const response = await post("/trips/no-es-un-uuid/cancelar", {
    token: "valid-client",
    body: {},
  });

  assert.equal(response.status, 422);
  assert.equal(rpcCalls.length, before);
});

test("GET /auth/me devuelve el mismo perfil unificado que usa la app", async () => {
  const response = await fetch(`${baseUrl}/auth/me`, {
    headers: { authorization: "Bearer valid-client" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.usuario.id, CLIENT_ID);
  assert.equal(body.usuario.rol, "conductor");
  assert.equal(body.usuario.saldo_billetera, 20);
  assert.equal(body.conductor.placa, "AB123CD");
  assert.equal(body.conductor.verificacion, "aprobado");
  assert.equal(body.capacidades.puede_pedir_viajes, false);
  assert.equal(body.capacidades.puede_conducir, true);
});

test("POST /auth/refresh renueva la sesión con el refresh_token", async () => {
  const response = await post("/auth/refresh", { body: { refresh_token: "valid-refresh" } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.access_token, "new-access");
  assert.equal(body.refresh_token, "new-refresh");
  assert.equal(body.usuario.id, CLIENT_ID);
});

test("POST /auth/refresh responde 401 cuando el refresh_token no sirve", async () => {
  const response = await post("/auth/refresh", { body: { refresh_token: "refresh-expirado" } });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "sesion_invalida");
});

test("POST /auth/refresh valida el cuerpo antes de llamar a Auth", async () => {
  const response = await post("/auth/refresh", { body: { refresh_token: "corto" } });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error, "datos_invalidos");
  assert.equal(body.detalles[0].campo, "refresh_token");
});

test("POST /auth/logout cierra solo la sesión actual", async () => {
  const before = logoutCalls.length;
  const response = await post("/auth/logout", { token: "valid-client" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(logoutCalls.length, before + 1);
  assert.equal(logoutCalls.at(-1).token, "valid-client");
  assert.equal(logoutCalls.at(-1).scope, "local");
});

test("POST /auth/logout exige token", async () => {
  const before = logoutCalls.length;
  const response = await post("/auth/logout");
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "token_requerido");
  assert.equal(logoutCalls.length, before);
});

test("el API mantiene el health check", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(authCalls > 0, true);
});
