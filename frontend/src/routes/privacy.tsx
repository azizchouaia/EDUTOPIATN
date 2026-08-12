import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Edutopia" },
      { name: "description", content: "Comment Edutopia collecte, utilise et protège vos données personnelles." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
          <h1 className="font-display text-4xl font-bold text-foreground">Politique de confidentialité</h1>
          <div className="gold-divider mx-auto my-4" />
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er janvier 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/85 leading-7">

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Qui sommes-nous ?</h2>
            <p>
              Edutopia (<strong>edutopia.tn</strong>) est une plateforme éducative en ligne opérée depuis Tunis, Tunisie.
              Nous nous engageons à protéger vos données personnelles et à respecter votre vie privée conformément
              aux lois tunisiennes applicables en matière de protection des données.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Données collectées</h2>
            <p>Nous collectons les types d'informations personnelles suivants :</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li><strong>Informations de compte :</strong> prénom, nom, adresse e-mail, rôle (élève/enseignant/parent) et informations éducatives telles que la classe et la section</li>
              <li><strong>Données de profil :</strong> âge, établissement, photo de profil (facultative)</li>
              <li><strong>Informations de paiement :</strong> mode de paiement, références de transaction (nous ne stockons pas les numéros de carte complets)</li>
              <li><strong>Données d'utilisation :</strong> progression dans les cours, consultations de ressources, résultats de tests, horodatages de connexion</li>
              <li><strong>Communications :</strong> messages envoyés via le système de support/réclamations</li>
            </ul>
            <p className="mt-3">
              Si vous vous connectez avec Google, nous recevons votre nom, adresse e-mail et photo de profil de Google,
              tel qu'autorisé par vous.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Utilisation de vos données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Créer et gérer votre compte et vos abonnements</li>
              <li>Délivrer le contenu des cours et suivre votre progression</li>
              <li>Traiter les paiements et générer les codes d'activation</li>
              <li>Envoyer des e-mails transactionnels (bienvenue, réinitialisation de mot de passe, mises à jour d'abonnement)</li>
              <li>Offrir une visibilité parentale sur les comptes des enfants liés</li>
              <li>Améliorer et maintenir la plateforme via des analyses anonymisées</li>
              <li>Répondre aux demandes de support et résoudre les réclamations</li>
            </ul>
            <p className="mt-3">
              Nous ne vendons pas vos données personnelles à des tiers. Nous n'utilisons pas vos données à des fins publicitaires.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Stockage et sécurité des données</h2>
            <p>
              Vos données sont stockées sur des serveurs sécurisés. Nous mettons en œuvre des mesures de sécurité standard :
              hachage des mots de passe (bcrypt), authentification JWT, chiffrement HTTPS en transit et contrôles d'accès
              limitant les données aux seuls utilisateurs autorisés.
            </p>
            <p className="mt-3">
              Bien que nous prenions la sécurité au sérieux, aucun système n'est totalement immunisé contre les risques.
              Nous vous encourageons à utiliser un mot de passe fort et unique, et à nous notifier immédiatement si vous
              suspectez un accès non autorisé à votre compte.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Services tiers</h2>
            <p>Nous utilisons les services tiers suivants susceptibles de traiter vos données :</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li><strong>Konnect :</strong> passerelle de paiement tunisienne pour le traitement des paiements en ligne (soumise à la propre politique de confidentialité de Konnect)</li>
              <li><strong>Google Sign-In :</strong> vérification d'identité OAuth — utilisé uniquement si vous choisissez de vous connecter avec Google</li>
              <li><strong>Fournisseur SMTP :</strong> pour l'envoi d'e-mails transactionnels</li>
            </ul>
            <p className="mt-3">
              Nous ne partageons que les données strictement nécessaires avec ces services et ne leur permettons pas
              d'utiliser vos données à leurs propres fins marketing.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Cookies et stockage local</h2>
            <p>
              Edutopia utilise un stockage navigateur minimal (localStorage) pour maintenir votre session et vos préférences
              (thème, langue). Nous n'utilisons pas de cookies de suivi tiers ni de cookies publicitaires. Vous pouvez
              effacer le stockage local de votre navigateur à tout moment, ce qui vous déconnectera de la plateforme.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Vos droits</h2>
            <p>Vous avez le droit de :</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Accéder aux données personnelles que nous détenons à votre sujet</li>
              <li>Corriger des données inexactes ou incomplètes via les paramètres de votre profil</li>
              <li>Demander la suppression de votre compte et des données personnelles associées</li>
              <li>Vous opposer au traitement de vos données dans certaines circonstances</li>
              <li>Retirer votre consentement lorsque le traitement est basé sur celui-ci</li>
            </ul>
            <p className="mt-3">
              Pour exercer l'un de ces droits, contactez-nous à{" "}
              <a href="mailto:contact@edutopia.tn" className="font-medium text-bordeaux hover:underline">
                contact@edutopia.tn
              </a>. Nous répondrons dans un délai de 30 jours.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Conservation des données</h2>
            <p>
              Nous conservons vos données personnelles aussi longtemps que votre compte est actif ou que cela est
              nécessaire pour fournir nos services. Si vous fermez votre compte, nous supprimerons ou anonymiserons
              vos données dans un délai de 90 jours, sauf obligation légale ou financière contraire.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Modifications de cette politique</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité périodiquement. Nous vous informerons
              des modifications importantes en publiant la nouvelle version sur cette page avec une date mise à jour.
              Nous vous encourageons à consulter régulièrement cette politique.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">10. Nous contacter</h2>
            <p>
              Pour toute question, préoccupation ou demande concernant cette politique, contactez-nous :
            </p>
            <div className="mt-3 text-sm space-y-1">
              <p><strong>E-mail :</strong>{" "}<a href="mailto:contact@edutopia.tn" className="text-bordeaux hover:underline">contact@edutopia.tn</a></p>
              <p><strong>Téléphone :</strong> +216 71 000 000</p>
              <p><strong>Adresse :</strong> Tunis, Tunisie</p>
            </div>
          </div>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
          <Link to="/" className="text-bordeaux hover:underline font-medium">← Retour à l'accueil</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-bordeaux transition-colors">Conditions d'utilisation</Link>
          <Link to="/login" className="text-muted-foreground hover:text-bordeaux transition-colors">Connexion</Link>
        </div>
      </div>
    </section>
  );
}
