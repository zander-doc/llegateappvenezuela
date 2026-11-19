import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CuentaMenu } from "./CuentaMenu";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  SESSION_EVENT: "llegate:sesion",
  realAuthEnabled: true,
  loadSession: vi.fn(),
  getCuenta: vi.fn(),
  logout: vi.fn(),
}));

const CUENTA = {
  usuario: { nombre: "Zander Pérez", fotoUrl: null, etiquetaRol: "Pasajero" },
} as unknown as api.Cuenta;

function renderMenu() {
  return render(
    <MemoryRouter>
      <CuentaMenu variante="barra" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.logout).mockResolvedValue(undefined);
});

describe("CuentaMenu", () => {
  it("sin sesión ofrece ingresar", async () => {
    vi.mocked(api.loadSession).mockReturnValue(null);
    renderMenu();

    expect(await screen.findByRole("link", { name: /ingresar/i })).toBeInTheDocument();
    expect(api.getCuenta).not.toHaveBeenCalled();
  });

  it("con sesión muestra el nombre y permite cerrar sesión", async () => {
    vi.mocked(api.loadSession).mockReturnValue({ access_token: "t", refresh_token: "r", expires_at: 9999999999 });
    vi.mocked(api.getCuenta).mockResolvedValue(CUENTA);
    renderMenu();

    fireEvent.click(await screen.findByRole("button", { name: /zander/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /cerrar sesión/i }));

    expect(api.logout).toHaveBeenCalledTimes(1);
  });
});
