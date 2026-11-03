import { describe, expect, it } from "vitest";
import { searchVenezuelaLocations, VENEZUELA_LOCATIONS } from "./locations";

describe("VENEZUELA_LOCATIONS", () => {
  it("cubre los 23 estados y el Distrito Capital", () => {
    expect(VENEZUELA_LOCATIONS).toHaveLength(24);
    expect(new Set(VENEZUELA_LOCATIONS.map((estado) => estado.id)).size).toBe(24);
  });

  it("cada estado trae al menos una ciudad con nombre", () => {
    for (const estado of VENEZUELA_LOCATIONS) {
      expect(estado.cities.length).toBeGreaterThan(0);
      for (const ciudad of estado.cities) {
        expect(ciudad.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("cada estado tiene ids y nombres distintos", () => {
    expect(new Set(VENEZUELA_LOCATIONS.map((estado) => estado.name)).size).toBe(24);
  });

  it("la búsqueda encuentra ciudades por nombre y por estado", () => {
    const porCiudad = searchVenezuelaLocations("maracaibo");
    expect(porCiudad.some((r) => r.city === "Maracaibo")).toBe(true);

    const porEstado = searchVenezuelaLocations("táchira");
    expect(porEstado.every((r) => r.state.includes("Táchira"))).toBe(true);
    expect(porEstado.length).toBeGreaterThan(0);
  });
});
