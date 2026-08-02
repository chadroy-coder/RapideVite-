import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-brand-border bg-brand-cream mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7 shrink-0" />
            <p className="font-extrabold text-brand-ink text-lg">RapideVite</p>
          </div>
          <p className="text-brand-gray mt-2">Tout sa w bezwen, rapid vit.</p>
        </div>
        <div>
          <p className="font-semibold text-brand-ink mb-2">Assistance</p>
          <ul className="space-y-1.5 text-brand-gray">
            <li><Link href="/aide" className="hover:text-brand-orange">Aide et contact</Link></li>
            <li><Link href="/commandes" className="hover:text-brand-orange">Suivre ma commande</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-brand-ink mb-2">Entreprise</p>
          <ul className="space-y-1.5 text-brand-gray">
            <li><Link href="/confidentialite" className="hover:text-brand-orange">Confidentialite</Link></li>
            <li><Link href="/conditions" className="hover:text-brand-orange">Conditions d&apos;utilisation</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
