import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, BookOpen, CheckCircle2, Trophy, BrainCircuit,
  Loader2, Target, ArrowRight, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useMe } from "@/hooks/useAuth";

export const Route = createFileRoute("/progress")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [{ title: "Ma progression — Edutopia" }],
  }),
  component: ProgressPage,
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

function StatCard({ icon, label, value, sub, tint }: { icon: React.ReactNode; label: string; value: string; sub?: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tint + "1a", color: tint }}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold text-foreground tabular-nums leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressPage() {
  const { data: user } = useMe();
  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["my-progress"],
    queryFn: async () => (await api.get<ProgressData>("/courses/progress/me")).data,
  });

  const t = data?.totals;
  const firstName = user?.first_name ?? "";

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-14">
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">Mon espace</span>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold">
            {firstName ? `Ta progression, ${firstName} 📈` : "Ma progression"}
          </h1>
          {data?.track?.title && (
            <p className="mt-3 text-primary-foreground/75">{data.track.title}</p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 space-y-8 page-enter">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-bordeaux" /></div>
        ) : !data ? (
          <p className="py-20 text-center text-muted-foreground">Impossible de charger ta progression.</p>
        ) : (
          <>
            {/* Overall ring + stat cards */}
            <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bordeaux, #7d1022)" strokeWidth="3.5"
                      strokeLinecap="round" strokeDasharray={`${(t!.overall_pct / 100) * 97.4} 97.4`} />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-bordeaux tabular-nums">{t!.overall_pct}%</span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Progression globale</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t!.resources_completed}/{t!.resources_total} ressources</p>
                </div>
              </div>
              <StatCard icon={<BookOpen className="h-5 w-5" />} label="Chapitres terminés" value={`${t!.chapters_completed}/${t!.chapters_total}`} tint="#3b82f6" />
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Quiz réussis" value={String(t!.quizzes_passed)} tint="#10b981" />
              <StatCard icon={<BrainCircuit className="h-5 w-5" />} label="Sessions Khlayel" value={String(t!.khlayel_sessions)} tint="#8b5cf6" />
            </div>

            {/* Per-subject progress */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-bordeaux" /> Progression par matière
              </h2>
              {data.subjects.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Aucune matière disponible pour ta classe.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  {data.subjects.map(s => (
                    <Link key={s.id} to="/courses/$subjectSlug" params={{ subjectSlug: s.slug }} className="block group">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground flex items-center gap-2 group-hover:text-bordeaux transition-colors">
                          <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md text-xs font-bold"
                            style={{ backgroundColor: (s.color ?? "#7d1022") + "1a", color: s.color ?? "#7d1022" }}>
                            {s.icon && [...s.icon].length <= 2 ? s.icon : s.name.charAt(0).toUpperCase()}
                          </span>
                          {s.name}
                        </span>
                        <span className="text-muted-foreground tabular-nums">{s.completed_resources}/{s.total_resources} · {s.pct}%</span>
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

            {/* Weak chapters / à revoir */}
            {data.weak_chapters.length > 0 && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
                <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" /> À revoir
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Ces chapitres méritent une deuxième passe — ou demande à Khlayel de t'aider.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {data.weak_chapters.map(c => (
                    <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                      <span className="text-xs text-muted-foreground">{c.subject}</span>
                      <span className="font-medium text-foreground truncate">{c.title}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-4 bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                  <Link to="/khlayel"><BrainCircuit className="mr-1.5 h-4 w-4" /> Réviser avec Khlayel</Link>
                </Button>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5">
                <Link to="/courses"><GraduationCap className="mr-1.5 h-4 w-4" /> Continuer les cours <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
