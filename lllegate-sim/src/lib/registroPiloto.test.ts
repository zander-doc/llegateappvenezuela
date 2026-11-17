import { describe, expect, it } from "vitest";
import { pasosRegistro, type EntradaRegistro } from "./registroPiloto";

const BASE: EntradaRegistro = {
  conSesion: true,
  conVehiculo: false,
  documentosCargados: 0,
  enviadoEn: null,
  verificacion: null,
};

describe("pasosRegistro", () => {
  it("sin sesión el paso actual es la cuenta", () => {
    const { pasos, actual } = pasosRegistro({ ...BASE, conSesion: false });
    expect(actual).toBe(0);
    expect(pasos[0].estado).toBe("actual");
  });

  it("con cuenta y sin vehículo pide los datos del vehículo", () => {
    const { pasos, actual } = pasosRegistro(BASE);
    expect(actual).toBe(1);
    expect(pasos.map((p) => p.estado)).toEqual(["hecho", "actual", "pendiente", "pendiente"]);
  });

  it("con vehículo y documentos incompletos cuenta cuántos faltan", () => {
    const { pasos, actual } = pasosRegistro({ ...BASE, conVehiculo: true, documentosCargados: 2, verificacion: "pendiente" });
    expect(actual).toBe(2);
    expect(pasos[2].nota).toBe("2 de 4");
  });

  it("con todo cargado y sin enviar queda listo para enviar", () => {
    const { pasos, actual } = pasosRegistro({ ...BASE, conVehiculo: true, documentosCargados: 4, verificacion: "pendiente" });
    expect(actual).toBe(3);
    expect(pasos[3].nota).toBe("Listo para enviar");
  });

  it("enviado queda en revisión, rechazado en correcciones y aprobado completa todo", () => {
    const enviado = { ...BASE, conVehiculo: true, documentosCargados: 4, enviadoEn: "2026-11-17T10:00:00Z" };
    expect(pasosRegistro({ ...enviado, verificacion: "pendiente" }).pasos[3].nota).toBe("En revisión");
    expect(pasosRegistro({ ...enviado, verificacion: "rechazado" }).pasos[3].nota).toBe("Correcciones");
    const aprobado = pasosRegistro({ ...enviado, verificacion: "aprobado" });
    expect(aprobado.pasos.every((p) => p.estado === "hecho")).toBe(true);
    expect(aprobado.actual).toBe(3);
  });
});
