import { describe, expect, it } from "vitest";
import { DEMO_BCV_RATE, estimateFare, estimateTripFare, formatBs, formatKm, formatRate, formatUSD } from "./format";

describe("formatUSD", () => {
  it("formatea con dos decimales y coma decimal", () => {
    expect(formatUSD(6.2)).toBe("$6,20");
    expect(formatUSD(0)).toBe("$0,00");
  });
});

describe("formatBs", () => {
  it("convierte con la tasa de demostración", () => {
    expect(formatBs(1)).toBe("Bs. 887");
    expect(formatBs(0)).toBe("Bs. 0");
  });

  it("acepta una tasa explícita", () => {
    expect(formatBs(10, 100)).toBe("Bs. 1.000");
  });
});

describe("formatRate", () => {
  it("muestra la tasa con dos decimales", () => {
    expect(formatRate()).toBe("887,30");
    expect(DEMO_BCV_RATE).toBe(887.3);
  });
});

describe("estimateFare", () => {
  it("suma base, kilómetros y minutos", () => {
    expect(estimateFare(2, 0.5, 2.5)).toBe(3.25);
    expect(estimateFare(2, 0.5, 2.5, 10)).toBe(3.65);
  });

  it("redondea a dos decimales", () => {
    expect(estimateFare(1.111, 0.222, 3)).toBe(1.78);
  });
});

describe("estimateTripFare", () => {
  it("nunca baja de la tarifa mínima", () => {
    const fare = estimateTripFare(3, 0.5, 0);
    expect(fare.totalUSD).toBe(3);
    expect(fare.distanceUSD).toBe(0);
  });

  it("suma el regreso en ida y vuelta sin duplicar la mínima", () => {
    const fare = estimateTripFare(1, 0.3, 5, { roundTrip: true });
    expect(fare.distanceKm).toBe(10);
    expect(fare.distanceUSD).toBe(3);
    expect(fare.totalUSD).toBe(4);
  });

  it("mantiene la distancia simple cuando es solo ida", () => {
    const fare = estimateTripFare(1, 0.3, 5);
    expect(fare.distanceKm).toBe(5);
    expect(fare.totalUSD).toBe(2.5);
  });
});

describe("formatKm", () => {
  it("usa coma decimal y sufijo km", () => {
    expect(formatKm(2.5)).toBe("2,5 km");
    expect(formatKm(10)).toBe("10 km");
  });
});
