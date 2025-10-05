import { DEFAULT_BANKS } from "../config/banks.js";
import { DEFAULT_SOURCES } from "../config/sources.js";

export const emptyEntry = {
  bank: "",
  source: "",
  date: "",
  inAccount: 0,
  invested: 0,
  cashFlow: 0,
};

export const demoBanks = DEFAULT_BANKS.map((bank) => ({ ...bank }));
export const demoSources = DEFAULT_SOURCES.map((source) => ({ ...source }));

export const demoEntries = [
  {
    id: "demo-2025-08-01-nubank-caixinhas",
    bank: "Nubank Caixinhas",
    source: "Salário",
    date: "2025-08-01",
    inAccount: 0,
    invested: 40000,
    cashFlow: 10000,
  },
  {
    id: "demo-2025-09-02-nubank-caixinhas",
    bank: "Nubank Caixinhas",
    source: "Salário",
    date: "2025-09-02",
    inAccount: 0,
    invested: 62240.39,
    cashFlow: 21684.8,
  },
  {
    id: "demo-2025-08-01-nubank-investimentos",
    bank: "Nubank Investimentos",
    source: "Dividendos",
    date: "2025-08-01",
    inAccount: 0,
    invested: 47000,
    cashFlow: 5000,
  },
  {
    id: "demo-2025-09-02-nubank-investimentos",
    bank: "Nubank Investimentos",
    source: "Dividendos",
    date: "2025-09-02",
    inAccount: 0,
    invested: 47600.48,
    cashFlow: 0,
  },
  {
    id: "demo-2025-08-01-xp",
    bank: "XP",
    source: "Renda Fixa",
    date: "2025-08-01",
    inAccount: 150,
    invested: 27500,
    cashFlow: 2000,
  },
  {
    id: "demo-2025-09-02-xp",
    bank: "XP",
    source: "Renda Fixa",
    date: "2025-09-02",
    inAccount: 216.32,
    invested: 28063.77,
    cashFlow: 0,
  },
  {
    id: "demo-2025-08-01-inter",
    bank: "Inter",
    source: "Freelance",
    date: "2025-08-01",
    inAccount: -200,
    invested: 22000,
    cashFlow: 0,
  },
  {
    id: "demo-2025-09-02-inter",
    bank: "Inter",
    source: "Freelance",
    date: "2025-09-02",
    inAccount: -400,
    invested: 23351.03,
    cashFlow: 0,
  },
  {
    id: "demo-2025-08-01-nubank-cripto",
    bank: "Nubank Cripto",
    source: "Dividendos",
    date: "2025-08-01",
    inAccount: 0,
    invested: 9000,
    cashFlow: -2000,
  },
  {
    id: "demo-2025-09-02-nubank-cripto",
    bank: "Nubank Cripto",
    source: "Dividendos",
    date: "2025-09-02",
    inAccount: 0,
    invested: 1108.65,
    cashFlow: -10520.23,
  },
  {
    id: "demo-2025-08-01-binance",
    bank: "Binance",
    source: "Dividendos",
    date: "2025-08-01",
    inAccount: 0,
    invested: 2000,
    cashFlow: 0,
  },
  {
    id: "demo-2025-09-02-binance",
    bank: "Binance",
    source: "Dividendos",
    date: "2025-09-02",
    inAccount: 0,
    invested: 2181,
    cashFlow: 0,
  },
];

export const demoCreatedAt = "2025-09-30T12:00:00.000Z";
