"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ClipboardList,
  Users,
  BarChart3,
  Upload,
  ArrowLeft,
  Bike,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";

const links = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventaire", label: "Inventaire", icon: Boxes },
  { href: "/admin/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/admin/livreurs", label: "Livreurs", icon: Bike },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/rapports", label: "Rapports", icon: BarChart3 },
  { href: "/admin/import", label: "Importer produits", icon: Upload },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 border-r border-brand-border flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-brand-border flex items-center gap-2.5">
        <Logo className="w-8 h-8 shrink-0" />
        <div>
          <span className="font-extrabold text-brand-ink text-lg leading-tight block">RapidVit</span>
          <p className="text-xs text-brand-gray">Administration</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium ${
                active ? "text-brand-orange bg-brand-orange/5 border-r-2 border-brand-orange" : "text-brand-ink hover:bg-brand-cream"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-4 text-sm text-brand-gray border-t border-brand-border hover:text-brand-orange"
      >
        <ArrowLeft className="w-4 h-4" /> Retour au site
      </Link>
    </aside>
  );
}
