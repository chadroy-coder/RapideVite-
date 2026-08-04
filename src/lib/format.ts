export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Display-only estimate so customers can see roughly what a USD price costs
// in HTG - cards are always charged in USD, this never affects the actual
// charge. Update this constant manually if the exchange rate drifts.
const HTG_PER_USD = 132;

export function formatHTGEstimate(usdAmount: number): string {
  const htg = Math.round(usdAmount * HTG_PER_USD);
  return `≈ ${new Intl.NumberFormat("fr-HT").format(htg)} HTG`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
