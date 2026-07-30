import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BookOpen, TrendingUp, GraduationCap, CheckCircle2, Trophy,
  BrainCircuit, Target, ArrowRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import api, { assetUrl } from "@/lib/api";
import { formatAcademicTrack } from "@/lib/academic";
import { isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Edutopia" },
      { name: "description", content: "Your personal learning dashboard." },
    ],
  }),
  component: DashboardPage,
});

interface ProgressData {
  track: { title?: string } | null;
  subjects: { id: number; name: string; slug: string; icon: string | null; color: string | null; total_resources: number; completed_resources: number; pct: number }[];
  totals: {
    chapters_completed: number; chapters_total: number;
    resources_completed: number; resources_total: number;
    quizzes_passed: number; khlayel_sessions: number; overall_pct: number;
  };
  weak_chapters: { id: number; title: string; subject: string }[];
}

function DashboardPage() {
  const { t } = useLanguage();
  const { data: user, isLoading: userLoading } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !user) return;
    if (user.role === "teacher") { window.location.replace("/teacher"); return; }
    if (user.role === "parent")  { window.location.replace("/parent");  return; }
    if (user.role === "admin")   { window.location.replace("/admin");   return; }
  }, [mounted, user]);

  const { data, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ["my-progress"],
    queryFn: async () => (await api.get<ProgressData>("/courses/progress/me")).data,
    enabled: mounted,
    retry: false,
  });

  const isLoading = userLoading || !mounted;
  const totals = data?.totals;

  if (mounted && user && user.role !== "student") {
    return (
      <section className="container mx-auto grid min-h-[60vh] place-items-center px-4 py-16">
        <p className="text-muted-foreground">Redirecting…</p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-10 page-enter space-y-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-bordeaux ring-4 ring-gold/30 shadow-elegant shrink-0">
            {isLoading ? (
              <GraduationCap className="h-6 w-6 text-gold/60" />
            ) : user?.avatar_url ? (
              <img src={assetUrl(user.avatar_url) ?? ""} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="font-display text-lg font-bold text-gold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash_greeting")}</p>
            {isLoading
              ? <Skeleton className="h-7 w-40 rounded mt-1" />
              : <h1 className="font-display text-2xl font-bold text-foreground">{user?.first_name} {user?.last_name}</h1>
            }
            {!isLoading && (
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className="bg-gold/15 text-bordeaux border border-gold/40 hover:bg-gold/15 text-xs">
                  {user?.college ?? "Edutopia"}
                </Badge>
                {formatAcademicTrack(user ?? {}) && (
                  <Badge className="bg-white dark:bg-card text-bordeaux border border-bordeaux/20 hover:bg-white text-xs">
                    {formatAcademicTrack(user ?? {})}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5">
            <Link to="/khlayel"><BrainCircuit className="mr-1.5 h-4 w-4" /> Khlayel</Link>
          </Button>
          <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
            <Link to="/courses">{t("dash_browse")}</Link>
          </Button>
        </div>
      </div>

      {progressLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : !data ? (
        <p className="py-16 text-center text-muted-foreground">Impossible de charger ta progression.</p>
      ) : (
        <>
          {/* ── Overview ── */}
          <div className="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bordeaux, #7d1022)" strokeWidth="3.5"
                    strokeLinecap="round" strokeDasharray={`${(totals!.overall_pct / 100) * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-bordeaux tabular-nums">{totals!.overall_pct}%</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Progression globale</p>
                <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">{totals!.resources_completed}/{totals!.resources_total} ressources</p>
              </div>
            </div>
            {[
              { label: "Chapitres terminés", value: `${totals!.chapters_completed}/${totals!.chapters_total}`, icon: BookOpen, tint: "#3b82f6" },
              { label: "Quiz réussis", value: String(totals!.quizzes_passed), icon: Trophy, tint: "#10b981" },
              { label: "Sessions Khlayel", value: String(totals!.khlayel_sessions), icon: BrainCircuit, tint: "#8b5cf6" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: s.tint + "1a", color: s.tint }}>
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-2xl font-bold text-foreground leading-none tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Per-subject progress ── */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-bordeaux" /> Progression par matière
              </h2>
              <Link to="/courses" className="text-xs font-medium text-bordeaux hover:underline">{t("nav_courses")}</Link>
            </div>
            {data.subjects.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <GraduationCap className="h-10 w-10 text-bordeaux/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune matière disponible pour ta classe.</p>
                <Button asChild size="sm" className="mt-4 bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                  <Link to="/courses">{t("dash_browse")}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {data.subjects.map(s => (
                  <Link key={s.id} to="/courses/$subjectSlug" params={{ subjectSlug: s.slug }} className="block group">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-foreground flex items-center gap-2 group-hover:text-bordeaux transition-colors">
                        <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md text-xs font-bold"
                          style={{ backgroundColor: (s.color ?? "#7d1022") + "1a", color: s.color ?? "#7d1022" }}>
                          {s.icon && [...s.icon].length <= 2 ? s.icon : s.name.charAt(0).toUpperCase()}
                        </span>
                        {s.name}
                        {s.pct >= 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </span>
                      <span className="text-muted-foreground tabular-nums shrink-0">{s.completed_resources}/{s.total_resources} · {s.pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.pct}%`, background: s.pct >= 100 ? "#22c55e" : "var(--bordeaux, #7d1022)" }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── À revoir ── */}
          {data.weak_chapters.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" /> À revoir
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Ces chapitres méritent une deuxième passe — ou demande à Khlayel.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {data.weak_chapters.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                    <span className="text-xs text-muted-foreground shrink-0">{c.subject}</span>
                    <span className="font-medium text-foreground truncate">{c.title}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-4 bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                <Link to="/khlayel"><BrainCircuit className="mr-1.5 h-4 w-4" /> Réviser avec Khlayel</Link>
              </Button>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5">
              <Link to="/courses"><GraduationCap className="mr-1.5 h-4 w-4" /> Continuer les cours <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
