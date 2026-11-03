import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealAuth } from "./RealAuth";
import * as api from "../lib/api";

vi.mock("../lib/api", () => {
  class ApiError extends Error {
    code: string;
    status: number;
    detalles?: unknown;

    constructor(code: string, status: number, message: string, detalles?: unknown) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.status = status;
      this.detalles = detalles;
    }
  }

  return {
    ApiError,
    loadSession: vi.fn(),
    clearSession: vi.fn(),
    getCuenta: vi.fn(),
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
    logout: vi.fn(),
    getWallet: vi.fn(),
    getPaymentMethods: vi.fn(),
    listPayments: vi.fn(),
    createPaymentIntent: vi.fn(),
    reportPayment: vi.fn(),
    cancelPayment: vi.fn(),
    paymentErrorMessage: () => "No pudimos completar el pago.",
    maskPhone: (phone: string | null) => (phone ? `+58 ••• ${phone.slice(-4)}` : "—"),
  };
});

const CUENTA: api.Cuenta = {
  usuario: {
    id: "u1",
    rol: "cliente",
    nombre: "María Rodríguez",
    telefono: "+584141234567",
    telefonoVerificado: true,
    email: null,
    whatsapp: "+584141234567",
    saldoBilletera: 9.9,
  },
  conductor: null,
  capacidades: { puedePedirViajes: true, puedeConducir: false },
};

const BILLETERA: api.Billetera = {
  tipo: "pasajero",
  saldoUSD: 12.5,
  reservadoUSD: 0,
  disponibleUSD: 12.5,
  estado: "activo",
  limites: {
    comisionPorcentaje: 10,
    comisionMinimaUSD: 0.1,
    saldoMinimoUSD: 1,
    alertaSaldoBajoUSD: 2,
    recargaMinimaUSD: 5,
    recargaMaximaUSD: 50,
    slaAprobacionMinutos: 15,
    bienvenidaUSD: 2,
  },
};

function renderAuth(mode: "login" | "register" = "login") {
  return render(
    <MemoryRouter>
      <RealAuth mode={mode} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.loadSession).mockReturnValue(null);
  vi.mocked(api.getCuenta).mockResolvedValue(CUENTA);
  vi.mocked(api.requestOtp).mockResolvedValue("Código enviado por WhatsApp");
  vi.mocked(api.verifyOtp).mockResolvedValue(CUENTA);
  vi.mocked(api.logout).mockResolvedValue();
  vi.mocked(api.getWallet).mockResolvedValue(BILLETERA);
  vi.mocked(api.getPaymentMethods).mockResolvedValue([
    { id: "pago_movil", disponible: true, revision: "manual" },
    { id: "binance_pay", disponible: false, revision: "automatica" },
  ]);
  vi.mocked(api.listPayments).mockResolvedValue([]);
});

describe("RealAuth", () => {
  it("muestra el formulario de teléfono en modo ingreso", async () => {
    renderAuth();

    expect(await screen.findByRole("heading", { name: "Entra con tu teléfono." })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre y apellido")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar código/i })).toBeInTheDocument();
  });

  it("pide nombre y aceptación de términos al registrarse", async () => {
    renderAuth("register");

    expect(await screen.findByRole("heading", { name: "Crea tu cuenta real." })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre y apellido")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("rechaza teléfonos inválidos sin llamar a la API", async () => {
    renderAuth();
    fireEvent.change(await screen.findByLabelText("Teléfono"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Escribe un número venezolano");
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("envía el código E.164 y pasa al paso del código", async () => {
    renderAuth();
    fireEvent.change(await screen.findByLabelText("Teléfono"), { target: { value: "0414 1234567" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(await screen.findByRole("heading", { name: "Escribe el código." })).toBeInTheDocument();
    expect(api.requestOtp).toHaveBeenCalledWith({
      telefono: "+584141234567",
      nombre: undefined,
      rol: "cliente",
    });
    expect(screen.getByText("+58 ••• 4567")).toBeInTheDocument();
  });

  it("muestra el error de la API al pedir el código", async () => {
    vi.mocked(api.requestOtp).mockRejectedValueOnce(
      new api.ApiError("limite_otp", 429, "Demasiados intentos. Espera un minuto."),
    );
    renderAuth();
    fireEvent.change(await screen.findByLabelText("Teléfono"), { target: { value: "0414 1234567" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Demasiados intentos. Espera un minuto.");
  });

  it("valida el código y muestra la cuenta real", async () => {
    renderAuth();
    fireEvent.change(await screen.findByLabelText("Teléfono"), { target: { value: "0414 1234567" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));
    await screen.findByRole("heading", { name: "Escribe el código." });

    fireEvent.change(screen.getByLabelText("Código de acceso"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByRole("heading", { name: "Listo, María." })).toBeInTheDocument();
    expect(api.verifyOtp).toHaveBeenCalledWith({ telefono: "+584141234567", token: "123456" });
    expect(screen.getByText("Cuenta real")).toBeInTheDocument();
    expect(screen.getByText("Pasajero")).toBeInTheDocument();
    expect(screen.getByText("$9,90")).toBeInTheDocument();
  });

  it("retoma la sesión guardada al entrar", async () => {
    vi.mocked(api.loadSession).mockReturnValue({ access_token: "a", refresh_token: "r", expires_at: 1 });
    renderAuth();

    expect(await screen.findByRole("heading", { name: "Listo, María." })).toBeInTheDocument();
    expect(api.getCuenta).toHaveBeenCalled();
  });

  it("descarta la sesión guardada si la API falla", async () => {
    vi.mocked(api.loadSession).mockReturnValue({ access_token: "a", refresh_token: "r", expires_at: 1 });
    vi.mocked(api.getCuenta).mockRejectedValueOnce(new api.ApiError("sesion_invalida", 401, "Expirada"));
    renderAuth();

    expect(await screen.findByRole("heading", { name: "Entra con tu teléfono." })).toBeInTheDocument();
    expect(api.clearSession).toHaveBeenCalled();
  });

  it("permite cerrar sesión desde la cuenta", async () => {
    vi.mocked(api.loadSession).mockReturnValue({ access_token: "a", refresh_token: "r", expires_at: 1 });
    renderAuth();
    await screen.findByRole("heading", { name: "Listo, María." });

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    expect(await screen.findByRole("heading", { name: "Entra con tu teléfono." })).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalled();
  });
});
