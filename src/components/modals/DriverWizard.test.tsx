import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UIProvider } from "../../lib/ui";
import { DriverWizard } from "./DriverWizard";

const DRAFT_KEY = "llegate_sim_draft:driver-registration";

function renderWizard() {
  return render(
    <MemoryRouter>
      <UIProvider>
        <DriverWizard onClose={vi.fn()} />
      </UIProvider>
    </MemoryRouter>
  );
}

describe("DriverWizard", () => {
  it("bloquea el paso 2 con errores inline y mantiene el paso", () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText("2/3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Escribe tu nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Escribe tu teléfono.")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("aria-invalid", "true");
  });

  it("rechaza un teléfono que no es venezolano", () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "María Rodríguez" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Escribe un número venezolano, por ejemplo 0414 1234567.")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("guarda la solicitud sin el teléfono y limpia el borrador", () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "María Rodríguez" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "04141234567" } });
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(JSON.stringify(localStorage)).not.toContain("04141234567");

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(screen.getByText("Tu solicitud quedó guardada")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("llegate_sim_drivers") ?? "[]") as Record<string, unknown>[];
    expect(stored[0]).toMatchObject({ name: "María Rodríguez", plan: "prepago" });
    expect(JSON.stringify(stored)).not.toContain("04141234567");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("restaura un borrador guardado sin teléfono", () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        name: "Carlos Pérez",
        city: "Valencia",
        serviceSlug: "taxi",
        experience: "3-5 años",
        plan: "comision",
      })
    );

    renderWizard();
    expect(screen.getByText(/recuperamos el borrador/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Carlos Pérez");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("");
  });
});
