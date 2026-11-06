// Pruebas de integración del API contra un PostgreSQL real efímero. Sin
// servicios externos ni red: se aplican las migraciones en el clúster embebido y
// se ejercita el flujo completo por HTTP.
import "./setup.mjs";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import test, { after, before } from "node:test";
import {
  aplicarMigraciones,
  iniciarPostgres,
  listarMigraciones,
  root,
} from "../../scripts/embedded-postgres.mjs";

const PUERTO_PG = 55434;
const PUERTO_API = 4399;
const BASE = "llegate_api_test";
const DIR_DATOS = join(root, ".pg-data-api");
const DIR_ALMACEN = join(root, ".storage-api-test");
const URL_API = `http://127.0.0.1:${PUERTO_API}`;

process.env.DATABASE_URL = `postgres://postgres:postgres@localhost:${PUERTO_PG}/${BASE}`;
process.env.AUTH_JWT_SECRET = "secreto-jwt-de-pruebas";
process.env.OTP_SECRET = "pepper-otp-de-pruebas";
process.env.OTP_LOG_EN_DESARROLLO = "1";
process.env.OTP_MAX_POR_IP = "100";
process.env.PUBLIC_API_URL = URL_API;
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = DIR_ALMACEN;
process.env.PAGO_MOVIL_BANCO = "Banesco";
process.env.PAGO_MOVIL_TELEFONO = "+584141234567";
process.env.PAGO_MOVIL_CEDULA = "V12345678";
process.env.PAGO_MOVIL_TITULAR = "Llégate C.A.";
process.env.PAGO_MOVIL_TASA_BS = "100";
process.env.NODE_ENV = "test";

const CLIENTE = { id: "22222222-2222-2222-2222-222222222222", telefono: "+584141111111" };
const ADMIN = { id: "33333333-3333-3333-3333-333333333333", telefono: "+584143333333" };
const PILOTO = { id: "11111111-1111-1111-1111-111111111111", telefono: "+584141111112" };
// Este número no existe en la base: el primer /auth/otp debe crear la cuenta.
const ASPIRANTE = { telefono: "+584146666666" };

let pg;
let clienteSql;
let servidor;
let cerrarPool;
const sesiones = {};

function png(etiqueta) {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(etiqueta),
  ]);
}

async function sql(consulta, parametros = []) {
  return (await clienteSql.query(consulta, parametros)).rows;
}

async function pedir(metodo, ruta, { cuerpo, token, headers = {} } = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }

  return { status: respuesta.status, cuerpo: datos, headers: respuesta.headers };
}

// El canal de OTP en pruebas es el log del servidor: se intercepta para leer
// el código, igual que haría un SMS real.
async function pedirCodigo(telefono, { rol = "cliente", nombre, estado, ciudad } = {}) {
  let codigo = null;
  const original = console.log;

  console.log = (mensaje, ...resto) => {
    const texto = [mensaje, ...resto].map(String).join(" ");
    const encontrado = texto.match(/^\[otp\] (\+\d+): (\d{6})$/);
    if (encontrado) {
      if (encontrado[1] === telefono) codigo = encontrado[2];
      return;
    }
    original(mensaje, ...resto);
  };

  try {
    const respuesta = await pedir("POST", "/auth/otp", { cuerpo: { telefono, rol, nombre, estado, ciudad } });
    assert.equal(respuesta.status, 202, JSON.stringify(respuesta.cuerpo));
  } finally {
    console.log = original;
  }

  assert.ok(codigo, `No se capturó el código OTP de ${telefono}`);
  return codigo;
}

async function entrar(telefono, opciones) {
  const codigo = await pedirCodigo(telefono, opciones);
  const respuesta = await pedir("POST", "/auth/verify", {
    cuerpo: { telefono, token: codigo },
  });
  assert.equal(respuesta.status, 200, JSON.stringify(respuesta.cuerpo));
  return respuesta.cuerpo;
}

async function sesion(nombre, cuenta, opciones) {
  sesiones[nombre] ??= await entrar(cuenta.telefono, opciones);
  return sesiones[nombre];
}

before(async () => {
  rmSync(DIR_ALMACEN, { recursive: true, force: true });

  const arranque = await iniciarPostgres({ puerto: PUERTO_PG, base: BASE, datos: DIR_DATOS });
  pg = arranque.pg;
  clienteSql = pg.getPgClient(BASE);
  await clienteSql.connect();
  await aplicarMigraciones(clienteSql, listarMigraciones());

  await sql(
    `insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data) values
       ($1, $2, now(), '{"nombre":"Ana Cliente","rol":"cliente"}'),
       ($3, $4, now(), '{"nombre":"Admin Uno","rol":"admin"}'),
       ($5, $6, now(), '{"nombre":"Carlos Conductor","rol":"conductor"}')`,
    [CLIENTE.id, CLIENTE.telefono, ADMIN.id, ADMIN.telefono, PILOTO.id, PILOTO.telefono],
  );

  await sql("update public.usuarios set rol = 'admin' where id = $1", [ADMIN.id]);
  await sql("update public.usuarios set saldo_billetera = 20 where id = $1", [CLIENTE.id]);
  await sql("update public.usuarios set saldo_billetera = 10 where id = $1", [PILOTO.id]);
  await sql(
    `insert into public.conductores_detalles (
       usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio,
       verificacion, estado
     ) values ($1, 'V12345678', 'carro', 'AB123CD', 'Toyota', 'Corolla', 2018, 'aprobado', 'activo')`,
    [PILOTO.id],
  );

  const { app } = await import("../src/app.js");
  ({ cerrarPool } = await import("../src/db.js"));

  servidor = await new Promise((resolver) => {
    const actual = app.listen(PUERTO_API, "127.0.0.1", () => resolver(actual));
  });
});

after(async () => {
  if (servidor) await new Promise((resolver) => servidor.close(resolver));
  if (cerrarPool) await cerrarPool().catch(() => {});
  if (clienteSql) await clienteSql.end().catch(() => {});
  if (pg) await pg.stop().catch(() => {});
  rmSync(DIR_ALMACEN, { recursive: true, force: true });
  rmSync(DIR_DATOS, { recursive: true, force: true });
});

test("GET /health responde sin tocar la base de datos", async () => {
  const respuesta = await pedir("GET", "/health");
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.cuerpo, { ok: true, servicio: "llegate-api" });
});

test("GET /health/db confirma la conexión con la base", async () => {
  const respuesta = await pedir("GET", "/health/db");
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.cuerpo.ok, true);
  assert.equal(respuesta.cuerpo.base, `localhost:${PUERTO_PG}/${BASE}`);
  assert.equal(typeof respuesta.cuerpo.latencia_ms, "number");
});

test("GET /health/otp informa el canal y la plantilla de WhatsApp", async () => {
  const respuesta = await pedir("GET", "/health/otp");
  assert.equal(respuesta.status, 200);
  const cuerpo = respuesta.cuerpo;
  assert.equal(cuerpo.ok, true);
  assert.equal(cuerpo.whatsapp.plantilla, "llegate_otp");
  assert.equal(cuerpo.whatsapp.idioma, "es");
  assert.equal(typeof cuerpo.whatsapp.configurado, "boolean");
  assert.equal(typeof cuerpo.sms.configurado, "boolean");
  assert.equal(cuerpo.log.activo, true);
  // Sin proveedores configurados el próximo envío cae al log.
  if (!cuerpo.whatsapp.configurado && !cuerpo.sms.configurado) {
    assert.equal(cuerpo.canal, "log");
  }
});

test("el registro por SMS crea la cuenta y entrega tokens propios", async () => {
  const codigo = await pedirCodigo(ASPIRANTE.telefono, { rol: "conductor", nombre: "Nuevo Piloto" });
  assert.match(codigo, /^\d{6}$/);

  const [guardado] = await sql("select intentos from auth.otp_codigos where telefono = $1", [
    ASPIRANTE.telefono,
  ]);
  assert.equal(guardado.intentos, 0);

  const incorrecto = codigo === "000000" ? "111111" : "000000";
  const fallo = await pedir("POST", "/auth/verify", {
    cuerpo: { telefono: ASPIRANTE.telefono, token: incorrecto },
  });
  assert.equal(fallo.status, 401);
  assert.equal(fallo.cuerpo.error, "codigo_invalido");

  const [trasFallo] = await sql("select intentos from auth.otp_codigos where telefono = $1", [
    ASPIRANTE.telefono,
  ]);
  assert.equal(trasFallo.intentos, 1);

  const verificado = await pedir("POST", "/auth/verify", {
    cuerpo: { telefono: ASPIRANTE.telefono, token: codigo },
  });
  assert.equal(verificado.status, 200);
  assert.equal(verificado.cuerpo.ok, true);
  assert.equal(verificado.cuerpo.usuario.telefono, ASPIRANTE.telefono);
  assert.match(verificado.cuerpo.usuario.id, /^[0-9a-f-]{36}$/);
  assert.ok(verificado.cuerpo.access_token);
  assert.ok(verificado.cuerpo.refresh_token);
  assert.ok(Number.isInteger(verificado.cuerpo.expires_at));

  const [reutilizado] = await sql("select 1 from auth.otp_codigos where telefono = $1", [
    ASPIRANTE.telefono,
  ]);
  assert.equal(reutilizado, undefined);

  const perfil = await pedir("GET", "/auth/me", { token: verificado.cuerpo.access_token });
  assert.equal(perfil.status, 200);
  assert.equal(perfil.cuerpo.usuario.rol, "conductor");
  assert.equal(perfil.cuerpo.usuario.telefono_verificado, true);
  assert.equal(perfil.cuerpo.conductor, null);
  assert.equal(perfil.cuerpo.capacidades.puede_pedir_viajes, false);
  assert.ok(!perfil.cuerpo.capacidades.puede_conducir);

  sesiones.aspirante = verificado.cuerpo;
});

test("el registro guarda el estado y la ciudad del pasajero", async () => {
  const telefono = "+584147777777";
  const codigo = await pedirCodigo(telefono, {
    nombre: "Luisa Marcano",
    estado: "Zulia",
    ciudad: "Maracaibo",
  });
  const verificado = await pedir("POST", "/auth/verify", {
    cuerpo: { telefono, token: codigo },
  });
  assert.equal(verificado.status, 200);

  const perfil = await pedir("GET", "/auth/me", { token: verificado.cuerpo.access_token });
  assert.equal(perfil.status, 200);
  assert.equal(perfil.cuerpo.usuario.estado, "Zulia");
  assert.equal(perfil.cuerpo.usuario.ciudad, "Maracaibo");
});

test("PATCH /auth/perfil edita nombre y ubicación sin exponer rol ni saldo", async () => {
  const telefono = "+584147777778";
  const tokens = await entrar(telefono, { nombre: "Luis Pineda", estado: "Zulia", ciudad: "Maracaibo" });
  const acceso = tokens.access_token;

  const sinSesion = await pedir("PATCH", "/auth/perfil", { cuerpo: { nombre: "Otra Persona" } });
  assert.equal(sinSesion.status, 401);

  const vacio = await pedir("PATCH", "/auth/perfil", { token: acceso, cuerpo: {} });
  assert.equal(vacio.status, 422, JSON.stringify(vacio.cuerpo));

  const corto = await pedir("PATCH", "/auth/perfil", { token: acceso, cuerpo: { nombre: "L" } });
  assert.equal(corto.status, 422);

  const malo = await pedir("PATCH", "/auth/perfil", { token: acceso, cuerpo: { whatsapp: "0412 1234567" } });
  assert.equal(malo.status, 422);

  // rol y saldo no están en el esquema: se descartan antes de llegar a la base.
  const contrabando = await pedir("PATCH", "/auth/perfil", {
    token: acceso,
    cuerpo: { nombre: "Luis A. Pineda", rol: "admin", saldo_billetera: 999 },
  });
  assert.equal(contrabando.status, 200, JSON.stringify(contrabando.cuerpo));
  assert.equal(contrabando.cuerpo.usuario.nombre, "Luis A. Pineda");
  assert.equal(contrabando.cuerpo.usuario.rol, "cliente");

  const ubicacion = await pedir("PATCH", "/auth/perfil", {
    token: acceso,
    cuerpo: { estado: "Miranda", ciudad: "Chacao", whatsapp: "+584121234567" },
  });
  assert.equal(ubicacion.status, 200, JSON.stringify(ubicacion.cuerpo));
  assert.equal(ubicacion.cuerpo.usuario.estado, "Miranda");
  assert.equal(ubicacion.cuerpo.usuario.ciudad, "Chacao");
  assert.equal(ubicacion.cuerpo.usuario.whatsapp, "+584121234567");

  const guardado = await sql(
    "select nombre, rol, saldo_billetera, estado, ciudad, whatsapp from public.usuarios where id = $1",
    [contrabando.cuerpo.usuario.id],
  );
  assert.equal(guardado[0].nombre, "Luis A. Pineda");
  assert.equal(guardado[0].rol, "cliente");
  assert.equal(Number(guardado[0].saldo_billetera), 0);
  assert.equal(guardado[0].ciudad, "Chacao");
});

test("refresh rota el token y logout revoca solo esa sesión", async () => {
  const sinToken = await pedir("GET", "/auth/me");
  assert.equal(sinToken.status, 401);
  assert.equal(sinToken.cuerpo.error, "token_requerido");

  const falso = await pedir("GET", "/auth/me", { token: "no.es.un.jwt" });
  assert.equal(falso.status, 401);
  assert.equal(falso.cuerpo.error, "token_invalido");

  const inicial = await sesion("cliente", CLIENTE);

  const renovado = await pedir("POST", "/auth/refresh", {
    cuerpo: { refresh_token: inicial.refresh_token },
  });
  assert.equal(renovado.status, 200);
  assert.notEqual(renovado.cuerpo.refresh_token, inicial.refresh_token);

  const viejo = await pedir("POST", "/auth/refresh", {
    cuerpo: { refresh_token: inicial.refresh_token },
  });
  assert.equal(viejo.status, 401);
  assert.equal(viejo.cuerpo.error, "sesion_invalida");

  const perfil = await pedir("GET", "/auth/me", { token: renovado.cuerpo.access_token });
  assert.equal(perfil.status, 200);
  assert.equal(perfil.cuerpo.usuario.id, CLIENTE.id);
  assert.equal(perfil.cuerpo.usuario.rol, "cliente");
  assert.equal(perfil.cuerpo.conductor, null);
  assert.equal(perfil.cuerpo.capacidades.puede_pedir_viajes, true);

  const salida = await pedir("POST", "/auth/logout", { token: renovado.cuerpo.access_token });
  assert.equal(salida.status, 200);

  const despues = await pedir("GET", "/auth/me", { token: renovado.cuerpo.access_token });
  assert.equal(despues.status, 401);
  assert.equal(despues.cuerpo.error, "sesion_invalida");

  // La web y la app pueden mantener sesiones separadas de la misma cuenta.
  sesiones.cliente = await entrar(CLIENTE.telefono);
});

test("POST /auth/otp limita los códigos pedidos por teléfono", async () => {
  const telefono = "+584149990001";
  for (let intento = 0; intento < 3; intento += 1) {
    const respuesta = await pedir("POST", "/auth/otp", { cuerpo: { telefono } });
    assert.equal(respuesta.status, 202);
    // El cliente pinta el aviso según el canal: sin proveedor configurado es "log".
    assert.equal(respuesta.cuerpo.canal, "log");
  }

  const bloqueado = await pedir("POST", "/auth/otp", { cuerpo: { telefono } });
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.cuerpo.error, "demasiados_intentos");
  assert.ok(bloqueado.cuerpo.detalles.retry_after > 0);
  assert.ok(bloqueado.headers.get("retry-after"));

  const invalido = await pedir("POST", "/auth/otp", { cuerpo: { telefono: "04141234567" } });
  assert.equal(invalido.status, 422);
  assert.equal(invalido.cuerpo.error, "datos_invalidos");
});

test("las rutas de administración exigen rol admin", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const clienteSesion = await pedir("GET", "/admin/recargas", { token: cliente.access_token });
  assert.equal(clienteSesion.status, 403);
  assert.equal(clienteSesion.cuerpo.error, "solo_admin");

  const admin = await sesion("admin", ADMIN);
  const recargas = await pedir("GET", "/admin/recargas", { token: admin.access_token });
  assert.equal(recargas.status, 200);
  assert.ok(Array.isArray(recargas.cuerpo.recargas));

  const adminPerfil = await pedir("GET", "/auth/me", { token: admin.access_token });
  assert.equal(adminPerfil.cuerpo.usuario.rol, "admin");
  assert.equal(adminPerfil.cuerpo.capacidades.puede_pedir_viajes, false);

  const filtroInvalido = await pedir("GET", "/admin/conductores?verificacion=otro", {
    token: admin.access_token,
  });
  assert.equal(filtroInvalido.status, 422);
});

test("los métodos de pago reflejan la configuración del servidor", async () => {
  const cliente = await sesion("cliente", CLIENTE);

  const metodos = await pedir("GET", "/payments/metodos", { token: cliente.access_token });
  assert.equal(metodos.status, 200);
  assert.deepEqual(metodos.cuerpo.metodos, [
    { id: "pago_movil", disponible: true, revision: "manual" },
    { id: "binance_pay", disponible: false, revision: "automatica" },
  ]);

  const binance = await pedir("POST", "/payments/intents", {
    token: cliente.access_token,
    cuerpo: { metodo: "binance_pay", monto_usd: 10 },
  });
  assert.equal(binance.status, 503);
  assert.equal(binance.cuerpo.error, "binance_no_configurado");

  const webhook = await fetch(`${URL_API}/webhooks/binance-pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bizStatus: "PAY_SUCCESS" }),
  });
  assert.equal(webhook.status, 503);
  assert.deepEqual(await webhook.json(), {
    returnCode: "FAIL",
    returnMessage: "webhook_no_configurado",
  });
});

test("Pago Móvil: intención, reporte, confirmación admin y saldo", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const admin = await sesion("admin", ADMIN);

  const intencion = await pedir("POST", "/payments/intents", {
    token: cliente.access_token,
    cuerpo: { metodo: "pago_movil", monto_usd: 10 },
  });
  assert.equal(intencion.status, 201);
  const pago = intencion.cuerpo.pago;
  assert.ok(pago?.id);
  assert.equal(pago.estado, "pendiente");
  assert.equal(pago.billetera, "pasajero");
  assert.equal(pago.monto_bs, 1000);
  assert.equal(pago.tasa_bs, 100);
  assert.equal(pago.instrucciones.banco, "Banesco");
  assert.equal(pago.instrucciones.monto_bs, 1000);
  assert.match(pago.codigo, /^LLG-[0-9A-F]{10}$/);

  const listado = await pedir("GET", "/payments", { token: cliente.access_token });
  assert.equal(listado.status, 200);
  assert.ok(listado.cuerpo.pagos.some((item) => item.id === pago.id));

  const referenciaInvalida = await pedir("POST", `/payments/${pago.id}/report`, {
    token: cliente.access_token,
    cuerpo: { referencia: "abc" },
  });
  assert.equal(referenciaInvalida.status, 422);

  const reporte = await pedir("POST", `/payments/${pago.id}/report`, {
    token: cliente.access_token,
    cuerpo: { referencia: "123456" },
  });
  assert.equal(reporte.status, 200);
  assert.equal(reporte.cuerpo.estado, "en_revision");
  assert.equal(reporte.cuerpo.ya_reportado, false);

  const repetido = await pedir("POST", `/payments/${pago.id}/report`, {
    token: cliente.access_token,
    cuerpo: { referencia: "123456" },
  });
  assert.equal(repetido.status, 200);
  assert.equal(repetido.cuerpo.ya_reportado, true);

  const cola = await pedir("GET", "/admin/pagos?estado=en_revision", { token: admin.access_token });
  assert.equal(cola.status, 200);
  assert.ok(cola.cuerpo.pagos.some((item) => item.id === pago.id));

  const confirmacion = await pedir("POST", `/admin/pagos/${pago.id}/confirmar`, {
    token: admin.access_token,
  });
  assert.equal(confirmacion.status, 200);
  assert.equal(confirmacion.cuerpo.estado, "confirmado");
  assert.equal(confirmacion.cuerpo.saldo_billetera, 30);
  assert.ok(confirmacion.cuerpo.transaccion_id);

  const idempotente = await pedir("POST", `/admin/pagos/${pago.id}/confirmar`, {
    token: admin.access_token,
  });
  assert.equal(idempotente.status, 200);
  assert.equal(idempotente.cuerpo.ya_confirmado, true);

  const billetera = await pedir("GET", "/wallet/billetera", { token: cliente.access_token });
  assert.equal(billetera.status, 200);
  assert.equal(billetera.cuerpo.billetera, "pasajero");
  assert.equal(billetera.cuerpo.saldo_billetera, 30);
  assert.equal(billetera.cuerpo.limites.comision_porcentaje, 0.1);

  const movimientos = await pedir("GET", "/wallet/movimientos", { token: cliente.access_token });
  const recarga = movimientos.cuerpo.movimientos.find(
    (item) => item.tipo === "recarga" && item.referencia === "123456",
  );
  assert.ok(recarga);
  assert.equal(recarga.estado, "aprobada");
  assert.equal(recarga.banco, "Banesco");
  assert.equal(recarga.monto_usd, 10);
});

test("las recargas legadas se aprueban desde el panel", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const admin = await sesion("admin", ADMIN);

  const reporte = await pedir("POST", "/wallet/recargas/pago-movil", {
    token: cliente.access_token,
    cuerpo: { monto_usd: 10, banco: "Banesco", referencia: "654321" },
  });
  assert.equal(reporte.status, 201);
  assert.equal(reporte.cuerpo.estado, "pendiente");
  assert.equal(reporte.cuerpo.billetera, "pasajero");
  assert.ok(reporte.cuerpo.transaccion_id);

  const duplicada = await pedir("POST", "/wallet/recargas/pago-movil", {
    token: cliente.access_token,
    cuerpo: { monto_usd: 10, banco: "Banesco", referencia: "654321" },
  });
  assert.equal(duplicada.status, 409);

  const cola = await pedir("GET", "/admin/recargas?estado=pendiente", {
    token: admin.access_token,
  });
  assert.equal(cola.status, 200);
  assert.ok(cola.cuerpo.recargas.some((item) => item.id === reporte.cuerpo.transaccion_id));

  const aprobada = await pedir(
    "POST",
    `/admin/recargas/${reporte.cuerpo.transaccion_id}/aprobar`,
    { token: admin.access_token },
  );
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.cuerpo.ok, true);
  assert.equal(aprobada.cuerpo.saldo_billetera, 40);

  const otraVez = await pedir(
    "POST",
    `/admin/recargas/${reporte.cuerpo.transaccion_id}/aprobar`,
    { token: admin.access_token },
  );
  assert.equal(otraVez.status, 409);
  assert.equal(otraVez.cuerpo.motivo, "ya_procesada");

  const recargaInvalida = await pedir("POST", "/wallet/recargas/pago-movil", {
    token: cliente.access_token,
    cuerpo: { monto_usd: 5, banco: "Banesco", referencia: "12" },
  });
  assert.equal(recargaInvalida.status, 422);
});

test("un piloto sube documentos, se le calcula el riesgo y el admin lo aprueba", async () => {
  const aspirante = await sesion("aspirante", ASPIRANTE);
  const aspiranteId = aspirante.usuario.id;
  const admin = await sesion("admin", ADMIN);
  const cliente = await sesion("cliente", CLIENTE);

  const registro = await pedir("POST", "/drivers/me", {
    token: aspirante.access_token,
    cuerpo: {
      cedula: "v87654321",
      tipo_vehiculo: "moto",
      placa: "xy987zt",
      marca: "Bera",
      modelo: "SBR",
      anio: 2021,
    },
  });
  assert.equal(registro.status, 201);
  assert.equal(registro.cuerpo.conductor.cedula, "V87654321");
  assert.equal(registro.cuerpo.conductor.placa, "XY987ZT");
  assert.equal(registro.cuerpo.conductor.verificacion, "pendiente");

  const repetido = await pedir("POST", "/drivers/me", {
    token: aspirante.access_token,
    cuerpo: { cedula: "V87654321", tipo_vehiculo: "moto", placa: "XY987ZT" },
  });
  assert.equal(repetido.status, 409);
  assert.equal(repetido.cuerpo.error, "registro_existente");

  const gif = await pedir("POST", "/drivers/me/documentos", {
    token: aspirante.access_token,
    cuerpo: { tipo: "licencia", mime: "image/gif", contenido_base64: png("gif").toString("base64") },
  });
  assert.equal(gif.status, 422);

  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("foto-de-prueba")]);
  const mimeFalso = await pedir("POST", "/drivers/me/documentos", {
    token: aspirante.access_token,
    cuerpo: { tipo: "licencia", mime: "image/png", contenido_base64: jpeg.toString("base64") },
  });
  assert.equal(mimeFalso.status, 422);
  assert.equal(mimeFalso.cuerpo.error, "mime_no_coincide");

  const documentos = {};
  for (const tipo of ["cedula_frente", "cedula_reverso", "licencia"]) {
    documentos[tipo] = png(`documento-${tipo}`);
    const subida = await pedir("POST", "/drivers/me/documentos", {
      token: aspirante.access_token,
      cuerpo: { tipo, mime: "image/png", contenido_base64: documentos[tipo].toString("base64") },
    });
    assert.equal(subida.status, 201, JSON.stringify(subida.cuerpo));
    assert.equal(subida.cuerpo.documento.tipo, tipo);
    assert.equal(subida.cuerpo.documento.ocr_estado, "no_configurado");
  }

  const incompleto = await pedir("POST", "/drivers/me/enviar", {
    token: aspirante.access_token,
  });
  assert.equal(incompleto.status, 400);
  assert.match(incompleto.cuerpo.mensaje, /DOCUMENTOS_INCOMPLETOS/);

  documentos.certificado_medico = png("documento-certificado_medico");
  const cuarto = await pedir("POST", "/drivers/me/documentos", {
    token: aspirante.access_token,
    cuerpo: {
      tipo: "certificado_medico",
      mime: "image/png",
      contenido_base64: documentos.certificado_medico.toString("base64"),
    },
  });
  assert.equal(cuarto.status, 201);

  const envio = await pedir("POST", "/drivers/me/enviar", { token: aspirante.access_token });
  assert.equal(envio.status, 200);
  assert.equal(envio.cuerpo.ok, true);
  assert.equal(envio.cuerpo.verificacion, "pendiente");
  assert.equal(envio.cuerpo.documentos, 4);
  assert.equal(envio.cuerpo.riesgo_puntaje, 0);
  assert.equal(envio.cuerpo.riesgo_nivel, "bajo");
  assert.ok(envio.cuerpo.motivos.some((motivo) => motivo.codigo === "ocr_no_disponible"));
  assert.ok(envio.cuerpo.enviado_en);

  const detallePiloto = await pedir("GET", "/drivers/me", { token: aspirante.access_token });
  assert.equal(detallePiloto.status, 200);
  assert.equal(detallePiloto.cuerpo.documentos.length, 4);
  assert.equal(detallePiloto.cuerpo.conductor.intentos_verificacion, 1);

  const cola = await pedir("GET", "/admin/conductores?verificacion=pendiente", {
    token: admin.access_token,
  });
  assert.equal(cola.status, 200);
  const enCola = cola.cuerpo.conductores.find(
    (conductor) => conductor.usuario_id === aspiranteId,
  );
  assert.ok(enCola);
  assert.equal(enCola.riesgo_puntaje, 0);
  assert.equal(enCola.usuario.telefono, ASPIRANTE.telefono);
  assert.equal(enCola.documentos.length, 4);

  const revision = await pedir(`GET`, `/admin/conductores/${aspiranteId}`, {
    token: admin.access_token,
  });
  assert.equal(revision.status, 200);
  assert.equal(revision.cuerpo.documentos.length, 4);
  assert.ok(revision.cuerpo.eventos.length >= 1);

  const frente = revision.cuerpo.documentos.find((item) => item.tipo === "cedula_frente");
  assert.ok(frente.url.startsWith(`${URL_API}/files/`));

  const descarga = await fetch(frente.url);
  assert.equal(descarga.status, 200);
  assert.equal(descarga.headers.get("content-type"), "image/png");
  assert.equal(descarga.headers.get("x-content-type-options"), "nosniff");
  const bytes = Buffer.from(await descarga.arrayBuffer());
  assert.ok(bytes.equals(documentos.cedula_frente));

  const token = new URL(frente.url).pathname.split("/").pop();
  const datos = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  datos.p = `${aspiranteId}/otro-archivo.png`;
  const manipulado = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const alterado = await pedir("GET", `/files/${manipulado}`);
  assert.equal(alterado.status, 403);
  assert.equal(alterado.cuerpo.error, "enlace_invalido");

  const ajeno = await pedir("GET", `/admin/conductores/${aspiranteId}`, {
    token: cliente.access_token,
  });
  assert.equal(ajeno.status, 403);

  const aprobacion = await pedir(
    "POST",
    `/admin/conductores/${aspiranteId}/verificar`,
    { token: admin.access_token, cuerpo: { aprobado: true } },
  );
  assert.equal(aprobacion.status, 200);
  assert.equal(aprobacion.cuerpo.verificacion, "aprobado");
  assert.equal(aprobacion.cuerpo.estado, "activo");
  assert.equal(aprobacion.cuerpo.bienvenida_usd, 2);
  assert.equal(aprobacion.cuerpo.saldo_billetera, 2);

  const perfil = await pedir("GET", "/auth/me", { token: aspirante.access_token });
  assert.equal(perfil.status, 200);
  assert.equal(perfil.cuerpo.conductor.verificacion, "aprobado");
  assert.equal(perfil.cuerpo.conductor.estado, "activo");
  assert.deepEqual(perfil.cuerpo.capacidades, {
    puede_pedir_viajes: false,
    puede_conducir: true,
  });

  const despues = await pedir("POST", "/drivers/me/documentos", {
    token: aspirante.access_token,
    cuerpo: {
      tipo: "licencia",
      mime: "image/png",
      contenido_base64: png("licencia-nueva").toString("base64"),
    },
  });
  assert.equal(despues.status, 400);
  assert.match(despues.cuerpo.mensaje, /CONDUCTOR_YA_APROBADO/);
});

test("un viaje con saldo se acepta, inicia y cobra con la comisión del 10%", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const piloto = await sesion("piloto", PILOTO);

  const creacion = await pedir("POST", "/trips", {
    token: cliente.access_token,
    cuerpo: {
      origen: "Altamira",
      destino: "Chacao",
      precio_usd: 5,
      distancia_km: 2.5,
      metodo_pago: "saldo",
    },
  });
  assert.equal(creacion.status, 201);
  assert.equal(creacion.cuerpo.viaje.estado, "solicitado");
  assert.equal(creacion.cuerpo.viaje.precio_usd, 5);

  const viajeId = creacion.cuerpo.viaje.id;
  const antes = await pedir("POST", `/trips/${viajeId}/pagar-saldo`, {
    token: cliente.access_token,
  });
  assert.equal(antes.status, 400);
  assert.match(antes.cuerpo.mensaje, /VIAJE_SIN_CONDUCTOR/);

  const aceptado = await pedir("POST", `/trips/${viajeId}/aceptar`, {
    token: piloto.access_token,
  });
  assert.equal(aceptado.status, 200);
  assert.equal(aceptado.cuerpo.ok, true);
  assert.equal(aceptado.cuerpo.estado, "aceptado");
  assert.equal(aceptado.cuerpo.comision_usd, 0.5);
  assert.equal(aceptado.cuerpo.disponible_usd, 9.5);

  const iniciado = await pedir("POST", `/trips/${viajeId}/iniciar`, {
    token: piloto.access_token,
  });
  assert.equal(iniciado.status, 200);
  assert.equal(iniciado.cuerpo.estado, "en_curso");

  const pagado = await pedir("POST", `/trips/${viajeId}/pagar-saldo`, {
    token: cliente.access_token,
  });
  assert.equal(pagado.status, 200);
  assert.equal(pagado.cuerpo.ok, true);
  assert.equal(pagado.cuerpo.comision_usd, 0.5);
  assert.equal(pagado.cuerpo.saldo_cliente, 35);
  assert.equal(pagado.cuerpo.saldo_conductor, 14.5);
  assert.equal(pagado.cuerpo.estado_viaje, "finalizado");

  const idempotente = await pedir("POST", `/trips/${viajeId}/pagar-saldo`, {
    token: cliente.access_token,
  });
  assert.equal(idempotente.status, 200);
  assert.equal(idempotente.cuerpo.ya_procesado, true);
  assert.equal(idempotente.cuerpo.saldo_cliente, 35);

  const detalle = await pedir("GET", `/trips/${viajeId}`, { token: cliente.access_token });
  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.viaje.estado, "finalizado");
  assert.equal(detalle.cuerpo.viaje.comision_usd, 0.5);
  assert.equal(detalle.cuerpo.viaje.conductor.nombre, "Carlos Conductor");
  assert.equal(detalle.cuerpo.viaje.conductor.placa, "AB123CD");
  assert.equal(detalle.cuerpo.viaje.conductor.verificacion, "aprobado");
  assert.equal(detalle.cuerpo.viaje.conductor.cedula, undefined);

  // El id de un viaje ajeno no abre el viaje de otro pana.
  const admin = await sesion("admin", ADMIN);
  const ajeno = await pedir("GET", `/trips/${viajeId}`, { token: admin.access_token });
  assert.equal(ajeno.status, 404);
  assert.equal(ajeno.cuerpo.error, "viaje_no_encontrado");

  const segundo = await pedir("POST", "/trips", {
    token: cliente.access_token,
    cuerpo: {
      origen: "Chacao",
      destino: "Sabana Grande",
      precio_usd: 5,
      metodo_pago: "saldo",
    },
  });
  const segundoId = segundo.cuerpo.viaje.id;
  const aceptado2 = await pedir("POST", `/trips/${segundoId}/aceptar`, {
    token: piloto.access_token,
  });
  assert.equal(aceptado2.cuerpo.ok, true);

  const cancelado = await pedir("POST", `/trips/${segundoId}/cancelar`, {
    token: cliente.access_token,
    cuerpo: { motivo: "Cambio de planes" },
  });
  assert.equal(cancelado.status, 200);
  assert.equal(cancelado.cuerpo.estado, "cancelado");
  assert.equal(cancelado.cuerpo.reserva_liberada, true);

  const uuidInvalido = await pedir("POST", "/trips/no-es-uuid/aceptar", {
    token: piloto.access_token,
  });
  assert.equal(uuidInvalido.status, 422);

  // El historial y el viaje abierto de la app salen de este listado, del más nuevo al más viejo.
  const historial = await pedir("GET", "/trips", { token: cliente.access_token });
  assert.equal(historial.status, 200);
  assert.deepEqual(
    historial.cuerpo.viajes.map((viaje) => [viaje.id, viaje.estado]),
    [
      [segundoId, "cancelado"],
      [viajeId, "finalizado"],
    ]
  );
  assert.equal(historial.cuerpo.viajes[0].conductor.placa, "AB123CD");
  assert.equal(historial.cuerpo.viajes[0].origen, "Chacao");

  // El listado es del pasajero: el piloto no ve los viajes que él condujo por aquí.
  const historialPiloto = await pedir("GET", "/trips", { token: piloto.access_token });
  assert.equal(historialPiloto.status, 200);
  assert.deepEqual(historialPiloto.cuerpo.viajes, []);
});
