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
// En pruebas todas las peticiones salen de 127.0.0.1: el límite por conexión
// se sube para que lo que se mida sea el límite por contacto.
process.env.SOLICITUDES_MAX_POR_IP = "100";
process.env.NEGOCIOS_MAX_POR_IP = "100";

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

test("POST /solicitudes guarda el formulario y el admin lo gestiona", async () => {
  const envio = await pedir("POST", "/solicitudes", {
    cuerpo: {
      tipo: "lanzamiento",
      nombre: "Panita",
      contacto: "+584149990010",
      ciudad: "Maracaibo",
      mensaje: "Avísenme cuando abran en mi ciudad",
      datos: { plataforma: "android" },
      origen: "/app",
    },
  });
  assert.equal(envio.status, 201, JSON.stringify(envio.cuerpo));
  assert.equal(envio.cuerpo.estado, "nueva");
  const id = envio.cuerpo.id;

  const enBase = await sql(
    `select tipo, estado, contacto, ciudad, datos ->> 'plataforma' as plataforma, atendida_en
       from public.solicitudes where id = $1`,
    [id],
  );
  assert.equal(enBase[0].tipo, "lanzamiento");
  assert.equal(enBase[0].estado, "nueva");
  assert.equal(enBase[0].plataforma, "android");
  assert.equal(enBase[0].atendida_en, null);

  const admin = await sesion("admin", ADMIN);
  const lista = await pedir("GET", "/admin/solicitudes?estado=nueva", { token: admin.access_token });
  assert.equal(lista.status, 200);
  assert.ok(lista.cuerpo.solicitudes.some((solicitud) => solicitud.id === id));

  const clasificada = await pedir("POST", `/admin/solicitudes/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "respondida", nota: "Enviado por correo" },
  });
  assert.equal(clasificada.status, 200, JSON.stringify(clasificada.cuerpo));
  assert.equal(clasificada.cuerpo.solicitud.estado, "respondida");
  assert.ok(clasificada.cuerpo.solicitud.atendida_en, "no quedó la fecha de gestión");

  const trasClasificar = await pedir("GET", "/admin/solicitudes?estado=nueva", {
    token: admin.access_token,
  });
  assert.ok(!trasClasificar.cuerpo.solicitudes.some((solicitud) => solicitud.id === id));

  const fuera = await pedir("POST", `/admin/solicitudes/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "borrada" },
  });
  assert.equal(fuera.status, 422);

  const inexistente = await pedir("POST", `/admin/solicitudes/${crypto.randomUUID()}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "archivada" },
  });
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.cuerpo.error, "solicitud_no_encontrada");
});

test("POST /solicitudes valida el formulario público", async () => {
  const sinContacto = await pedir("POST", "/solicitudes", { cuerpo: { tipo: "contacto" } });
  assert.equal(sinContacto.status, 422);
  assert.equal(sinContacto.cuerpo.error, "datos_invalidos");

  const contactoMalo = await pedir("POST", "/solicitudes", {
    cuerpo: { tipo: "contacto", contacto: "hola" },
  });
  assert.equal(contactoMalo.status, 422);

  const tipoFalso = await pedir("POST", "/solicitudes", {
    cuerpo: { tipo: "spam", contacto: "alguien@example.com" },
  });
  assert.equal(tipoFalso.status, 422);

  const nada = await pedir("POST", "/solicitudes", { cuerpo: {} });
  assert.equal(nada.status, 422);
});

test("POST /solicitudes limita los envíos repetidos de un mismo contacto", async () => {
  const contacto = "+584149990011";

  for (let intento = 0; intento < 3; intento += 1) {
    const respuesta = await pedir("POST", "/solicitudes", {
      cuerpo: { tipo: "cobertura", contacto, mensaje: `Intento ${intento + 1}` },
    });
    assert.equal(respuesta.status, 201, JSON.stringify(respuesta.cuerpo));
  }

  const bloqueado = await pedir("POST", "/solicitudes", {
    cuerpo: { tipo: "cobertura", contacto },
  });
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.cuerpo.error, "demasiados_intentos");
  assert.ok(bloqueado.cuerpo.detalles.retry_after > 0);
  assert.ok(bloqueado.headers.get("retry-after"));
});

test("un cliente sin rol admin no ve la bandeja de solicitudes", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const vedado = await pedir("GET", "/admin/solicitudes", { token: cliente.access_token });
  assert.equal(vedado.status, 403);
  assert.equal(vedado.cuerpo.error, "solo_admin");
});

test("POST /negocios propone una ficha que solo se ve cuando operaciones la publica", async () => {
  const propuesta = await pedir("POST", "/negocios", {
    cuerpo: {
      nombre: "Taller El Guaire",
      categoria: "talleres",
      ciudad: "Caracas",
      zona: "Valles del Tuy",
      direccion: "Av. Principal, local 3",
      horario: "Lun a sáb 8am-6pm",
      oferta: "Afinación de motor con repuestos originales",
      descripcion: "Taller familiar con doce años en la zona.",
      sitio: "https://instagram.com/el-guaire",
      contacto: "+584149990020",
      telefono_publico: "+584149990020",
    },
  });
  assert.equal(propuesta.status, 201, JSON.stringify(propuesta.cuerpo));
  assert.equal(propuesta.cuerpo.estado, "pendiente");
  assert.equal(propuesta.cuerpo.slug, "taller-el-guaire");
  const id = propuesta.cuerpo.id;

  const enBase = await sql(
    `select estado, verificado, publicada_en, usuario_id, categoria
       from public.negocios where id = $1`,
    [id],
  );
  assert.equal(enBase[0].estado, "pendiente");
  assert.equal(enBase[0].verificado, false);
  assert.equal(enBase[0].publicada_en, null);
  assert.equal(enBase[0].usuario_id, null);

  // Nada pendiente llega a la vitrina.
  const vitrina = await pedir("GET", "/negocios");
  assert.equal(vitrina.status, 200);
  assert.ok(!vitrina.cuerpo.negocios.some((negocio) => negocio.slug === "taller-el-guaire"));

  const detalle = await pedir("GET", "/negocios/taller-el-guaire");
  assert.equal(detalle.status, 404);
  assert.equal(detalle.cuerpo.error, "negocio_no_encontrado");

  const admin = await sesion("admin", ADMIN);

  const cola = await pedir("GET", "/admin/negocios?estado=pendiente", { token: admin.access_token });
  assert.equal(cola.status, 200);
  assert.ok(cola.cuerpo.negocios.some((negocio) => negocio.id === id));

  // Sin motivo no hay rechazo.
  const rechazoCorto = await pedir("POST", `/admin/negocios/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "rechazado" },
  });
  assert.equal(rechazoCorto.status, 422);

  const devuelta = await pedir("POST", `/admin/negocios/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "rechazado", motivo: "Falta la dirección exacta" },
  });
  assert.equal(devuelta.status, 200, JSON.stringify(devuelta.cuerpo));
  assert.equal(devuelta.cuerpo.negocio.motivo_rechazo, "Falta la dirección exacta");

  const publicada = await pedir("POST", `/admin/negocios/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "publicado", verificado: true, nota: "Llamamos al dueño, todo ok" },
  });
  assert.equal(publicada.status, 200, JSON.stringify(publicada.cuerpo));
  assert.equal(publicada.cuerpo.negocio.estado, "publicado");
  assert.equal(publicada.cuerpo.negocio.verificado, true);
  assert.ok(publicada.cuerpo.negocio.publicada_en, "no quedó la fecha de publicación");

  const trasPublicar = await pedir("GET", "/negocios?categoria=talleres&ciudad=caracas");
  assert.equal(trasPublicar.status, 200);
  const enVitrina = trasPublicar.cuerpo.negocios.find((negocio) => negocio.slug === "taller-el-guaire");
  assert.ok(enVitrina, "la ficha publicada no aparece en la vitrina");
  assert.equal(enVitrina.verificado, true);
  assert.equal(enVitrina.telefono_publico, "+584149990020");
  // El contacto privado del dueño y las notas internas nunca salen de la vitrina.
  assert.equal(enVitrina.contacto, undefined);
  assert.equal(enVitrina.nota_admin, undefined);
  assert.equal(enVitrina.motivo_rechazo, undefined);
  assert.equal(trasPublicar.cuerpo.categorias.talleres >= 1, true);

  const ficha = await pedir("GET", "/negocios/taller-el-guaire");
  assert.equal(ficha.status, 200);
  assert.equal(ficha.cuerpo.negocio.oferta, "Afinación de motor con repuestos originales");

  const archivada = await pedir("POST", `/admin/negocios/${id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "archivado" },
  });
  assert.equal(archivada.status, 200);
  assert.equal(archivada.cuerpo.negocio.publicada_en, null);

  const despuesDeArchivar = await pedir("GET", "/negocios");
  assert.ok(!despuesDeArchivar.cuerpo.negocios.some((negocio) => negocio.slug === "taller-el-guaire"));

  const inexistente = await pedir("POST", `/admin/negocios/${crypto.randomUUID()}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "publicado" },
  });
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.cuerpo.error, "negocio_no_encontrado");
});

test("POST /negocios deja el nombre repetido en un slug distinto", async () => {
  const primera = await pedir("POST", "/negocios", {
    cuerpo: {
      nombre: "Repuestos Central",
      categoria: "repuestos",
      ciudad: "Valencia",
      contacto: "central1@example.com",
    },
  });
  assert.equal(primera.status, 201, JSON.stringify(primera.cuerpo));

  const segunda = await pedir("POST", "/negocios", {
    cuerpo: {
      nombre: "Repuestos Central",
      categoria: "repuestos",
      ciudad: "Maracay",
      contacto: "central2@example.com",
    },
  });
  assert.equal(segunda.status, 201, JSON.stringify(segunda.cuerpo));
  assert.equal(segunda.cuerpo.slug, "repuestos-central-2");
});

test("POST /negocios valida la propuesta pública", async () => {
  const sinNombre = await pedir("POST", "/negocios", {
    cuerpo: { categoria: "talleres", ciudad: "Caracas", contacto: "taller@example.com" },
  });
  assert.equal(sinNombre.status, 422);
  assert.equal(sinNombre.cuerpo.error, "datos_invalidos");

  const categoriaFalsa = await pedir("POST", "/negocios", {
    cuerpo: { nombre: "Gomería Rapida", categoria: "lavados", ciudad: "Caracas", contacto: "+584149990021" },
  });
  assert.equal(categoriaFalsa.status, 422);

  const sitioMalo = await pedir("POST", "/negocios", {
    cuerpo: {
      nombre: "Gomería Rápida",
      categoria: "cauchos",
      ciudad: "Caracas",
      contacto: "+584149990021",
      sitio: "instagram.com/gomeria",
    },
  });
  assert.equal(sitioMalo.status, 422);

  const admin = await sesion("admin", ADMIN);
  const estadoFalso = await pedir("POST", `/admin/negocios/${crypto.randomUUID()}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "borrador" },
  });
  assert.equal(estadoFalso.status, 422);
});

test("POST /negocios limita las propuestas repetidas de un mismo contacto", async () => {
  const contacto = "dueno-repetido@example.com";

  const primera = await pedir("POST", "/negocios", {
    cuerpo: { nombre: "Cauchos Norte", categoria: "cauchos", ciudad: "Barquisimeto", contacto },
  });
  assert.equal(primera.status, 201, JSON.stringify(primera.cuerpo));

  const segunda = await pedir("POST", "/negocios", {
    cuerpo: { nombre: "Cauchos Sur", categoria: "cauchos", ciudad: "Barquisimeto", contacto },
  });
  assert.equal(segunda.status, 201, JSON.stringify(segunda.cuerpo));

  const bloqueado = await pedir("POST", "/negocios", {
    cuerpo: { nombre: "Cauchos Este", categoria: "cauchos", ciudad: "Barquisimeto", contacto },
  });
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.cuerpo.error, "demasiados_intentos");
  assert.ok(bloqueado.headers.get("retry-after"));
});

test("un cliente sin rol admin no gestiona la cola de negocios", async () => {
  const cliente = await sesion("cliente", CLIENTE);

  const lista = await pedir("GET", "/admin/negocios", { token: cliente.access_token });
  assert.equal(lista.status, 403);
  assert.equal(lista.cuerpo.error, "solo_admin");

  const movimiento = await pedir("POST", `/admin/negocios/${crypto.randomUUID()}/estado`, {
    token: cliente.access_token,
    cuerpo: { estado: "publicado" },
  });
  assert.equal(movimiento.status, 403);
});

test("la vitrina busca por texto y respeta el límite", async () => {
  const propuesta = await pedir("POST", "/negocios", {
    cuerpo: {
      nombre: "Lubricantes Rapidos Barinas",
      categoria: "lubricantes",
      ciudad: "Barinas",
      oferta: "Cambio de aceite en 20 minutos",
      contacto: "+584149990022",
    },
  });
  assert.equal(propuesta.status, 201, JSON.stringify(propuesta.cuerpo));

  const admin = await sesion("admin", ADMIN);
  const publicada = await pedir("POST", `/admin/negocios/${propuesta.cuerpo.id}/estado`, {
    token: admin.access_token,
    cuerpo: { estado: "publicado" },
  });
  assert.equal(publicada.status, 200, JSON.stringify(publicada.cuerpo));

  const porTexto = await pedir("GET", "/negocios?q=cambio%20de%20aceite");
  assert.equal(porTexto.status, 200);
  assert.ok(porTexto.cuerpo.negocios.some((negocio) => negocio.slug === "lubricantes-rapidos-barinas"));

  const limite = await pedir("GET", "/negocios?limite=1");
  assert.equal(limite.status, 200);
  assert.equal(limite.cuerpo.negocios.length, 1);
  assert.ok(limite.cuerpo.total >= 1);

  const limiteFalso = await pedir("GET", "/negocios?limite=0");
  assert.equal(limiteFalso.status, 422);

  const categoriaFalsa = await pedir("GET", "/negocios?categoria=noexiste");
  assert.equal(categoriaFalsa.status, 422);
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

test("los viajes programados se guardan, respetan su dueño y se pueden cancelar", async () => {
  const cliente = await sesion("cliente", CLIENTE);
  const otroCliente = await sesion("admin", ADMIN);
  const programadoPara = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const cuerpo = {
    origen: "Plaza Bolívar de Maracay",
    destino: "Terminal Central",
    origen_lat: 10.248,
    origen_lng: -67.6,
    destino_lat: 10.2425,
    destino_lng: -67.595,
    servicio: "taxi-pana",
    programado_para: programadoPara,
    distancia_km: 2.4,
    precio_usd: 4.25,
    metodo_pago: "efectivo",
  };

  const noAutenticado = await pedir("GET", "/scheduled-rides");
  assert.equal(noAutenticado.status, 401);

  const creacion = await pedir("POST", "/scheduled-rides", {
    token: cliente.access_token,
    cuerpo,
  });
  assert.equal(creacion.status, 201);
  const viaje = creacion.cuerpo.viaje_programado;
  assert.equal(viaje.estado, "programado");
  assert.equal(viaje.servicio, "taxi-pana");
  assert.equal(viaje.origen_lat, 10.248);
  assert.equal(viaje.destino_lng, -67.595);
  assert.equal(viaje.precio_usd, 4.25);
  assert.equal(viaje.cancelado_en, null);

  const listado = await pedir("GET", "/scheduled-rides", { token: cliente.access_token });
  assert.deepEqual(listado.cuerpo.viajes_programados.map((item) => item.id), [viaje.id]);

  const detallePropio = await pedir("GET", `/scheduled-rides/${viaje.id}`, {
    token: cliente.access_token,
  });
  assert.equal(detallePropio.status, 200);
  assert.equal(detallePropio.cuerpo.viaje_programado.id, viaje.id);

  const detalleAjeno = await pedir("GET", `/scheduled-rides/${viaje.id}`, {
    token: otroCliente.access_token,
  });
  assert.equal(detalleAjeno.status, 404);

  const fechaPasada = await pedir("POST", "/scheduled-rides", {
    token: cliente.access_token,
    cuerpo: { ...cuerpo, programado_para: new Date(Date.now() - 60_000).toISOString() },
  });
  assert.equal(fechaPasada.status, 422);

  const coordenadaIncompleta = await pedir("POST", "/scheduled-rides", {
    token: cliente.access_token,
    cuerpo: { ...cuerpo, origen_lng: undefined },
  });
  assert.equal(coordenadaIncompleta.status, 422);

  const cancelacion = await pedir("POST", `/scheduled-rides/${viaje.id}/cancel`, {
    token: cliente.access_token,
  });
  assert.equal(cancelacion.status, 200);
  assert.equal(cancelacion.cuerpo.viaje_programado.estado, "cancelado");
  assert.ok(cancelacion.cuerpo.viaje_programado.cancelado_en);

  const cancelarDeNuevo = await pedir("POST", `/scheduled-rides/${viaje.id}/cancel`, {
    token: cliente.access_token,
  });
  assert.equal(cancelarDeNuevo.status, 409);

  const valorPersistido = await sql(
    "select estado, servicio from public.viajes_programados where id = $1",
    [viaje.id],
  );
  assert.deepEqual(valorPersistido, [{ estado: "cancelado", servicio: "taxi-pana" }]);
});

test("las direcciones y los conductores favoritos solo se gestionan por su pasajero", async () => {
  const cliente = await sesion("cliente-favoritos", CLIENTE);
  const admin = await sesion("admin-favoritos", ADMIN);

  const direccion = await pedir("POST", "/api/favoritos/direcciones", {
    token: cliente.access_token,
    cuerpo: { etiqueta: "Casa", direccion_texto: "Av. Bolívar, Maracay", lat: 10.25, lng: -67.58 },
  });
  assert.equal(direccion.status, 201);
  const direccionId = direccion.cuerpo.direccion.id;

  const actualizada = await pedir("POST", "/api/favoritos/direcciones", {
    token: cliente.access_token,
    cuerpo: { etiqueta: "casa", direccion_texto: "Av. Bolívar Este, Maracay", lat: 10.26, lng: -67.59 },
  });
  assert.equal(actualizada.status, 201);
  assert.equal(actualizada.cuerpo.direccion.id, direccionId);
  assert.equal(actualizada.cuerpo.direccion.direccion_texto, "Av. Bolívar Este, Maracay");

  const direcciones = await pedir("GET", "/api/favoritos/direcciones", { token: cliente.access_token });
  assert.equal(direcciones.cuerpo.direcciones.length, 1);
  assert.equal(direcciones.cuerpo.direcciones[0].etiqueta, "casa");

  const favorito = await pedir("POST", "/api/favoritos/conductores", {
    token: cliente.access_token,
    cuerpo: { conductor_id: PILOTO.id },
  });
  assert.equal(favorito.status, 201);

  const conductores = await pedir("GET", "/api/favoritos/conductores", { token: cliente.access_token });
  assert.deepEqual(conductores.cuerpo.conductores.map((item) => item.conductor_id), [PILOTO.id]);
  assert.equal(conductores.cuerpo.conductores[0].nombre, "Carlos Conductor");

  const favoritosAjeno = await pedir("GET", "/api/favoritos/conductores", { token: admin.access_token });
  assert.deepEqual(favoritosAjeno.cuerpo.conductores, []);

  const direccionAjena = await pedir("DELETE", `/api/favoritos/direcciones/${direccionId}`, {
    token: admin.access_token,
  });
  assert.equal(direccionAjena.status, 404);

  const conductorBorrado = await pedir("DELETE", `/api/favoritos/conductores/${PILOTO.id}`, {
    token: cliente.access_token,
  });
  assert.equal(conductorBorrado.status, 200);

  const direccionBorrada = await pedir("DELETE", `/api/favoritos/direcciones/${direccionId}`, {
    token: cliente.access_token,
  });
  assert.equal(direccionBorrada.status, 200);
});

test("el referido bonifica una sola vez $5 al anfitrión y al invitado en la primera carrera", async () => {
  const anfitrion = await sesion("anfitrion-referido", { telefono: "+584149999990" });
  const invitadoCuenta = { telefono: "+584149999991" };
  const invitado = await sesion("invitado-referido", invitadoCuenta);
  const piloto = await sesion("piloto-referido", PILOTO);

  const resumenAntes = await pedir("GET", "/api/referidos", { token: anfitrion.access_token });
  assert.equal(resumenAntes.status, 200);
  assert.match(resumenAntes.cuerpo.resumen.codigo_referido, /^LLEGATE-[0-9A-F]{32}$/);

  const autoReferido = await pedir("POST", "/api/referidos/aplicar", {
    token: anfitrion.access_token,
    cuerpo: { codigo_referido: resumenAntes.cuerpo.resumen.codigo_referido },
  });
  assert.equal(autoReferido.status, 400);

  const aplicado = await pedir("POST", "/api/referidos/aplicar", {
    token: invitado.access_token,
    cuerpo: { codigo_referido: resumenAntes.cuerpo.resumen.codigo_referido.toLowerCase() },
  });
  assert.equal(aplicado.status, 201, JSON.stringify(aplicado.cuerpo));
  assert.equal(aplicado.cuerpo.estado, "pendiente");

  const repetido = await pedir("POST", "/api/referidos/aplicar", {
    token: invitado.access_token,
    cuerpo: { codigo_referido: resumenAntes.cuerpo.resumen.codigo_referido },
  });
  assert.equal(repetido.status, 400);

  const saldoAntes = await sql(
    "select id, saldo_billetera from public.usuarios where id = any($1::uuid[]) order by id",
    [[anfitrion.usuario.id, invitado.usuario.id]],
  );
  const viajeCreado = await pedir("POST", "/trips", {
    token: invitado.access_token,
    cuerpo: { origen: "Plaza Bolívar", destino: "Terminal Central", precio_usd: 5, metodo_pago: "efectivo" },
  });
  assert.equal(viajeCreado.status, 201);
  const viajeId = viajeCreado.cuerpo.viaje.id;

  const aceptado = await pedir("POST", `/trips/${viajeId}/aceptar`, { token: piloto.access_token });
  assert.equal(aceptado.status, 200);
  const iniciado = await pedir("POST", `/trips/${viajeId}/iniciar`, { token: piloto.access_token });
  assert.equal(iniciado.status, 200);
  const finalizado = await pedir("POST", `/trips/${viajeId}/finalizar`, { token: piloto.access_token });
  assert.equal(finalizado.status, 200, JSON.stringify(finalizado.cuerpo));

  const saldoDespues = await sql(
    "select id, saldo_billetera from public.usuarios where id = any($1::uuid[]) order by id",
    [[anfitrion.usuario.id, invitado.usuario.id]],
  );
  assert.deepEqual(
    saldoDespues.map((fila, index) => Number(fila.saldo_billetera) - Number(saldoAntes[index].saldo_billetera)),
    [5, 5],
  );

  const bonos = await sql(
    `select usuario_id, monto_usd, referido_id
       from public.transacciones_billetera
      where referido_id = $1
      order by usuario_id`,
    [aplicado.cuerpo.referido_id],
  );
  assert.equal(bonos.length, 2);
  assert.deepEqual(bonos.map((bono) => Number(bono.monto_usd)), [5, 5]);

  const resumenDespues = await pedir("GET", "/api/referidos", { token: anfitrion.access_token });
  assert.equal(resumenDespues.cuerpo.resumen.invitados, 1);
  assert.equal(resumenDespues.cuerpo.resumen.invitados_bonificados, 1);
  assert.equal(Number(resumenDespues.cuerpo.resumen.bono_acumulado_usd), 5);
});
