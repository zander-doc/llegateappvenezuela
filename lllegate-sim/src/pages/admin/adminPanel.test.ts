import { describe, expect, it } from "vitest";
import { seccionesVisibles } from "./AdminLayout";
import { pendientesVisibles } from "./AdminResumen";

describe("panel de administración", () => {
  it("operaciones ve documentos pero no cobros ni personal", () => {
    const rutas = seccionesVisibles(["documentos", "negocios"]).map((s) => s.to);
    expect(rutas).toContain("/admin/verificacion");
    expect(rutas).not.toContain("/admin/cobros");
    expect(rutas).not.toContain("/admin/personal");
  });

  it("finanzas ve cobros y siempre el resumen", () => {
    const rutas = seccionesVisibles(["dinero"]).map((s) => s.to);
    expect(rutas).toEqual(["/admin", "/admin/cobros"]);
  });

  it("solo lista pendientes que el servidor entregó", () => {
    expect(pendientesVisibles({ pilotos: 4 })).toEqual([
      { n: 4, texto: "pilotos por revisar", to: "/admin/verificacion" },
    ]);
    expect(pendientesVisibles({})).toEqual([]);
  });
});
