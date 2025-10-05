import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExpensesApp from "./ExpensesApp.jsx";
import { MemoryRouter } from "react-router-dom";

// Basic smoke tests for main tabs and import/export controls

describe("ExpensesApp", () => {
  it("renders header and tabs", () => {
    render(
      <MemoryRouter>
        <ExpensesApp />
      </MemoryRouter>
    );
    expect(screen.getByText(/Controle de Gastos/)).toBeInTheDocument();
    // Tab buttons have role=button with aria-pressed
    expect(screen.getByRole("button", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Histórico/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Despesa/ })).toBeInTheDocument();
  });

  it("opens import modal from button", () => {
    render(
      <MemoryRouter>
        <ExpensesApp />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Importar/ }));
    // Modal mounts; verify presence by dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
