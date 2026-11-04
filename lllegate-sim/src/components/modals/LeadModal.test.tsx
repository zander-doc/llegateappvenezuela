import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UIProvider } from "../../lib/ui";
import { LeadModal } from "./LeadModal";

function renderLead() {
  return render(
    <UIProvider>
      <LeadModal intent="contacto" onClose={vi.fn()} />
    </UIProvider>
  );
}

describe("LeadModal", () => {
  it("muestra errores inline y no envía el formulario vacío", () => {
    renderLead();

    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    expect(screen.getByText("Escribe tu nombre.")).toBeInTheDocument();
    expect(screen.getByText("Escribe un correo o teléfono para responderte.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toHaveAttribute("aria-invalid", "true");
    expect(localStorage.getItem("llegate_sim_contacto")).toBeNull();
  });

  it("guarda el lead sin valores que parecen teléfonos", () => {
    renderLead();

    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "María Rodríguez" } });
    fireEvent.change(screen.getByLabelText("Correo o teléfono"), { target: { value: "04141234567" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    expect(screen.getByText("Mensaje guardado")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("llegate_sim_contacto") ?? "[]") as Record<string, unknown>[];
    expect(stored[0]).toMatchObject({ name: "María Rodríguez" });
    expect(JSON.stringify(stored)).not.toContain("04141234567");
  });
});
