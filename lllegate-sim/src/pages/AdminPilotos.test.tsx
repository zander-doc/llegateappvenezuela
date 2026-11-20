import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPilotosPage } from "./AdminPilotos";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  realAuthEnabled: true,
  loadSession: vi.fn(),
  getCuenta: vi.fn(),
  getMetricasPilotos: vi.fn(),
}));

function cuentaDe(rol: string): api.Cuenta {
  return { usuario: { rol } } as unknown as api.Cuenta;
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminPilotosPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.loadSession).mockReturnValue({} as unknown as ReturnType<typeof api.loadSession>);
  vi.mocked(api.getMetricasPilotos).mockResolvedValue({
    meta: 90,
    aprobados: 60,
    pendientes: 4,
    conSaldo: 50,
    enLinea: 12,
    activos30d: 45,
    semanas: [
      { semana: "2026-11-09", aprobados: 3 },
      { semana: "2026-11-16", aprobados: 5 },
    ],
  });
});

describe("AdminPilotosPage", () => {
  it("el administrador ve el avance hacia los 90 pilotos activos", async () => {
    vi.mocked(api.getCuenta).mockResolvedValue(cuentaDe("admin"));
    renderPagina();

    expect(await screen.findByText("Faltan 45 pilotos activos para la meta.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText("Por revisar")).toBeInTheDocument();
  });

  it("quien no es administrador no ve las métricas", async () => {
    vi.mocked(api.getCuenta).mockResolvedValue(cuentaDe("cliente"));
    renderPagina();

    expect(await screen.findByText("Esta sección es de operaciones.")).toBeInTheDocument();
    expect(api.getMetricasPilotos).not.toHaveBeenCalled();
  });
});
