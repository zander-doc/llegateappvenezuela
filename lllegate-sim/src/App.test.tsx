import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renderiza el home con su encabezado principal", () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("carga una página diferida mediante el router", async () => {
    window.history.pushState({}, "", "/tarifas");
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
