import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ExpensesApp from "./ExpensesApp.jsx";
import { detectExpenseTemplate, parseExpensePdfWithTemplates } from "./utils/pdfTemplates.js";
import { PrefsProvider } from "../theme/PrefsProvider.jsx";

function renderApp() {
  render(
    <PrefsProvider>
      <MemoryRouter initialEntries={["/gastos"]}>
        <Routes>
          <Route path="/gastos/:tab?" element={<ExpensesApp />} />
        </Routes>
      </MemoryRouter>
    </PrefsProvider>
  );
}

describe("ExpensesApp", () => {
  it("renders header and tabs", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Histórico/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Transação/ })).toBeInTheDocument();
  });

  it("opens import modal from button", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Importar/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("detects a known PDF template from text", () => {
    const sample = "Nubank Resumo da fatura 01/02 Supermercado R$ 123,45";
    const tpl = detectExpenseTemplate(sample);
    expect(tpl).not.toBeNull();
    const res = parseExpensePdfWithTemplates(sample);
    expect(Array.isArray(res.items)).toBe(true);
  });
});
