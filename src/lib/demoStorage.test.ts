import { describe, expect, it } from "vitest";
import { clearDraft, loadDraft, sanitizeDemoPayload, saveDemoLead, saveDraft } from "./demoStorage";

describe("sanitizeDemoPayload", () => {
  it("elimina claves sensibles y valores que parecen teléfonos", () => {
    const clean = sanitizeDemoPayload({
      name: "María",
      email: "maria@ejemplo.com",
      password: "secreto",
      cedula: "V-12345678",
      telefono: "0414 1234567",
      contact: "0414 1234567",
      city: "Caracas",
    });

    expect(clean).toEqual({
      name: "María",
      email: "maria@ejemplo.com",
      city: "Caracas",
    });
  });

  it("limpia objetos anidados", () => {
    const clean = sanitizeDemoPayload({
      plan: { id: "pro", phone: "04141234567", note: "0414 1234567" },
    });

    expect(clean).toEqual({ plan: { id: "pro" } });
  });
});

describe("demo storage", () => {
  it("guarda leads saneados y conserva el correo", () => {
    saveDemoLead("llegate_sim_test", {
      name: "María",
      contact: "maria@ejemplo.com",
      phone: "04141234567",
    });

    const stored = JSON.parse(localStorage.getItem("llegate_sim_test") ?? "[]") as Record<string, unknown>[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: "María", contact: "maria@ejemplo.com" });
    expect(JSON.stringify(stored)).not.toContain("04141234567");
  });

  it("guarda como máximo 25 entradas", () => {
    for (let i = 0; i < 30; i += 1) saveDemoLead("llegate_sim_cap", { index: i });
    const stored = JSON.parse(localStorage.getItem("llegate_sim_cap") ?? "[]") as Record<string, unknown>[];
    expect(stored).toHaveLength(25);
    expect(stored[24]).toMatchObject({ index: 29 });
  });

  it("guarda, recupera y borra borradores sin datos sensibles", () => {
    saveDraft("test", { name: "María", phone: "04141234567", plan: "comision" });

    expect(loadDraft("test")).toEqual({ name: "María", plan: "comision" });

    clearDraft("test");
    expect(loadDraft("test")).toBeNull();
  });

  it("devuelve null si el borrador está corrupto", () => {
    localStorage.setItem("llegate_sim_draft:roto", "{no es json");
    expect(loadDraft("roto")).toBeNull();
  });
});
