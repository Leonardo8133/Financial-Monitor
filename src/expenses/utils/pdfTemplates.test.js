import { describe, it, expect } from "vitest";
import { detectExpenseTemplate, parseExpensePdfWithTemplates } from "./pdfTemplates.js";

describe("expenses PDF templates", () => {
  it("detects Nubank card invoice and parses items", () => {
    const sample = [
      "Nubank",
      "Resumo da fatura",
      "01/02 Supermercado R$ 123,45",
      "05/02 Uber R$ 45,00",
    ].join("\n");
    const tpl = detectExpenseTemplate(sample);
    expect(tpl?.id).toBe("nubank_card");
    const result = parseExpensePdfWithTemplates(sample);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(1);
    const first = result.items[0];
    expect(first).toHaveProperty("date");
    expect(first).toHaveProperty("description");
    expect(first).toHaveProperty("source");
    expect(first).toHaveProperty("value");
    expect(typeof first.value).toBe("number");
    // card spend should be negative
    expect(first.value).toBeLessThan(0);
  });

  it("detects Itau checking statement and parses values (may be positive/negative)", () => {
    const sample = [
      "Banco Itaú",
      "Extrato",
      "03/02 TED RECEBIDA 1.234,56",
      "04/02 PIX ENVIADO -12,34",
    ].join("\n");
    const tpl = detectExpenseTemplate(sample);
    expect(tpl?.id).toBe("itau_checking");
    const result = parseExpensePdfWithTemplates(sample);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty("source", "Conta Itaú");
  });

  it("detects telecom invoice and returns negative values", () => {
    const sample = [
      "FATURA",
      "VIVO",
      "10/02 Assinatura R$ 99,99",
    ].join("\n");
    const tpl = detectExpenseTemplate(sample);
    expect(tpl?.id).toBe("telecom_invoice");
    const result = parseExpensePdfWithTemplates(sample);
    expect(result.items[0].value).toBeLessThan(0);
    expect(result.items[0].category).toBe("Serviços");
  });

  it("returns null for unknown templates", () => {
    const sample = "Documento qualquer sem padrão";
    const result = parseExpensePdfWithTemplates(sample);
    expect(result).toBeNull();
  });
});


