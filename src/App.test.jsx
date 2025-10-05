import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";
import { MemoryRouter } from "react-router-dom";

function renderApp() {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

describe("Investment App", () => {
  it("renders KPIs and header", () => {
    renderApp();
    expect(screen.getByText(/Monitor de Investimentos/)).toBeInTheDocument();
    expect(screen.getByText(/Investido último mês/)).toBeInTheDocument();
  });
});
