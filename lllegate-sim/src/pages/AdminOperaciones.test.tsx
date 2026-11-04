import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOperacionesPage } from "./AdminOperaciones";
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
    listDriversForReview: vi.fn(),
    getDriverReview: vi.fn(),
    verifyDriver: vi.fn(),
    verificationErrorMessage: () => "No pudimos completar la verificación.",
  };
});

const SESION: api.Session = {
  access_token: "token-de-prueba",
  refresh_token: "refresh-de-prueba",
  expires_at: Date.now() + 3_600_000,
};

const ADMIN: api.Cuenta = {
  usuario: {
    id: "admin-1",
    rol: "admin",
    nombre: "Operadora Llégate",
    telefono: "+584140000000",
    telefonoVerificado: true,
    email: null,
    whatsapp: null,
    saldoBilletera: 0,
  },
  conductor: null,
  capacidades: { puedePedirViajes: true, puedeConducir: false },
};

const CLIENTE: api.Cuenta = {
  ...ADMIN,
  usuario: { ...ADMIN.usuario, id: "cliente-1", rol: "cliente", nombre: "Carlos Pasajero" },
};

const COLA: api.ConductorEnCola = {
  usuarioId: "piloto-1",
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
  verificadoPor: null,
  verificadoEn: null,
  createdAt: "2026-10-30T10:00:00.000Z",
  usuario: {
    id: "piloto-1",
    nombre: "Ana Cliente",
    telefono: "+584141234567",
    whatsapp: null,
    email: null,
    telefonoVerificado: true,
    createdAt: "2026-10-30T09:00:00.000Z",
  },
  documentos: [
    {
      tipo: "cedula_frente",
      mime: "image/png",
      bytes: 1024,
      ocrEstado: "no_configurado",
      ocrConfianza: null,
      createdAt: "2026-10-31T14:00:00.000Z",
      updatedAt: "2026-10-31T14:00:00.000Z",
    },
  ],
};

const CONDUCTOR_REVISION: api.ConductorRevision = { ...COLA };

const REVISION: api.RevisionConductor = {
  conductor: CONDUCTOR_REVISION,
  usuario: COLA.usuario,
  documentos: [
    {
      ...COLA.documentos[0],
      url: "https://example.com/firmado.png",
      hashSha256: "a".repeat(64),
      ocrTexto: "V-12345678 ANA CLIENTE",
      ocrDatos: { proveedor: "ocrspace" },
    },
  ],
  eventos: [
    {
      id: 1,
      tipo: "verificacion_enviada",
      severidad: "alerta",
      detalle: { riesgo_puntaje: 65 },
      createdAt: "2026-10-31T15:00:00.000Z",
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminOperacionesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.loadSession).mockReturnValue(SESION);
  vi.mocked(api.getCuenta).mockResolvedValue(ADMIN);
  vi.mocked(api.listDriversForReview).mockResolvedValue([COLA]);
  vi.mocked(api.getDriverReview).mockResolvedValue(REVISION);
  vi.mocked(api.verifyDriver).mockResolvedValue({ ok: true, verificacion: "rechazado", motivoRechazo: "Documento ilegible" });
});

describe("AdminOperaciones", () => {
  it("pide ingresar cuando no hay sesión", async () => {
    vi.mocked(api.loadSession).mockReturnValue(null);
    renderPage();

    expect(await screen.findByText("Entra con una cuenta de operaciones")).toBeInTheDocument();
    expect(api.listDriversForReview).not.toHaveBeenCalled();
  });

  it("bloquea a las cuentas que no son administrador", async () => {
    vi.mocked(api.getCuenta).mockResolvedValue(CLIENTE);
    renderPage();

    expect(await screen.findByText("Esta sección es de operaciones.")).toBeInTheDocument();
    expect(api.listDriversForReview).not.toHaveBeenCalled();
  });

  it("muestra la cola y el expediente con riesgo y documentos", async () => {
    renderPage();

    expect((await screen.findAllByText("Ana Cliente")).length).toBeGreaterThan(0);
    expect(api.listDriversForReview).toHaveBeenCalledWith("pendiente");
    expect(await screen.findByText("La cédula no coincide con el nombre declarado.")).toBeInTheDocument();
    expect(screen.getAllByText("Riesgo alto · 65").length).toBeGreaterThan(0);
    expect(screen.getByText("V-12345678 ANA CLIENTE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir documento/i })).toHaveAttribute(
      "href",
      "https://example.com/firmado.png",
    );
  });

  it("exige un motivo antes de rechazar y lo envía a la API", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /rechazar con motivo/i }));
    const confirmar = screen.getByRole("button", { name: /confirmar rechazo/i });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Motivo del rechazo"), {
      target: { value: "La licencia no coincide con la cédula." },
    });
    fireEvent.click(confirmar);

    await waitFor(() =>
      expect(api.verifyDriver).toHaveBeenCalledWith("piloto-1", {
        aprobado: false,
        motivo: "La licencia no coincide con la cédula.",
      }),
    );
  });

  it("aprueba al piloto solo después de confirmar", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /aprobar piloto/i }));
    expect(api.verifyDriver).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirmar aprobación/i }));

    await waitFor(() => expect(api.verifyDriver).toHaveBeenCalledWith("piloto-1", { aprobado: true, motivo: undefined }));
  });
});
