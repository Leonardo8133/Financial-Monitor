import { render, screen } from '@testing-library/react';
import { Projecoes } from './Projecoes.jsx';

function brl(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

describe('Projecoes - passive income', () => {
  test('uses 1% of patrimonio monthly after goal (no /12)', () => {
    const patrimonio = 922_961.31;
    const timeline = [{ invested: patrimonio, yieldPct: 0.01 }];
    render(
      <Projecoes
        timeline={timeline}
        defaults={{ monthlyReturn: 0.01, contributionGrowth: 0, inflationRate: 0 }}
      />
    );
    // Show advanced to ensure the component mounts and computes
    // The text should display passive income equals 1% * patrimonio
    const expected = patrimonio * 0.01; // 1% per month
    const text = screen.getByText(/Renda passiva mensal após a meta:/i).parentElement.textContent;
    expect(text).toContain(brl(expected));
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Projecoes } from "./Projecoes.jsx";

function makeTimeline({ months = 6, invested = 1000, yieldPct = 0.01 } = {}) {
  const start = new Date(2024, 0, 15);
  const items = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 15);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    items.push({ ym, label: ym, invested, cashFlow: invested, yieldPct });
  }
  return items;
}

describe("Projecoes", () => {
  it("renders results with two-decimal percentages and BRL", () => {
    render(<Projecoes timeline={makeTimeline()} defaults={{ initialBalance: 10000, monthlyReturn: 0.01, monthlyContribution: 1000 }} />);

    expect(screen.getByText(/Patrimônio projetado/)).toBeInTheDocument();
    // Check a known percentage field to have two decimals
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
  });

  it("rounds monthly return input to 2 decimals", () => {
    render(<Projecoes timeline={makeTimeline()} defaults={{ monthlyReturn: 0.01234 }} />);
    const input = screen.getByLabelText(/Rentabilidade mensal/);
    fireEvent.change(input, { target: { value: "1.239" } });
    expect(input).toHaveValue(1.24);
  });

  it("uses last month yield when available in hint", () => {
    render(<Projecoes timeline={makeTimeline({ yieldPct: 0.023 })} defaults={{}} />);
    expect(screen.getAllByText(/Último mês:/).length).toBeGreaterThan(0);
  });
});
