import { describe, expect, it } from "vitest";
import { PILOT_RULES, RECHARGE_PACKS } from "./prepaid";
import { SERVICES } from "./services";
import {
  APP_RECHARGE_PACKS,
  APP_SERVICES,
  APP_WALLET_RULES,
} from "../../server/src/appConfig.js";

// La app Android lee sus precios de GET /config/app, que sale de server/src/appConfig.js.
// La web usa estos datos TS. Si alguien cambia uno de los dos y olvida el otro, esta
// prueba falla antes de subir nada.
describe("config de la app vs datos de la web", () => {
  it("lista exactamente los mismos servicios, en el mismo orden", () => {
    expect(APP_SERVICES.map((s) => s.slug)).toEqual(SERVICES.map((s) => s.slug));
  });

  it("mantiene idéntico el texto y la tarifa de cada servicio", () => {
    SERVICES.forEach((web, i) => {
      const app = APP_SERVICES[i];
      expect(app, `servicio ${web.slug}`).toEqual({
        slug: web.slug,
        name: web.name,
        short: web.short,
        tagline: web.tagline,
        description: web.description,
        icon: web.icon,
        minFareUSD: web.minFareUSD,
        perKmUSD: web.perKmUSD,
        capacity: web.capacity,
        eta: web.eta,
        status: web.status,
        phase: web.phase ?? null,
      });
    });
  });

  it("usa las mismas reglas de prepago", () => {
    expect(APP_WALLET_RULES).toEqual({
      commissionRate: PILOT_RULES.commissionRate,
      minCommissionUSD: PILOT_RULES.minCommissionUSD,
      minBalanceUSD: PILOT_RULES.minBalanceUSD,
      lowBalanceUSD: PILOT_RULES.lowBalanceUSD,
      welcomeUSD: PILOT_RULES.welcomeUSD,
      minRechargeUSD: PILOT_RULES.minRechargeUSD,
      maxRechargeUSD: PILOT_RULES.maxRechargeUSD,
      approvalSlaMinutes: PILOT_RULES.approvalSlaMinutes,
    });
  });

  it("ofrece las mismas recargas sugeridas", () => {
    expect(APP_RECHARGE_PACKS).toEqual(
      RECHARGE_PACKS.map((pack) => ({
        amount: pack.amount,
        name: pack.name,
        note: pack.note,
        recommended: pack.recommended === true,
      })),
    );
  });
});
