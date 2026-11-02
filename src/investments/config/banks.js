import { colorForName, isValidColor } from "../../utils/palette.js";
export const DEFAULT_BANKS = [
  { name: "Nubank - Caixinhas", color: "#8A05BE", icon: "🟣" },
  { name: "Nubank - Investimentos", color: "#7A04B5", icon: "💜" },
  { name: "XP", color: "#000000", icon: "⚫" },
  { name: "Inter", color: "#FF7A00", icon: "🟠" },
  { name: "Nubank - Cripto", color: "#380960", icon: "🪙" },
  { name: "Binance", color: "#F3BA2F", icon: "🟡" },
  { name: "Mercado Livre", color: "#000000", icon: "🟡" },
  { name: "Mercado Pago", color: "#000000", icon: "🟡" },
  { name: "Itaú", color: "#000000", icon: "⚫" },
  { name: "Santander", color: "#000000", icon: "⚫" },
  { name: "Bradesco", color: "#000000", icon: "⚫" },
  { name: "Banco do Brasil", color: "#000000", icon: "🟡" },
  { name: "Caixa", color: "#000000", icon: "🔵" },
  { name: "C6 Bank", color: "#000000", icon: "⚫" },
  { name: "Pagseguro", color: "#000000", icon: "⚫" },
  { name: "PicPay", color: "#00C86F", icon: "🟢" },
  { name: "Nomad", color: "#00C86F", icon: "🟡" },
];

export function stringToColor(input = "") {
  return colorForName(input);
}

export function resolveBankVisual(bankName = "", library = DEFAULT_BANKS) {
  const lower = bankName.toLowerCase();
  const preset = library.find((bank) => bank.name.toLowerCase() === lower);
  if (preset) return isValidColor(preset.color) ? preset : { ...preset, color: colorForName(bankName) };
  return { name: bankName, color: stringToColor(bankName), icon: "🏦" };
}

export function ensureBankInLibrary(bankName, library = DEFAULT_BANKS) {
  if (!bankName) return library;
  const lower = bankName.toLowerCase();
  const exists = library.some((bank) => bank.name.toLowerCase() === lower);
  if (exists) return library;
  const nextBank = resolveBankVisual(bankName, []);
  return [...library, nextBank];
}
