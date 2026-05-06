import { Link } from "@tanstack/react-router";
import { GraduationCap, Mail, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-gradient-bordeaux text-primary-foreground mt-24">
      <div className="container mx-auto px-4 py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-bordeaux-deep">
              <GraduationCap className="h-5 w-5 text-gold" />
            </span>
            <span className="font-display text-3xl font-bold">
              Edu<span className="text-gradient-gold">topia</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/80 leading-relaxed">
            A premium e-education platform where teachers craft refined courses,
            students grow with curated tests and corrections, and a thoughtful
            marketplace meets every learner.
          </p>
          <div className="gold-divider mt-6" />
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold mb-4 text-gold">Explore</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/courses" className="hover:text-gold transition-colors">Courses</Link></li>
            <li><Link to="/market" className="hover:text-gold transition-colors">Market</Link></li>
            <li><Link to="/team" className="hover:text-gold transition-colors">Our Team</Link></li>
            <li><Link to="/reclamations" className="hover:text-gold transition-colors">Support</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg font-semibold mb-4 text-gold">Contact</h4>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-gold" /> hello@edutopia.com</li>
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-gold" /> +33 1 23 45 67 89</li>
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-gold" /> Paris, France</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 py-6 text-xs text-primary-foreground/60 text-center">
          © {new Date().getFullYear()} Edutopia. Crafted with care.
        </div>
      </div>
    </footer>
  );
}
