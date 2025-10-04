import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "./KPICard";

describe("KPICard", () => {
  it("renders title and value", () => {
    render(<KPICard title="Total" value="R$ 100,00" subtitle="Resumo" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("Resumo")).toBeInTheDocument();
  });
});
