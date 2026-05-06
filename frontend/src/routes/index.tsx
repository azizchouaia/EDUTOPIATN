import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Crown, PlayCircle, FileText, Award, ShoppingBag, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Edutopia — Learn with Elegance" },
      { name: "description", content: "Discover refined courses, video & PDF lessons, tests with corrections, and a curated marketplace at Edutopia." },
      { property: "og:title", content: "Edutopia — Learn with Elegance" },
      { property: "og:description", content: "Premium e-education: courses, tests, marketplace, subscriptions." },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: PlayCircle, title: "Video Lessons", desc: "High-quality video courses streamed seamlessly across all devices." },
  { icon: FileText, title: "PDF Materials", desc: "Downloadable PDF resources to study anywhere, anytime." },
  { icon: Award, title: "Tests & Corrections", desc: "Built-in quizzes with automatic grading and teacher feedback." },
  { icon: ShoppingBag, title: "Curated Market", desc: "A thoughtful marketplace with promo codes and subscriptions." },
];

const stats = [
  { value: "12k+", label: "Active students" },
  { value: "350+", label: "Premium courses" },
  { value: "98%", label: "Satisfaction" },
  { value: "24/7", label: "Support" },
];

function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bordeaux-deep/90 via-bordeaux-deep/60 to-transparent" />

        <div className="container relative mx-auto px-4 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-bordeaux-deep/40 px-4 py-1.5 text-xs font-medium text-gold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> A new era of online learning
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Learn with <span className="text-gradient-gold">elegance.</span>
              <br />Grow with <span className="italic">Edutopia.</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-xl leading-relaxed">
              A premium e-education platform crafted for serious learners.
              Curated courses, expert teachers, refined tests — all in one
              beautifully designed space.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-gradient-gold text-bordeaux-deep font-semibold hover:opacity-90 shadow-gold">
                <Link to="/courses">Explore courses <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold/60 text-gold bg-transparent hover:bg-gold/10 hover:text-gold">
                <Link to="/login">Join Edutopia</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-gold/20 bg-bordeaux-deep/60 backdrop-blur">
          <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl md:text-4xl font-bold text-gold">{s.value}</div>
                <div className="text-xs uppercase tracking-widest text-primary-foreground/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-[0.3em] text-bordeaux font-semibold">What we offer</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-foreground">Everything you need to succeed</h2>
          <div className="gold-divider mx-auto mt-5" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-gold/40"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-bordeaux text-gold shadow-elegant">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="font-display text-xl font-semibold mt-5 text-bordeaux">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-bordeaux p-10 md:p-16 text-primary-foreground shadow-elegant">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight">
                Ready to start your <span className="text-gradient-gold">journey?</span>
              </h2>
              <p className="mt-4 text-primary-foreground/80 max-w-xl">
                Join thousands of students learning with Edutopia. Pick a plan,
                enroll in your first course, and begin today.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Button asChild size="lg" className="bg-gradient-gold text-bordeaux-deep font-semibold hover:opacity-90">
                <Link to="/login">Create account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold/60 text-gold bg-transparent hover:bg-gold/10 hover:text-gold">
                <Link to="/team"><Users className="mr-2 h-4 w-4" />Meet the team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Modules quick-access */}
      <section className="container mx-auto px-4 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { to: "/courses", icon: BookOpen, title: "Browse courses", desc: "Hundreds of curated programs taught by experts." },
          { to: "/market", icon: ShoppingBag, title: "Visit the market", desc: "Books, kits, and a real checkout flow." },
          { to: "/subscriptions", icon: Crown, title: "Choose a subscription", desc: "Pick your plan for 1 month, 3 months, or 1 year." },
          { to: "/team", icon: Users, title: "Meet the team", desc: "The talented people behind Edutopia." },
        ].map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border border-border bg-card p-7 transition-all hover:border-bordeaux hover:shadow-elegant"
          >
            <c.icon className="h-7 w-7 text-bordeaux" />
            <h3 className="font-display text-xl font-semibold mt-4 text-foreground">{c.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-bordeaux group-hover:gap-2 transition-all">
              Discover <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}
