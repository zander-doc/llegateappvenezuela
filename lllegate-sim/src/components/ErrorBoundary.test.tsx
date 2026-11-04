import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("muestra el mensaje de recuperación si un hijo falla", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo se rompió en la simulación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
