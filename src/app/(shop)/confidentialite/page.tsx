export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-bold text-xl text-brand-ink mb-4">Politique de confidentialite</h1>
      <div className="space-y-5 text-sm text-brand-gray leading-relaxed">
        <p>Derniere mise a jour : 26 aout 2026.</p>

        <p>
          RapidVit (&quot;nous&quot;) exploite le site et l&apos;application RapidVit, un service de
          livraison d&apos;epicerie en Haiti. Cette politique explique quelles informations nous
          collectons, pourquoi, et comment elles sont protegees.
        </p>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Informations que nous collectons</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nom complet, numero de telephone et, si fourni, adresse email</li>
            <li>Mot de passe (stocke de maniere chiffree, jamais en texte clair)</li>
            <li>Adresse de livraison et localisation GPS que vous partagez pour vos commandes</li>
            <li>Historique et contenu de vos commandes</li>
            <li>Informations de paiement necessaires au traitement (carte via Stripe, ou reference
              de transaction MonCash / NatCash / virement Sogebank) - nous ne stockons pas les
              numeros de carte complets, ceux-ci sont traites directement par Stripe</li>
            <li>Localisation GPS du livreur pendant une livraison en cours, afin de vous permettre
              de suivre votre commande en temps reel</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Comment nous utilisons ces informations</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Traiter et livrer vos commandes</li>
            <li>Vous authentifier et securiser votre compte</li>
            <li>Vous contacter au sujet d&apos;une commande (statut, substitution d&apos;article,
              probleme de paiement)</li>
            <li>Ameliorer notre service et notre catalogue de produits</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Partage des informations</h2>
          <p>
            Nous ne vendons pas vos donnees personnelles. Elles sont partagees uniquement avec :
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Notre equipe de preparation et nos livreurs, dans la mesure necessaire pour
              completer votre commande</li>
            <li>Nos prestataires de paiement (Stripe, et les services de transfert mobile utilises
              en Haiti) pour traiter vos paiements</li>
            <li>Les autorites, si la loi l&apos;exige</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Conservation et securite</h2>
          <p>
            Vos donnees sont conservees tant que votre compte est actif, et protegees par des
            mesures techniques standards (connexion chiffree, acces restreint). Vous pouvez
            demander la suppression de votre compte et de vos donnees a tout moment en nous
            contactant.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Vos choix</h2>
          <p>
            Le partage de votre localisation GPS est volontaire et limite au suivi de vos
            commandes en cours. Vous pouvez demander l&apos;acces, la correction ou la suppression
            de vos donnees en nous contactant a l&apos;adresse ci-dessous.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-1">Nous contacter</h2>
          <p>
            Pour toute question concernant cette politique ou vos donnees personnelles, ecrivez-nous
            a{" "}
            <a href="mailto:rapidvitht@gmail.com" className="text-brand-orange font-medium">
              rapidvitht@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
