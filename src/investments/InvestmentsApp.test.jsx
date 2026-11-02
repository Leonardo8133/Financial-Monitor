import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "./InvestmentsApp.jsx";
import { PrefsProvider } from "../theme/PrefsProvider.jsx";

function renderApp() {
  render(
    <PrefsProvider>
      <MemoryRouter initialEntries={["/investimentos"]}>
        <Routes>
          <Route path="/investimentos/:tab?" element={<App />} />
        </Routes>
      </MemoryRouter>
    </PrefsProvider>
  );
}

describe("Investment App", () => {
  it("renders KPIs and header", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Investimentos" })).toBeInTheDocument();
    expect(screen.getByText(/Patrimônio atual/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Entrada/ })).toBeInTheDocument();
  });
});
