export const DEFAULT_BANKS = [
  { name: "Nubank Caixinhas", color: "#8A05BE", icon: "🟣" },
  { name: "Nubank Investimentos", color: "#7A04B5", icon: "💜" },
  { name: "XP", color: "#000000", icon: "⚫" },
  { name: "Inter", color: "#FF7A00", icon: "🟠" },
  { name: "Nubank Cripto", color: "#380960", icon: "🪙" },
  { name: "Binance", color: "#F3BA2F", icon: "🟡" },
];

export function stringToColor(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
}

export function resolveBankVisual(bankName = "", library = DEFAULT_BANKS) {
  const lower = bankName.toLowerCase();
  const preset = library.find((bank) => bank.name.toLowerCase() === lower);
  if (preset) return preset;
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
