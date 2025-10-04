const BANK_LIBRARY = [
  { name: "Nubank Caixinhas", color: "#8A05BE", icon: "🟣" },
  { name: "Nubank Investimentos", color: "#7A04B5", icon: "💜" },
  { name: "XP", color: "#000000", icon: "⚫" },
  { name: "Inter", color: "#FF7A00", icon: "🟠" },
  { name: "Nubank Cripto", color: "#380960", icon: "🪙" },
  { name: "Binance", color: "#F3BA2F", icon: "🟡" },
];

const lookup = new Map(BANK_LIBRARY.map((bank) => [bank.name.toLowerCase(), bank]));

function stringToColor(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
}

export function getBankVisual(bankName = "") {
  const preset = lookup.get(bankName.toLowerCase());
  if (preset) return preset;
  return { name: bankName, color: stringToColor(bankName), icon: "🏦" };
}

export const BANKS = BANK_LIBRARY;
