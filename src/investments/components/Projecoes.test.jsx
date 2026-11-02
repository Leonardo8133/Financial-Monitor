import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, test } from "vitest";
import { Projecoes } from "./Projecoes.jsx";
import { PrefsProvider } from "../../theme/PrefsProvider.jsx";

function brl(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function renderWithPrefs(ui) {
  return render(<PrefsProvider>{ui}</PrefsProvider>);
}

describe("Projecoes - passive income", () => {
  test("uses 1% of patrimonio monthly (no /12)", () => {
    const patrimonio = 922_961.31;
    const timeline = [{ invested: patrimonio, total: patrimonio, yieldPct: 0.01 }];
    renderWithPrefs(
      <Projecoes timeline={timeline} defaults={{ monthlyReturn: 0.01, contributionGrowth: 0, inflationRate: 0, horizonMonths: 0 }} />
    );
    const expected = patrimonio * 0.01;
    const text = screen.getByText(/Renda passiva estimada ao final:/i).parentElement.textContent;
    expect(text).toContain(brl(expected));
  });
});

function makeTimeline({ months = 6, invested = 1000, yieldPct = 0.01 } = {}) {
  const start = new Date(2024, 0, 15);
  const items = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 15);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    items.push({ ym, label: ym, invested, total: invested, cashFlow: invested, yieldPct });
  }
  return items;
}

describe("Projecoes", () => {
  it("renders results with percentages and BRL", () => {
    renderWithPrefs(<Projecoes timeline={makeTimeline()} defaults={{ initialBalance: 10000, monthlyReturn: 0.01, monthlyContribution: 1000 }} />);
    expect(screen.getByText(/Patrimônio projetado/)).toBeInTheDocument();
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
  });

  it("rounds monthly return input to 2 decimals", () => {
    renderWithPrefs(<Projecoes timeline={makeTimeline()} defaults={{ monthlyReturn: 0.01234 }} />);
    const input = screen.getByLabelText(/Rentabilidade mensal/);
    fireEvent.change(input, { target: { value: "1.239" } });
    expect(input).toHaveValue(1.24);
  });

  it("shows the trailing average yield as a hint", () => {
    renderWithPrefs(<Projecoes timeline={makeTimeline({ yieldPct: 0.023 })} defaults={{}} />);
    expect(screen.getAllByText(/Média 6m/).length).toBeGreaterThan(0);
  });
});
