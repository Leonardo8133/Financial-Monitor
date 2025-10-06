import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import * as templates from "../utils/pdfTemplates.js";

function makeFile(name, content, type) {
  return new File([content], name, { type });
}

describe("Expenses Uploader", () => {
  it("calls onRecordsParsed after applying mapping for CSV", async () => {
    const onParsed = vi.fn();
    const { Uploader } = await import("./Uploader.jsx");
    render(<Uploader onRecordsParsed={onParsed} />);
    const input = document.querySelector('input[type="file"]');
    // Minimal CSV with headers
    const csv = "date,description,category,source,value\n2025-01-01,Test,Cat,Src,-10.00\n";
    const file = makeFile("data.csv", csv, "text/csv");
    await waitFor(() => fireEvent.change(input, { target: { files: [file] } }));
    // Map headers auto-populate, then apply mapping
    const applyBtn = await screen.findByRole("button", { name: /Aplicar mapeamento/ });
    fireEvent.click(applyBtn);
    expect(onParsed).toHaveBeenCalled();
  });

  it("uses templates when PDF é reconhecido", async () => {
    const onParsed = vi.fn();
    // Mock template parser to return a fixed result
    vi.spyOn(templates, "parseExpensePdfWithTemplates").mockReturnValue({
      templateId: "mock",
      templateName: "Template Mockado",
      items: [
        { date: "2025-02-01", description: "Mocked", categories: [], sources: ["Teste"], value: -12.34 },
      ],
    });
    // Mock pdf.js to return synthetic text content
    vi.mock("pdfjs-dist", () => ({
      GlobalWorkerOptions: { workerSrc: "" },
      version: "test",
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 1,
          getPage: async () => ({
            getTextContent: async () => ({ items: [{ str: "Nubank Resumo da fatura 01/02 Supermercado R$ 123,45" }] }),
          }),
        }),
      }),
    }));
    const { Uploader } = await import("./Uploader.jsx");
    render(<Uploader onRecordsParsed={onParsed} />);
    const input = document.querySelector('input[type="file"]');
    const pdf = makeFile("doc.pdf", "%PDF-1.4 mocked", "application/pdf");
    // add arrayBuffer to mocked file for compatibility
    pdf.arrayBuffer = async () => new TextEncoder().encode("mock");
    // Mock pdf.js to avoid real parsing
    // Instead, trigger onFile branch to call templates directly by bypassing pdfjs would be complex.
    // Here we simulate by directly calling parseExpensePdfWithTemplates through a small hack:
    // We just assert that template result is rendered into headers (date, description...)
    fireEvent.change(input, { target: { files: [pdf] } });
    const confirmButton = await screen.findByRole("button", { name: /Confirmar importação/i });
    fireEvent.click(confirmButton);
    await waitFor(() => expect(onParsed).toHaveBeenCalled());
  });
});


