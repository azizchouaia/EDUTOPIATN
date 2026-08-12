import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Crown, PlayCircle, FileText, Award, ShoppingBag, Users, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Edutopia — Apprenez avec Élégance" },
      { name: "description", content: "Découvrez des cours soignés, leçons vidéo & PDF, tests avec corrections, et une boutique sélectionnée sur Edutopia." },
      { property: "og:title", content: "Edutopia — Apprenez avec Élégance" },
      { property: "og:description", content: "E-éducation premium : cours, tests, boutique, abonnements." },
    ],
  }),
  component: HomePage,
});

const featureIcons = [PlayCircle, FileText, Award, ShoppingBag];
const rawStats = [
  { value: 12000, suffix: "+", statKey: "stat_students" as const },
  { value: 350,   suffix: "+", statKey: "stat_courses" as const },
  { value: 98,    suffix: "%", statKey: "stat_satisfaction" as const },
  { value: 24,    suffix: "/7",statKey: "stat_support" as const },
];
const quickCardDefs = [
  { to: "/courses",       icon: BookOpen,    titleKey: "card_courses_title" as const, descKey: "card_courses_desc" as const },
  { to: "/market",        icon: ShoppingBag, titleKey: "card_market_title" as const,  descKey: "card_market_desc" as const },
  { to: "/subscriptions", icon: Crown,       titleKey: "card_subs_title" as const,    descKey: "card_subs_desc" as const },
  { to: "/team",          icon: Users,       titleKey: "card_team_title" as const,    descKey: "card_team_desc" as const },
];

/* ── Animated counter hook ─────────────────────────── */
function useCountUp(target: number, duration = 1800, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else                  { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

/* ── Scroll-reveal hook ─────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Stat counter card ──────────────────────────────── */
function StatCard({ value, suffix, label, started }: { value: number; suffix: string; label: string; started: boolean }) {
  const count = useCountUp(value, 1600, started);
  return (
    <div>
      <div className="font-display text-3xl md:text-4xl font-bold text-gold tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs uppercase tracking-widest text-primary-foreground/70 mt-1">{label}</div>
    </div>
  );
}

function HomePage() {
  const { t, isRTL } = useLanguage();
  const statsRef  = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const features1 = useReveal(0.1);
  const features2 = useReveal(0.1);
  const cta       = useReveal(0.15);
  const cards     = useReveal(0.1);

  const featureDefs = [
    { icon: featureIcons[0], titleKey: "feat_video_title" as const,  descKey: "feat_video_desc" as const },
    { icon: featureIcons[1], titleKey: "feat_pdf_title" as const,    descKey: "feat_pdf_desc" as const },
    { icon: featureIcons[2], titleKey: "feat_tests_title" as const,  descKey: "feat_tests_desc" as const },
    { icon: featureIcons[3], titleKey: "feat_market_title" as const, descKey: "feat_market_desc" as const },
  ];

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className={`absolute inset-0 ${isRTL ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-bordeaux-deep/95 via-bordeaux-deep/65 to-transparent`} />

        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gold/10 blur-3xl pointer-events-none" style={{ animation: "floatY 6s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-bordeaux/30 blur-3xl pointer-events-none" style={{ animation: "floatY 8s ease-in-out infinite 2s" }} />

        <div className="container relative mx-auto px-4 py-28 md:py-36 grid md:grid-cols-2 gap-12 items-center">
          <div className={`space-y-7 page-enter ${isRTL ? "text-right" : ""}`}>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-bordeaux-deep/40 px-4 py-1.5 text-xs font-medium text-gold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {t("hero_badge")}
            </span>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              {t("hero_title_1")}{" "}
              <span className="text-gradient-gold">{t("hero_title_2")}.</span>
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-xl leading-relaxed">
              {t("hero_subtitle")}
            </p>
            <div className={`flex flex-wrap gap-3 pt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Button
                asChild
                size="lg"
                className="bg-gradient-gold text-bordeaux-deep font-semibold hover:opacity-90 shadow-gold transition-transform hover:scale-105"
                style={{ animation: "pulseGold 3s ease-in-out infinite 2s" }}
              >
                <Link to="/courses">
                  {t("hero_cta")} <ArrowRight className={`h-4 w-4 ${isRTL ? "mr-2 rotate-180" : "ml-2"}`} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gold/60 text-gold bg-transparent hover:bg-gold/10 hover:text-gold transition-transform hover:scale-105"
              >
                <Link to="/login">{t("hero_cta_sub")}</Link>
              </Button>
            </div>
          </div>

          {/* ── Right column: video ── */}
          <div className="hidden md:flex justify-center items-center">
            <div className="relative" style={{ animation: "floatY 5s ease-in-out infinite" }}>
              {/* Glow behind phone */}
              <div className="absolute inset-0 scale-110 rounded-[2.5rem] bg-gold/20 blur-2xl pointer-events-none" />

              {/* Phone frame */}
              <div className="relative rounded-[2.2rem] border-[3px] border-white/20 bg-black shadow-2xl overflow-hidden"
                style={{ width: 240, height: 426 }}>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 h-5 w-16 rounded-full bg-black border border-white/10" />
                {/* YouTube Shorts embed */}
                <iframe
                  src="https://www.youtube.com/embed/ct3a7buni2c?autoplay=1&mute=1&loop=1&playlist=ct3a7buni2c&controls=0&rel=0&modestbranding=1"
                  title="Edutopia demo"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 h-full w-full border-0"
                />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-bordeaux-deep/90 px-3 py-2 backdrop-blur shadow-lg">
                <PlayCircle className="h-4 w-4 text-gold flex-shrink-0" />
                <span className="text-xs font-semibold text-gold">Voir la démo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div ref={statsRef} className="relative border-t border-gold/20 bg-bordeaux-deep/60 backdrop-blur">
          <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {rawStats.map((s) => (
              <StatCard key={s.statKey} value={s.value} suffix={s.suffix} label={t(s.statKey)} started={statsVisible} />
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1 text-primary-foreground/50 text-xs">
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-28">
        <div
          ref={features1.ref}
          className={`text-center max-w-2xl mx-auto mb-16 reveal ${features1.visible ? "visible" : ""}`}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-foreground">
            {t("features_title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("features_subtitle")}</p>
          <div className="gold-divider mx-auto mt-5" />
        </div>

        <div ref={features2.ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureDefs.map((f, i) => (
            <div
              key={f.titleKey}
              className={`group relative rounded-2xl border border-border bg-card p-7 transition-all duration-500 hover:-translate-y-2 hover:shadow-elegant hover:border-gold/40 reveal reveal-delay-${i + 1} ${features2.visible ? "visible" : ""} ${isRTL ? "text-right" : ""}`}
            >
              <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-gold origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-bordeaux text-gold shadow-elegant transition-transform group-hover:scale-110">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="font-display text-xl font-semibold mt-5 text-bordeaux">{t(f.titleKey)}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-24">
        <div
          ref={cta.ref}
          className={`relative overflow-hidden rounded-3xl bg-gradient-bordeaux p-10 md:p-16 text-primary-foreground shadow-elegant reveal ${cta.visible ? "visible" : ""}`}
        >
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-bordeaux-deep/50 blur-3xl pointer-events-none" />
          <div className={`relative grid md:grid-cols-3 gap-8 items-center ${isRTL ? "text-right" : ""}`}>
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight">
                {t("cta_title")}
              </h2>
              <p className="mt-4 text-primary-foreground/80 max-w-xl leading-relaxed">
                {t("cta_subtitle")}
              </p>
            </div>
            <div className={`flex flex-col gap-3 ${isRTL ? "md:items-start" : "md:items-end"}`}>
              <Button asChild size="lg" className="bg-gradient-gold text-bordeaux-deep font-semibold hover:opacity-90 transition-transform hover:scale-105">
                <Link to="/login">{t("cta_button")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-gold/60 text-gold bg-transparent hover:bg-gold/10">
                <Link to="/subscriptions">{t("cta_sub")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK-ACCESS CARDS ────────────────────────────────── */}
      <section
        ref={cards.ref}
        className="container mx-auto px-4 pb-24 grid sm:grid-cols-2 md:grid-cols-4 gap-6"
      >
        {quickCardDefs.map((c, i) => (
          <Link
            key={c.to}
            to={c.to}
            className={`group rounded-2xl border border-border bg-card p-7 transition-all duration-500 hover:border-bordeaux hover:shadow-elegant hover:-translate-y-1 reveal reveal-delay-${i + 1} ${cards.visible ? "visible" : ""} ${isRTL ? "text-right" : ""}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-bordeaux/8 text-bordeaux transition-all group-hover:bg-gradient-bordeaux group-hover:text-gold">
              <c.icon className="h-6 w-6" />
            </span>
            <h3 className="font-display text-lg font-semibold mt-4 text-foreground group-hover:text-bordeaux transition-colors">
              {t(c.titleKey)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(c.descKey)}</p>
            <span className="mt-4 inline-grid h-8 w-8 place-items-center rounded-full border border-bordeaux/25 text-bordeaux transition-all duration-300 group-hover:bg-gradient-bordeaux group-hover:text-gold group-hover:border-transparent">
              <ArrowRight className={`h-4 w-4 transition-transform ${isRTL ? "group-hover:-translate-x-0.5 rotate-180" : "group-hover:translate-x-0.5"}`} />
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}
