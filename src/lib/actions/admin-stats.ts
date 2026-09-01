"use server";

import { requireStaff } from "@/lib/require-staff";

export async function getDashboardStats() {
  const { supabase } = await requireStaff();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersToday, pendingOrders, lowStock, recentOrders, bestSellers, apkDownloads] = await Promise.all([
    supabase.from("orders").select("id, total", { count: "exact" }).gte("created_at", todayStart.toISOString()),
    supabase.from("orders").select("id", { count: "exact" }).in("status", ["new", "confirmed", "preparing", "ready"]),
    supabase
      .from("product_variants")
      .select("id, size, inventory_quantity, low_stock_threshold, product:products(name)")
      .lte("inventory_quantity", 10)
      .order("inventory_quantity", { ascending: true })
      .limit(10),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
    supabase
      .from("order_items")
      .select("product_name, quantity"),
    // Sideloaded APK downloads (see /telecharger + /api/download-apk) -
    // relevant while the app is waiting on Play Store review.
    supabase.from("apk_downloads").select("id", { count: "exact", head: true }),
  ]);

  const revenueToday = (ordersToday.data ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  const bestSellerMap = new Map<string, number>();
  for (const item of bestSellers.data ?? []) {
    bestSellerMap.set(item.product_name, (bestSellerMap.get(item.product_name) ?? 0) + item.quantity);
  }
  const topProducts = Array.from(bestSellerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return {
    ordersTodayCount: ordersToday.count ?? 0,
    revenueToday,
    pendingOrdersCount: pendingOrders.count ?? 0,
    lowStockItems: lowStock.data ?? [],
    recentOrders: recentOrders.data ?? [],
    topProducts,
    apkDownloadsCount: apkDownloads.count ?? 0,
  };
}

export async function listCustomersAdmin() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
