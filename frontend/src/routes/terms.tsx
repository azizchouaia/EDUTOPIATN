import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Edutopia" },
      { name: "description", content: "Read the Edutopia Terms of Service governing your use of the platform." },
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
          <h1 className="font-display text-4xl font-bold text-foreground">Terms of Service</h1>
          <div className="gold-divider mx-auto my-4" />
          <p className="text-sm text-muted-foreground">Last updated: January 1, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none space-y-8 text-foreground/85 leading-7">

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Edutopia platform (<strong>edutopia.tn</strong>), you agree to be bound by these
              Terms of Service and our{" "}
              <Link to="/privacy" className="font-medium text-bordeaux hover:underline">Privacy Policy</Link>.
              If you do not agree to these terms, please do not use the platform. These terms apply to all users,
              including students, parents, teachers, and visitors.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Description of the Platform</h2>
            <p>
              Edutopia is an online educational platform based in Tunisia offering digital courses, video and PDF
              lessons, progress tracking, practice tests, live events, and an educational marketplace. The platform
              is designed for students, parents following their children's progress, and qualified teachers.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p>
              You must create an account to access most features of Edutopia. You are responsible for maintaining the
              confidentiality of your credentials and for all activities that occur under your account. You must
              provide accurate and complete information during registration and keep it up to date. Accounts may not
              be shared or transferred.
            </p>
            <p className="mt-3">
              Edutopia reserves the right to suspend or terminate accounts that violate these terms, provide false
              information, or engage in any conduct that harms the platform or other users.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Subscriptions and Payments</h2>
            <p>
              Access to premium content requires a paid subscription. Subscription fees are charged in Tunisian Dinars
              (TND) and are payable via supported methods including bank transfer and Konnect online payment. All prices
              are displayed on the subscription page and are inclusive of applicable taxes.
            </p>
            <p className="mt-3">
              Subscriptions are non-refundable once activated, except where required by applicable Tunisian law. You are
              responsible for ensuring your payment information is accurate and up to date.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Content and Intellectual Property</h2>
            <p>
              All content on the Edutopia platform — including courses, videos, PDFs, exercises, and design — is the
              property of Edutopia or its licensed content providers and is protected by Tunisian and international
              intellectual property laws. You may not reproduce, distribute, modify, or publicly display any content
              without prior written permission.
            </p>
            <p className="mt-3">
              You may view and download content solely for your personal, non-commercial educational use.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
              <li>Use the platform for any unlawful purpose or in violation of these terms</li>
              <li>Share your account credentials or activation codes with third parties</li>
              <li>Attempt to access systems or data you are not authorized to access</li>
              <li>Harass, abuse, or harm other users or platform staff</li>
              <li>Upload, post, or transmit viruses or any other harmful code</li>
              <li>Scrape, crawl, or otherwise extract content from the platform in an automated fashion</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p>
              Edutopia is provided "as is" and "as available." We do not guarantee that the platform will be
              uninterrupted, error-free, or completely secure. To the maximum extent permitted by law, Edutopia
              disclaims all warranties and shall not be liable for any indirect, incidental, or consequential damages
              arising from your use of the platform.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Modifications to the Terms</h2>
            <p>
              Edutopia reserves the right to modify these Terms of Service at any time. We will notify users of
              significant changes by posting an updated version on this page. Your continued use of the platform
              after changes are posted constitutes your acceptance of the revised terms.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p>
              These Terms of Service are governed by the laws of the Republic of Tunisia. Any disputes arising
              from or relating to these terms shall be subject to the exclusive jurisdiction of the courts of Tunis.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">10. Contact</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:contact@edutopia.tn" className="font-medium text-bordeaux hover:underline">
                contact@edutopia.tn
              </a>
              .
            </p>
          </div>

        </div>

        {/* Footer nav */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
          <Link to="/" className="text-bordeaux hover:underline font-medium">← Back to Home</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-bordeaux transition-colors">Privacy Policy</Link>
          <Link to="/login" className="text-muted-foreground hover:text-bordeaux transition-colors">Sign In</Link>
        </div>
      </div>
    </section>
  );
}
