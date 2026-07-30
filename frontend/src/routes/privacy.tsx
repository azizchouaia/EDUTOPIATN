import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Edutopia" },
      { name: "description", content: "How Edutopia collects, uses, and protects your personal data." },
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
          <h1 className="font-display text-4xl font-bold text-foreground">Privacy Policy</h1>
          <div className="gold-divider mx-auto my-4" />
          <p className="text-sm text-muted-foreground">Last updated: January 1, 2025</p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-foreground/85 leading-7">

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Who We Are</h2>
            <p>
              Edutopia (<strong>edutopia.tn</strong>) is an online educational platform operated from Tunis, Tunisia.
              We are committed to protecting your personal data and respecting your privacy in accordance with
              applicable Tunisian data protection laws.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Data We Collect</h2>
            <p>We collect the following types of personal information:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li><strong>Account information:</strong> first name, last name, email address, role (student/teacher/parent), and educational details such as grade and section</li>
              <li><strong>Profile data:</strong> age, institution, avatar photo (optional)</li>
              <li><strong>Payment information:</strong> payment method, transaction references (we do not store full card numbers)</li>
              <li><strong>Usage data:</strong> course progress, resource views, test results, login timestamps</li>
              <li><strong>Communications:</strong> messages sent via the support/reclamations system</li>
            </ul>
            <p className="mt-3">
              If you sign in with Google, we receive your name, email address, and profile picture from Google as
              authorized by you.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. How We Use Your Data</h2>
            <p>Your data is used to:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Create and manage your account and subscriptions</li>
              <li>Deliver course content and track your learning progress</li>
              <li>Process payments and generate activation codes</li>
              <li>Send transactional emails (welcome, password reset, subscription updates)</li>
              <li>Provide parental visibility for linked children's accounts</li>
              <li>Improve and maintain the platform through anonymized analytics</li>
              <li>Respond to support requests and resolve complaints</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties. We do not use your data for advertising purposes.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored on secured servers. We implement industry-standard security measures including
              password hashing (bcrypt), JWT-based authentication, HTTPS encryption in transit, and access controls
              that restrict data to authorized users only.
            </p>
            <p className="mt-3">
              While we take security seriously, no system is completely immune to risks. We encourage you to use a
              strong, unique password and to notify us immediately if you suspect unauthorized access to your account.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li><strong>Konnect:</strong> Tunisian payment gateway for processing online payments (governed by Konnect's own privacy policy)</li>
              <li><strong>Google Sign-In:</strong> OAuth identity verification — only used if you choose to sign in with Google</li>
              <li><strong>SMTP email provider:</strong> for sending transactional emails</li>
            </ul>
            <p className="mt-3">
              We only share the minimum data necessary with these services and do not permit them to use your data
              for their own marketing purposes.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
            <p>
              Edutopia uses minimal browser storage (localStorage) to maintain your login session and preferences such
              as theme and language. We do not use third-party tracking cookies or advertising cookies. You can clear
              your browser's local storage at any time, which will log you out of the platform.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data via your profile settings</li>
              <li>Request deletion of your account and associated personal data</li>
              <li>Object to processing of your data in certain circumstances</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:contact@edutopia.tn" className="font-medium text-bordeaux hover:underline">
                contact@edutopia.tn
              </a>. We will respond within 30 days.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services.
              If you close your account, we will delete or anonymize your personal data within 90 days, except where
              we are required to retain it for legal or financial compliance purposes.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by
              posting the new policy on this page with an updated date. We encourage you to review this policy
              periodically.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please reach us at:
            </p>
            <div className="mt-3 text-sm space-y-1">
              <p><strong>Email:</strong>{" "}<a href="mailto:contact@edutopia.tn" className="text-bordeaux hover:underline">contact@edutopia.tn</a></p>
              <p><strong>Phone:</strong> +216 71 000 000</p>
              <p><strong>Address:</strong> Tunis, Tunisia</p>
            </div>
          </div>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
          <Link to="/" className="text-bordeaux hover:underline font-medium">← Back to Home</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-bordeaux transition-colors">Terms of Service</Link>
          <Link to="/login" className="text-muted-foreground hover:text-bordeaux transition-colors">Sign In</Link>
        </div>
      </div>
    </section>
  );
}
