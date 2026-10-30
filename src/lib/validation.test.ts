import { describe, expect, it } from "vitest";
import {
  isCedula,
  isContact,
  isEmail,
  isPersonName,
  isVenezuelanPhone,
  normalizeDigits,
} from "./validation";

describe("validation", () => {
  it("normaliza solo los dígitos de un teléfono", () => {
    expect(normalizeDigits("+58 (414) 123-4567")).toBe("584141234567");
  });

  it("valida correos", () => {
    expect(isEmail("maria@ejemplo.com")).toBe(true);
    expect(isEmail(" maria@ejemplo.com ")).toBe(true);
    expect(isEmail("maria@ejemplo")).toBe(false);
    expect(isEmail("maria ejemplo.com")).toBe(false);
  });

  it("valida teléfonos venezolanos", () => {
    expect(isVenezuelanPhone("0414 1234567")).toBe(true);
    expect(isVenezuelanPhone("+58 414 1234567")).toBe(true);
    expect(isVenezuelanPhone("4141234567")).toBe(true);
    expect(isVenezuelanPhone("0414-123")).toBe(false);
    expect(isVenezuelanPhone("llámame")).toBe(false);
  });

  it("acepta correo o teléfono como contacto", () => {
    expect(isContact("maria@ejemplo.com")).toBe(true);
    expect(isContact("0414 1234567")).toBe(true);
    expect(isContact("12345")).toBe(false);
    expect(isContact("   ")).toBe(false);
  });

  it("valida cédulas venezolanas", () => {
    expect(isCedula("V-12345678")).toBe(true);
    expect(isCedula("e12345678")).toBe(true);
    expect(isCedula("V-123")).toBe(false);
    expect(isCedula("12345678")).toBe(false);
  });

  it("valida nombres de persona sin números", () => {
    expect(isPersonName("María Rodríguez")).toBe(true);
    expect(isPersonName("Ana-Lucía O'Neil")).toBe(true);
    expect(isPersonName("Mar1a")).toBe(false);
    expect(isPersonName("Al")).toBe(false);
  });
});
