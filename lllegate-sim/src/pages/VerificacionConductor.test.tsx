import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerificacionConductorPage } from "./VerificacionConductor";
import * as api from "../lib/api";

vi.mock("../lib/api", () => {
  class ApiError extends Error {
    code: string;
    status: number;

    constructor(code: string, status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.status = status;
    }
  }

  return {
    ApiError,
    realAuthEnabled: true,
    loadSession: vi.fn(),
    getCuenta: vi.fn(),
    getDriverVerification: vi.fn(),
    saveDriverDetails: vi.fn(),
    uploadDriverDocument: vi.fn(),
    submitDriverVerification: vi.fn(),
    verificationErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Error de verificación"),
  };
});

const SESION: api.Session = {
  access_token: "token-de-prueba",
  refresh_token: "refresh-de-prueba",
  expires_at: Date.now() + 3_600_000,
};

const CUENTA: api.Cuenta = {
  usuario: {
    id: "piloto-1",
    rol: "conductor",
    nombre: "Ana Cliente",
    telefono: "+584141234567",
    telefonoVerificado: true,
    email: null,
    whatsapp: null,
    estado: "Carabobo",
    ciudad: "Valencia",
    saldoBilletera: 2,
  },
  conductor: null,
  capacidades: { puedePedirViajes: true, puedeConducir: false },
};

const TIPOS: api.TipoDocumentoConductor[] = ["cedula_frente", "cedula_reverso", "licencia", "certificado_medico"];

const VERIFICACION: api.MiVerificacion = {
  conductor: {
    cedula: "V12345678",
    tipoVehiculo: "moto",
    placa: "AB123CD",
    marca: "Bera",
    modelo: "SBR",
    anio: 2021,
    verificacion: "pendiente",
    estado: "inactivo_sin_saldo",
    motivoRechazo: null,
    riesgoPuntaje: 65,
    riesgoMotivos: [
      { codigo: "cedula_no_coincide", peso: 40, detalle: "La cédula no coincide con el nombre declarado." },
    ],
    enviadoEn: "2026-10-31T15:00:00.000Z",
    intentosVerificacion: 1,
  },
  documentos: TIPOS.map((tipo) => ({
    tipo,
    mime: "image/png",
    bytes: 1024,
    ocrEstado: "no_configurado" as const,
    ocrConfianza: null,
    createdAt: "2026-10-31T14:00:00.000Z",
    updatedAt: "2026-10-31T14:00:00.000Z",
  })),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <VerificacionConductorPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.loadSession).mockReturnValue(SESION);
  vi.mocked(api.getCuenta).mockResolvedValue(CUENTA);
  vi.mocked(api.getDriverVerification).mockResolvedValue(VERIFICACION);
  vi.mocked(api.submitDriverVerification).mockResolvedValue({
    ok: true,
    verificacion: "pendiente",
    riesgoPuntaje: 65,
    riesgoNivel: "alto",
    motivos: VERIFICACION.conductor.riesgoMotivos,
    documentos: 4,
    enviadoEn: "2026-10-31T16:00:00.000Z",
  });
});

describe("VerificacionConductor", () => {
  it("pide ingresar cuando no hay sesión", async () => {
    vi.mocked(api.loadSession).mockReturnValue(null);
    renderPage();

    expect(await screen.findByText("Entra para verificar tu cuenta")).toBeInTheDocument();
    expect(api.getDriverVerification).not.toHaveBeenCalled();
  });

  it("pide los datos del vehículo si la cuenta aún no está registrada como piloto", async () => {
    vi.mocked(api.getDriverVerification).mockRejectedValue(
      new api.ApiError("conductor_no_registrado", 404, "Conductor no registrado"),
    );
    renderPage();

    expect(await screen.findByRole("heading", { name: "Datos del vehículo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cédula")).toBeInTheDocument();
    expect(screen.getByLabelText("Placa")).toBeInTheDocument();
  });

  it("muestra el riesgo y reenvía la verificación al tener los cuatro documentos", async () => {
    renderPage();

    expect((await screen.findAllByText("Ana Cliente")).length).toBeGreaterThan(0);
    expect(screen.getByText("La cédula no coincide con el nombre declarado.")).toBeInTheDocument();
    expect(screen.getByText("Riesgo alto")).toBeInTheDocument();
    expect(screen.getByText("4/4 cargados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reenviar a revisión/i }));

    await waitFor(() => expect(api.submitDriverVerification).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/verificación enviada/i)).toBeInTheDocument();
  });
});
