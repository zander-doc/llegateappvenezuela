import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealWallet } from "./RealWallet";
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
    getWallet: vi.fn(),
    getPaymentMethods: vi.fn(),
    listPayments: vi.fn(),
    createPaymentIntent: vi.fn(),
    reportPayment: vi.fn(),
    cancelPayment: vi.fn(),
    paymentErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Error de pago"),
  };
});

const LIMITES: api.Billetera["limites"] = {
  comisionPorcentaje: 10,
  comisionMinimaUSD: 0.1,
  saldoMinimoUSD: 1,
  alertaSaldoBajoUSD: 2,
  recargaMinimaUSD: 5,
  recargaMaximaUSD: 50,
  slaAprobacionMinutos: 15,
  bienvenidaUSD: 2,
};

const BILLETERA: api.Billetera = {
  tipo: "pasajero",
  saldoUSD: 12.5,
  reservadoUSD: 0,
  disponibleUSD: 12.5,
  estado: "activo",
  limites: LIMITES,
};

const METODOS: api.MetodoPagoDisponible[] = [
  { id: "pago_movil", disponible: true, revision: "manual" },
  { id: "binance_pay", disponible: false, revision: "automatica" },
];

function intento(overrides: Partial<api.PagoIntento> = {}): api.PagoIntento {
  return {
    id: "7a000000-0000-0000-0000-000000000001",
    codigo: "LLG-AAAA111111",
    metodo: "pago_movil",
    estado: "pendiente",
    montoUSD: 10,
    montoBs: 1000,
    tasaBs: 100,
    checkoutUrl: null,
    instrucciones: {
      tipo: "pago_movil",
      banco: "Banesco",
      telefono: "04141234567",
      cedula: "V-12345678",
      titular: "Llégate C.A.",
      monto_bs: 1000,
    },
    referenciaReportada: null,
    comprobanteUrl: null,
    expiraEn: null,
    confirmadoEn: null,
    motivoRechazo: null,
    createdAt: "2026-10-31T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getWallet).mockResolvedValue(BILLETERA);
  vi.mocked(api.getPaymentMethods).mockResolvedValue(METODOS);
  vi.mocked(api.listPayments).mockResolvedValue([]);
  vi.mocked(api.createPaymentIntent).mockResolvedValue(intento());
  vi.mocked(api.reportPayment).mockResolvedValue({ ok: true, estado: "en_revision", yaReportado: false });
  vi.mocked(api.cancelPayment).mockResolvedValue({ ok: true, estado: "cancelado" });
});

describe("RealWallet", () => {
  it("muestra el saldo real y los métodos configurados", async () => {
    render(<RealWallet />);

    expect(await screen.findByText("Billetera real")).toBeInTheDocument();
    expect(screen.getAllByText("$12,50").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /pago móvil/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /binance pay/i })).toBeDisabled();
    expect(screen.getByText("Aún no hay recargas en esta cuenta.")).toBeInTheDocument();
  });

  it("crea una orden de Pago Móvil con los datos del comercio", async () => {
    render(<RealWallet />);
    await screen.findByText("Billetera real");

    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    expect(await screen.findByText("Banesco")).toBeInTheDocument();
    expect(api.createPaymentIntent).toHaveBeenCalledWith({ metodo: "pago_movil", montoUSD: 10 });
    expect(screen.getByText("Bs. 1000.00")).toBeInTheDocument();
    expect(screen.getByText("Llégate C.A.")).toBeInTheDocument();
    expect(screen.getByLabelText("Referencia de tu banco")).toBeInTheDocument();
  });

  it("reporta la referencia bancaria y pasa a revisión", async () => {
    render(<RealWallet />);
    await screen.findByText("Billetera real");
    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    const campo = await screen.findByLabelText("Referencia de tu banco");
    fireEvent.change(campo, { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /reportar pago/i }));

    expect(await screen.findByText(/Referencia 12345678 enviada/i)).toBeInTheDocument();
    expect(api.reportPayment).toHaveBeenCalledWith({
      id: "7a000000-0000-0000-0000-000000000001",
      referencia: "12345678",
    });
    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
  });

  it("rechaza una referencia que no tiene de 6 a 12 dígitos", async () => {
    render(<RealWallet />);
    await screen.findByText("Billetera real");
    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    fireEvent.change(await screen.findByLabelText("Referencia de tu banco"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /reportar pago/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("de 6 a 12 dígitos");
    expect(api.reportPayment).not.toHaveBeenCalled();
  });

  it("respeta el rango de recarga del piloto antes de llamar a la API", async () => {
    vi.mocked(api.getWallet).mockResolvedValue({ ...BILLETERA, tipo: "piloto" });
    render(<RealWallet />);
    await screen.findByText("Billetera real");

    fireEvent.change(screen.getByLabelText("Monto a recargar en dólares"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("va de $5,00 a $50,00");
    expect(api.createPaymentIntent).not.toHaveBeenCalled();
  });

  it("muestra el enlace de checkout cuando el pago es con Binance", async () => {
    vi.mocked(api.getPaymentMethods).mockResolvedValue([
      { id: "pago_movil", disponible: true, revision: "manual" },
      { id: "binance_pay", disponible: true, revision: "automatica" },
    ]);
    vi.mocked(api.createPaymentIntent).mockResolvedValue(
      intento({
        metodo: "binance_pay",
        checkoutUrl: "https://pay.binance.test/checkout/1",
        montoBs: null,
        tasaBs: null,
        instrucciones: { tipo: "binance_pay" },
      }),
    );

    render(<RealWallet />);
    await screen.findByText("Billetera real");
    fireEvent.click(screen.getByRole("button", { name: /binance pay/i }));
    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    const enlace = await screen.findByRole("link", { name: /abrir binance pay/i });
    expect(enlace).toHaveAttribute("href", "https://pay.binance.test/checkout/1");
    expect(api.createPaymentIntent).toHaveBeenCalledWith({ metodo: "binance_pay", montoUSD: 10 });
  });

  it("muestra el error de la API al crear la orden", async () => {
    vi.mocked(api.createPaymentIntent).mockRejectedValueOnce(
      new api.ApiError("binance_no_configurado", 503, "Binance Pay no está disponible en este momento."),
    );
    render(<RealWallet />);
    await screen.findByText("Billetera real");

    fireEvent.click(screen.getByRole("button", { name: /crear orden de recarga/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Binance Pay no está disponible en este momento.");
  });

  it("abre el detalle de una recarga en revisión desde el historial", async () => {
    vi.mocked(api.listPayments).mockResolvedValue([
      intento({ estado: "en_revision", referenciaReportada: "778899" }),
    ]);
    render(<RealWallet />);
    await screen.findByText("Billetera real");

    fireEvent.click(screen.getByRole("button", { name: /ver recarga LLG-AAAA111111/i }));

    expect(await screen.findByText(/Referencia 778899 recibida/i)).toBeInTheDocument();
  });

  it("avisa cuando ninguna pasarela está configurada", async () => {
    vi.mocked(api.getPaymentMethods).mockResolvedValue([
      { id: "pago_movil", disponible: false, revision: "manual" },
      { id: "binance_pay", disponible: false, revision: "automatica" },
    ]);
    render(<RealWallet />);
    await screen.findByText("Billetera real");

    expect(screen.getByText(/Las pasarelas aún no están configuradas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear orden de recarga/i })).toBeDisabled();
  });
});
