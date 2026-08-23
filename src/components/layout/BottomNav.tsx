"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, ClipboardList, User } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { getLiveOrderCount } from "@/lib/actions/orders";

const items = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/recherche", label: "Chercher", icon: Search },
  { href: "/panier", label: "Panier", icon: ShoppingCart },
  { href: "/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/compte", label: "Compte", icon: User },
];

const LIVE_ORDER_POLL_MS = 30000;

export function BottomNav({ initialHasLiveOrder = false }: { initialHasLiveOrder?: boolean }) {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());
  const [hasLiveOrder, setHasLiveOrder] = useState(initialHasLiveOrder);

  // Polls rather than pushing, same tradeoff as the order tracking page -
  // keeps the badge from going stale while browsing without needing
  // realtime/websocket wiring for something this low-stakes.
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getLiveOrderCount();
      setHasLiveOrder(count > 0);
    }, LIVE_ORDER_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-border md:hidden safe-bottom">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 relative text-[11px] font-medium ${
                  active ? "text-brand-orange" : "text-brand-gray"
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {href === "/panier" && itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-brand-orange text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                  {href === "/commandes" && hasLiveOrder && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-green">
                      <span className="absolute inset-0 rounded-full bg-brand-green animate-ping opacity-75" />
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
