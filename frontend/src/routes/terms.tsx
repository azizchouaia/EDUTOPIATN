import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — Edutopia" },
      { name: "description", content: "Lisez les Conditions d'utilisation d'Edutopia régissant votre usage de la plateforme." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <section className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-gradient-bordeaux">
              <GraduationCap className="h-5 w-5 text-gold" />
            </span>
            <span className="font-display text-2xl font-bold text-bordeaux">Edutopia</span>
          </Link>
          <h1 className="font-display text-4xl font-bold text-foreground">Conditions d'utilisation</h1>
          <div className="gold-divider mx-auto my-4" />
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er janvier 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none space-y-8 text-foreground/85 leading-7">

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Acceptation des conditions</h2>
            <p>
              En accédant ou en utilisant la plateforme Edutopia (<strong>edutopia.tn</strong>), vous acceptez d'être lié
              par ces Conditions d'utilisation et notre{" "}
              <Link to="/privacy" className="font-medium text-bordeaux hover:underline">Politique de confidentialité</Link>.
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme. Ces conditions s'appliquent
              à tous les utilisateurs, y compris les élèves, les parents, les enseignants et les visiteurs.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Description de la plateforme</h2>
            <p>
              Edutopia est une plateforme éducative en ligne basée en Tunisie, proposant des cours numériques, des leçons
              en vidéo et PDF, le suivi de la progression, des tests d'entraînement, des événements en direct et une
              marketplace éducative. La plateforme est conçue pour les élèves, les parents suivant la progression de
              leurs enfants et les enseignants qualifiés.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Comptes utilisateurs</h2>
            <p>
              Vous devez créer un compte pour accéder à la plupart des fonctionnalités d'Edutopia. Vous êtes responsable
              de la confidentialité de vos identifiants et de toutes les activités effectuées sous votre compte. Vous devez
              fournir des informations exactes et complètes lors de l'inscription et les maintenir à jour. Les comptes ne
              peuvent être ni partagés ni transférés.
            </p>
            <p className="mt-3">
              Edutopia se réserve le droit de suspendre ou de résilier les comptes qui violeraient ces conditions,
              fourniraient de fausses informations ou adopteraient un comportement nuisant à la plateforme ou aux autres utilisateurs.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Abonnements et paiements</h2>
            <p>
              L'accès au contenu premium nécessite un abonnement payant. Les frais d'abonnement sont facturés en Dinars
              Tunisiens (DT) et sont payables via les méthodes supportées, notamment virement bancaire et paiement en ligne
              Konnect. Tous les prix sont affichés sur la page d'abonnement et incluent les taxes applicables.
            </p>
            <p className="mt-3">
              Les abonnements ne sont pas remboursables une fois activés, sauf disposition contraire de la loi tunisienne
              applicable. Vous êtes responsable de l'exactitude de vos informations de paiement.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Contenu et propriété intellectuelle</h2>
            <p>
              Tout le contenu de la plateforme Edutopia — cours, vidéos, PDF, exercices et design — est la propriété
              d'Edutopia ou de ses fournisseurs de contenu sous licence, et est protégé par les lois tunisiennes et
              internationales sur la propriété intellectuelle. Vous ne pouvez pas reproduire, distribuer, modifier ou
              afficher publiquement ce contenu sans autorisation écrite préalable.
            </p>
            <p className="mt-3">
              Vous pouvez consulter et télécharger du contenu uniquement pour votre usage éducatif personnel et non commercial.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Utilisation acceptable</h2>
            <p>Vous vous engagez à ne pas :</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Utiliser la plateforme à des fins illicites ou en violation de ces conditions</li>
              <li>Partager vos identifiants ou codes d'activation avec des tiers</li>
              <li>Tenter d'accéder à des systèmes ou données auxquels vous n'êtes pas autorisé</li>
              <li>Harceler, abuser ou nuire à d'autres utilisateurs ou au personnel de la plateforme</li>
              <li>Téléverser, publier ou transmettre des virus ou tout autre code malveillant</li>
              <li>Extraire automatiquement du contenu de la plateforme par scraping ou crawling</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Limitation de responsabilité</h2>
            <p>
              Edutopia est fourni « en l'état » et « selon disponibilité ». Nous ne garantissons pas que la plateforme
              sera ininterrompue, sans erreur ou totalement sécurisée. Dans les limites autorisées par la loi, Edutopia
              décline toute garantie et ne pourra être tenu responsable de dommages indirects, accessoires ou consécutifs
              résultant de votre utilisation de la plateforme.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Modifications des conditions</h2>
            <p>
              Edutopia se réserve le droit de modifier ces Conditions d'utilisation à tout moment. Nous notifierons les
              utilisateurs des modifications importantes en publiant une version mise à jour sur cette page. Votre
              utilisation continue de la plateforme après publication des modifications vaut acceptation des nouvelles conditions.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Droit applicable</h2>
            <p>
              Ces Conditions d'utilisation sont régies par les lois de la République Tunisienne. Tout litige découlant
              de ou lié à ces conditions sera soumis à la juridiction exclusive des tribunaux de Tunis.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">10. Contact</h2>
            <p>
              Pour toute question concernant ces Conditions d'utilisation, contactez-nous à{" "}
              <a href="mailto:contact@edutopia.tn" className="font-medium text-bordeaux hover:underline">
                contact@edutopia.tn
              </a>
              .
            </p>
          </div>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
          <Link to="/" className="text-bordeaux hover:underline font-medium">← Retour à l'accueil</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-bordeaux transition-colors">Politique de confidentialité</Link>
          <Link to="/login" className="text-muted-foreground hover:text-bordeaux transition-colors">Connexion</Link>
        </div>
      </div>
    </section>
  );
}
