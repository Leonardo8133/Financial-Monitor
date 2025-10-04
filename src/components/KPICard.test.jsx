import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "./KPICard";

describe("KPICard", () => {
  it("renders title, values and subtitle", () => {
    render(
      <KPICard
        title="Rendimento"
        value="R$ 100,00"
        secondaryValue="10%"
        subtitle="Último mês"
        tone="positive"
      />
    );

    expect(screen.getByText("Rendimento")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("Último mês")).toBeInTheDocument();
  });
});
