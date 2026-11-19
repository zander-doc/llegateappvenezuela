import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PanelRol } from "./PanelRol";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  getPilotosFavoritos: vi.fn(),
  getCodigoReferido: vi.fn(),
}));

vi.mock("./RealWallet", () => ({
  RealWallet: () => <div>Billetera real</div>,
}));

function cuentaDe(extra: Partial<api.Cuenta> = {}, puedeConducir = false): api.Cuenta {
  return {
    usuario: { nombre: "Ana" },
    conductor: null,
    capacidades: { puedePedirViajes: true, puedeConducir },
    ...extra,
  } as unknown as api.Cuenta;
}

function renderPanel(cuenta: api.Cuenta) {
  return render(
    <MemoryRouter>
      <PanelRol cuenta={cuenta} onCuentaActualizada={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getPilotosFavoritos).mockResolvedValue([
    { id: "p1", nombre: "Luis Moto", tipoVehiculo: "moto", placa: "AB123CD" },
  ]);
  vi.mocked(api.getCodigoReferido).mockResolvedValue("ANA123");
});

describe("PanelRol", () => {
  it("el pasajero ve sus pilotos favoritos y su código para invitar, sin billetera", async () => {
    renderPanel(cuentaDe());

    expect(await screen.findByText("Luis Moto")).toBeInTheDocument();
    expect(await screen.findByText("ANA123")).toBeInTheDocument();
    expect(screen.queryByText("Billetera real")).not.toBeInTheDocument();
  });

  it("quien aún no es piloto ve cómo registrarse", () => {
    renderPanel(cuentaDe());

    fireEvent.click(screen.getByRole("tab", { name: "Piloto" }));
    expect(screen.getByRole("link", { name: /ser piloto/i })).toHaveAttribute("href", "/conductores/verificacion");
  });

  it("el piloto verificado abre en su pestaña y ve la billetera para recargar", () => {
    renderPanel(cuentaDe({}, true));

    expect(screen.getByRole("tab", { name: "Piloto", selected: true })).toBeInTheDocument();
    expect(screen.getByText("Billetera real")).toBeInTheDocument();
  });
});
