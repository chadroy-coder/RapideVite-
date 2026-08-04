"use client";

import { useState } from "react";
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
  Menu,
  X,
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

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-5 py-2.5 text-sm font-medium ${
              active ? "text-brand-orange bg-brand-orange/5 border-r-2 border-brand-orange" : "text-brand-ink hover:bg-brand-cream"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 border-r border-brand-border flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-brand-border flex items-center gap-2.5">
          <Logo className="w-8 h-8 shrink-0" />
          <div>
            <span className="font-extrabold text-brand-ink text-lg leading-tight block">RapidVit</span>
            <p className="text-xs text-brand-gray">Administration</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <NavLinks pathname={pathname} />
        </nav>
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-4 text-sm text-brand-gray border-t border-brand-border hover:text-brand-orange"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au site
        </Link>
      </aside>

      {/* Mobile header + menu button */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-brand-border">
        <span className="font-extrabold text-brand-ink">RapidVit Admin</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-2 -mr-2 rounded-lg hover:bg-brand-cream transition"
        >
          <Menu className="w-5 h-5 text-brand-ink" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo className="w-7 h-7 shrink-0" />
                <span className="font-extrabold text-brand-ink text-base">RapidVit Admin</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="p-2 rounded-lg hover:bg-brand-cream transition"
              >
                <X className="w-5 h-5 text-brand-ink" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-5 py-4 text-sm text-brand-gray border-t border-brand-border hover:text-brand-orange"
            >
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
