import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, MapPin, Phone, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const socialLinks = [
  { href: "https://facebook.com", icon: Facebook, label: "Facebook" },
  { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
  { href: "https://youtube.com", icon: Youtube, label: "YouTube" },
  { href: "https://twitter.com", icon: Twitter, label: "Twitter / X" },
];

const exploreNavDefs = [
  { to: "/courses",       key: "nav_courses" as const },
  { to: "/events",        key: "nav_events" as const },
  { to: "/market",        key: "nav_market" as const },
  { to: "/subscriptions", key: "nav_subscriptions" as const },
  { to: "/team",          key: "nav_team" as const },
  { to: "/reclamations",  key: "nav_support" as const },
];

export function SiteFooter() {
  const { t, isRTL } = useLanguage();
  return (
    <footer className="bg-gradient-bordeaux text-primary-foreground">
      {/* Gold accent edge — elegant transition from page to footer */}
      <div className="h-[3px] w-full bg-gradient-gold" />
      <div className="container mx-auto px-4 pt-16 pb-10 grid gap-10 md:grid-cols-12">

        {/* Brand */}
        <div className={`md:col-span-5 ${isRTL ? "text-right" : ""}`}>
          <Link to="/" className={`inline-flex items-center gap-2 group ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-bordeaux-deep transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-gold" />
            </span>
            <span className="font-display text-3xl font-bold">
              Edu<span className="text-gradient-gold">topia</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/75 leading-relaxed">
            {t("footer_tagline")}
          </p>
          <div className="gold-divider mt-6 mb-6" />
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            {socialLinks.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-primary-foreground/20 text-primary-foreground/60 transition-all hover:border-gold hover:text-gold hover:scale-110"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Explore */}
        <div className={`md:col-span-3 md:col-start-7 ${isRTL ? "text-right" : ""}`}>
          <h4 className="font-display text-base font-semibold mb-5 text-gold uppercase tracking-[0.18em]">{t("footer_platform")}</h4>
          <ul className="space-y-2.5">
            {exploreNavDefs.map(({ to, key }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`group inline-flex items-center gap-1.5 text-sm text-primary-foreground/75 transition-colors hover:text-gold ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <span className="h-px w-0 bg-gold transition-all duration-300 group-hover:w-3" />
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className={`md:col-span-3 ${isRTL ? "text-right" : ""}`}>
          <h4 className="font-display text-base font-semibold mb-5 text-gold uppercase tracking-[0.18em]">{t("footer_contact")}</h4>
          <ul className="space-y-4">
            <li className={`flex items-start gap-3 text-sm text-primary-foreground/75 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Mail className="h-4 w-4 mt-0.5 text-gold shrink-0" />
              <a href="mailto:contact@edutopia.tn" className="hover:text-gold transition-colors">contact@edutopia.tn</a>
            </li>
            <li className={`flex items-start gap-3 text-sm text-primary-foreground/75 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Phone className="h-4 w-4 mt-0.5 text-gold shrink-0" />
              <a href="tel:+21671000000" className="hover:text-gold transition-colors">+216 71 000 000</a>
            </li>
            <li className={`flex items-start gap-3 text-sm text-primary-foreground/75 ${isRTL ? "flex-row-reverse" : ""}`}>
              <MapPin className="h-4 w-4 mt-0.5 text-gold shrink-0" />
              <span>Tunis, Tunisia</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className={`container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-foreground/50 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
          <span>© {new Date().getFullYear()} Edutopia. {t("footer_rights")}</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-gold transition-colors">{t("footer_privacy")}</Link>
            <Link to="/terms" className="hover:text-gold transition-colors">{t("footer_terms")}</Link>
            <Link to="/reclamations" className="hover:text-gold transition-colors">{t("footer_support_link")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
