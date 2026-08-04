export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Short "Coca-Cola, Lait +3" style summary of an order's line items, used
// wherever an order is shown as a compact row (account page, order list).
export function summarizeOrderItems(items: { product_name: string }[], max = 2): string {
  if (items.length === 0) return "";
  const names = items.slice(0, max).map((i) => i.product_name);
  const remaining = items.length - names.length;
  return remaining > 0 ? `${names.join(", ")} +${remaining}` : names.join(", ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
