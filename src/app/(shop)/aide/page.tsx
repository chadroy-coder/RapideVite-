export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose prose-sm">
      <h1 className="font-bold text-xl text-brand-ink mb-4">Aide et contact</h1>
      <div className="space-y-4 text-sm text-brand-gray">
        <p>
          Notre equipe RapideVite est disponible pour vous aider avec vos commandes, livraisons et
          questions sur les produits.
        </p>
        <div className="border border-brand-border rounded-2xl p-5">
          <p className="font-semibold text-brand-ink mb-1">Telephone / WhatsApp</p>
          <p>+509 0000 0000</p>
        </div>
        <div className="border border-brand-border rounded-2xl p-5">
          <p className="font-semibold text-brand-ink mb-1">Email</p>
          <p>support@rapidevite.ht</p>
        </div>
        <div className="border border-brand-border rounded-2xl p-5">
          <p className="font-semibold text-brand-ink mb-1">Heures d&apos;operation</p>
          <p>Lundi - Dimanche, 7h00 - 21h00</p>
        </div>
        <h2 className="font-semibold text-brand-ink mt-6">Questions frequentes</h2>
        <div>
          <p className="font-medium text-brand-ink">Combien de temps prend la livraison ?</p>
          <p>En general entre 30 et 60 minutes selon votre zone.</p>
        </div>
        <div>
          <p className="font-medium text-brand-ink">Quels modes de paiement acceptez-vous ?</p>
          <p>Paiement a la livraison, MonCash, NatCash et carte bancaire.</p>
        </div>
      </div>
    </div>
  );
}
