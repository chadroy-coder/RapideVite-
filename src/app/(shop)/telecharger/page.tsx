import { Download } from "lucide-react";

export default function DownloadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-bold text-xl text-brand-ink mb-2">Telecharger l&apos;application RapidVit</h1>
      <p className="text-brand-gray text-sm mb-6">
        En attendant que l&apos;application soit disponible sur Google Play, vous pouvez l&apos;installer
        directement sur votre telephone Android avec le lien ci-dessous.
      </p>

      <a
        href="/api/download-apk"
        className="flex items-center justify-center gap-2 rounded-full bg-brand-orange text-white font-semibold py-3.5 px-6 shadow-sm hover:bg-brand-orange-dark transition mb-8"
      >
        <Download className="w-5 h-5" />
        Telecharger pour Android
      </a>

      <div className="space-y-5 text-sm">
        <h2 className="font-semibold text-brand-ink">Comment installer</h2>
        <div className="border border-brand-border rounded-2xl p-5 space-y-3">
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <p className="text-brand-gray">
              Appuyez sur le bouton ci-dessus pour telecharger le fichier (RapidVit.apk).
            </p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <p className="text-brand-gray">
              Ouvrez le fichier telecharge. Android va vous avertir que ce n&apos;est pas une application
              du Play Store - c&apos;est normal. Appuyez sur <span className="font-medium text-brand-ink">&quot;Parametres&quot;</span> puis
              autorisez <span className="font-medium text-brand-ink">&quot;Installer des applications inconnues&quot;</span> pour votre navigateur.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <p className="text-brand-gray">
              Retournez au fichier telecharge et appuyez sur <span className="font-medium text-brand-ink">&quot;Installer&quot;</span>.
              L&apos;application RapidVit apparaitra sur votre ecran d&apos;accueil.
            </p>
          </div>
        </div>
        <p className="text-xs text-brand-gray">
          Ce fichier est publie directement par RapidVit et est sans danger. Vous recevrez les mises a
          jour de l&apos;application via ce meme lien jusqu&apos;a sa disponibilite sur Google Play.
        </p>
      </div>
    </div>
  );
}
