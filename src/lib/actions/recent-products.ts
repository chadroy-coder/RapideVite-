"use server";

import { getRecentProducts } from "@/lib/data";

// Returns one page of recently added products for the home page infinite scroll.
export async function loadMoreRecentProducts(offset: number, limit = 12) {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 24);
  const products = await getRecentProducts(safeLimit, safeOffset);
  return { products, hasMore: products.length === safeLimit };
}
