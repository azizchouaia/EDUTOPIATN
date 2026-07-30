import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CircleCheckBig, CreditCard, Loader2, TrendingUp, UserRound } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/hooks/useAuth";
import api from "@/lib/api";
import { formatAcademicTrack } from "@/lib/academic";
import { isAuthenticated } from "@/lib/auth";
import type { ParentChildProgressResponse, ParentChildSummary } from "@/lib/types";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs shadow-elegant">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-foreground">{p.value}{p.unit ?? ""}</span>
        </p>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/parent")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Parent Workspace - Edutopia" },
      { name: "description", content: "Follow your child's learning progress from a parent dashboard." },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  const { data: user } = useMe();
  const [mounted, setMounted] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    if (user.role === "admin") {
      window.location.replace("/admin");
      return;
    }
    if (user.role === "teacher") {
      window.location.replace("/teacher");
      return;
    }
    if (user.role === "student") {
      window.location.replace("/dashboard");
    }
  }, [mounted, user]);

  const { data: children = [], isLoading } = useQuery<ParentChildSummary[]>({
    queryKey: ["parent-children"],
    enabled: mounted && user?.role === "parent",
    queryFn: async () => (await api.get<ParentChildSummary[]>("/parent/children")).data,
  });

  useEffect(() => {
    if (children.length === 0) {
      setSelectedChildId(null);
      return;
    }

    if (!children.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: childProgress, isLoading: isChildProgressLoading } = useQuery<ParentChildProgressResponse>({
    queryKey: ["parent-child-progress", selectedChildId],
    enabled: selectedChildId !== null,
    queryFn: async () => (await api.get<ParentChildProgressResponse>(`/parent/children/${selectedChildId}/progress`)).data,
  });

  const summary = useMemo(() => {
    const linkedChildren = children.length;
    const totalCourses = children.reduce((sum, child) => sum + Number(child.enrolled_courses || 0), 0);
    const avgProgress = linkedChildren
      ? Math.round(children.reduce((sum, child) => sum + Number(child.avg_progress || 0), 0) / linkedChildren)
      : 0;

    return { linkedChildren, totalCourses, avgProgress };
  }, [children]);

  if (!mounted || !user) {
    return <LoadingState message="Loading parent workspace..." />;
  }

  if (user.role !== "parent") {
    return <LoadingState message="Redirecting..." />;
  }

  return (
    <section className="container mx-auto px-4 py-8 md:px-6 lg:py-10">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-bordeaux/10 bg-gradient-to-br from-bordeaux-deep via-bordeaux to-[#a2273f] p-8 text-primary-foreground shadow-[0_24px_90px_rgba(122,19,37,0.28)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                <UserRound className="h-3.5 w-3.5" /> Parent workspace
              </div>
              <h1 className="font-display text-4xl font-bold md:text-5xl">Follow your child’s learning progress</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80 md:text-base">
                This workspace is read-only. It gives the parent a focused view of enrollments, completion, and course progress for linked children.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-bordeaux hover:bg-white/90">
                <Link to="/profile">My profile</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-white/85"><CardContent className="p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Linked children</p><p className="mt-3 font-display text-4xl font-bold text-bordeaux">{summary.linkedChildren}</p></CardContent></Card>
          <Card className="border-border/70 bg-white/85"><CardContent className="p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Courses tracked</p><p className="mt-3 font-display text-4xl font-bold text-bordeaux">{summary.totalCourses}</p></CardContent></Card>
          <Card className="border-border/70 bg-white/85"><CardContent className="p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Average progress</p><p className="mt-3 font-display text-4xl font-bold text-bordeaux">{summary.avgProgress}%</p></CardContent></Card>
        </div>

        {/* Children comparison bar chart */}
        {!isLoading && children.length > 0 && (
          <Card className="border-border/70 bg-white/85">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-xl text-foreground">Progress comparison</CardTitle>
              <CardDescription>All linked children — enrolled courses vs completed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={children.map((c) => ({
                    name: c.first_name,
                    Enrolled: Number(c.enrolled_courses),
                    Completed: Number(c.completed_courses),
                    Progress: Number(c.avg_progress),
                  }))}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.015 60)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Enrolled"  fill="oklch(0.78 0.13 82)" radius={[4,4,0,0]} maxBarSize={28} />
                  <Bar dataKey="Completed" fill="oklch(0.36 0.13 18)" radius={[4,4,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <LoadingState message="Loading linked children..." />
        ) : children.length === 0 ? (
          <Card className="border-border/70 bg-white/85">
            <CardContent className="grid min-h-[260px] place-items-center p-8 text-center">
              <div>
                <UserRound className="mx-auto h-10 w-10 text-bordeaux/70" />
                <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">No child linked yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">An admin has to connect your parent account to a student account before progress becomes visible here.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              {children.map((child) => (
                <Card key={child.id} className={`cursor-pointer border-border/70 bg-white/85 transition-all hover:border-bordeaux/20 hover:shadow-elegant ${selectedChildId === child.id ? "ring-2 ring-bordeaux/20" : ""}`} onClick={() => setSelectedChildId(child.id)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl font-semibold text-foreground">{child.first_name} {child.last_name}</div>
                        <div className="text-sm text-muted-foreground">{child.email}</div>
                      </div>
                      <Badge className="border border-gold/30 bg-gold/10 text-bordeaux">{child.relation_type}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {child.college ? <Badge className="border border-bordeaux/20 bg-bordeaux/5 text-bordeaux">{child.college}</Badge> : null}
                      {formatAcademicTrack(child) ? <Badge className="border border-border bg-muted/40 text-foreground">{formatAcademicTrack(child)}</Badge> : null}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3"><div className="text-xs text-muted-foreground">Courses</div><div className="mt-1 font-semibold text-bordeaux">{child.enrolled_courses}</div></div>
                      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3"><div className="text-xs text-muted-foreground">Done</div><div className="mt-1 font-semibold text-bordeaux">{child.completed_courses}</div></div>
                      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3"><div className="text-xs text-muted-foreground">Progress</div><div className="mt-1 font-semibold text-bordeaux">{child.avg_progress}%</div></div>
                    </div>
                    {/* Subscription badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {child.active_plan ? (
                        <span className="text-xs text-muted-foreground">
                          <span className="capitalize font-medium text-bordeaux">{child.active_plan}</span>
                          {" · "}until {new Date(child.active_end_date!).toLocaleDateString()}
                          {" · "}
                          <span className={child.active_days_remaining! <= 7 ? "text-amber-700 font-medium" : ""}>
                            {child.active_days_remaining} day{child.active_days_remaining !== 1 ? "s" : ""} left
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No active subscription</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">Child progress</CardTitle>
                <CardDescription>Course-by-course progress for the selected child.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isChildProgressLoading || !childProgress ? (
                  <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading progress...</div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-display text-2xl font-semibold text-foreground">{childProgress.child.first_name} {childProgress.child.last_name}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{childProgress.child.email}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className="border border-gold/30 bg-gold/10 text-bordeaux">{childProgress.child.relation_type}</Badge>
                            {childProgress.child.college ? <Badge className="border border-bordeaux/20 bg-bordeaux/5 text-bordeaux">{childProgress.child.college}</Badge> : null}
                            {formatAcademicTrack(childProgress.child) ? <Badge className="border border-border bg-muted/40 text-foreground">{formatAcademicTrack(childProgress.child)}</Badge> : null}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-center"><div className="text-xs text-muted-foreground">Courses</div><div className="mt-1 font-semibold text-bordeaux">{childProgress.stats.total_courses}</div></div>
                          <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-center"><div className="text-xs text-muted-foreground">Completed</div><div className="mt-1 font-semibold text-bordeaux">{childProgress.stats.completed_courses}</div></div>
                          <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-center"><div className="text-xs text-muted-foreground">Avg progress</div><div className="mt-1 font-semibold text-bordeaux">{childProgress.stats.avg_progress}%</div></div>
                        </div>
                      </div>
                    </div>

                    {/* Subscription detail */}
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-bordeaux mb-3">
                        <CreditCard className="h-4 w-4" /> Subscription
                      </div>
                      {childProgress.subscription ? (
                        (() => {
                          const sub = childProgress.subscription!;
                          const daysLeft = Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86_400_000));
                          const cycleLabel = sub.billing_cycle === "1_month" ? "1 month" : sub.billing_cycle === "3_months" ? "3 months" : "1 year";
                          return (
                            <div className="grid gap-3 sm:grid-cols-4">
                              <div className="rounded-xl border border-border/70 bg-white px-3 py-2.5 text-center"><div className="text-xs text-muted-foreground">Plan</div><div className="mt-1 text-sm font-semibold capitalize text-bordeaux">{sub.plan}</div></div>
                              <div className="rounded-xl border border-border/70 bg-white px-3 py-2.5 text-center"><div className="text-xs text-muted-foreground">Duration</div><div className="mt-1 text-sm font-semibold text-foreground">{cycleLabel}</div></div>
                              <div className="rounded-xl border border-border/70 bg-white px-3 py-2.5 text-center"><div className="text-xs text-muted-foreground">From → Until</div><div className="mt-1 text-xs font-semibold text-foreground">{new Date(sub.start_date).toLocaleDateString()} → {new Date(sub.end_date).toLocaleDateString()}</div></div>
                              <div className={`rounded-xl border px-3 py-2.5 text-center ${daysLeft <= 7 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><div className="text-xs text-muted-foreground">Days left</div><div className={`mt-1 text-sm font-bold ${daysLeft <= 7 ? "text-amber-700" : "text-emerald-700"}`}>{daysLeft}</div></div>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-muted-foreground">This child has no active subscription.</p>
                      )}
                    </div>

                    {childProgress.enrollments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">This child is not enrolled in any course yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {childProgress.enrollments.map((enrollment) => (
                          <div key={`${enrollment.id}-${enrollment.enrolled_at}`} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="font-medium text-foreground">{enrollment.title}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{enrollment.category ?? "Course"} · by {enrollment.first_name} {enrollment.last_name}</div>
                                <div className="mt-2 text-xs text-muted-foreground">Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge className="border border-bordeaux/20 bg-bordeaux/5 text-bordeaux"><BookOpen className="mr-1 h-3.5 w-3.5" /> {enrollment.progress}%</Badge>
                                <Badge className={enrollment.completed ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-amber-200 bg-amber-100 text-amber-800"}>
                                  {enrollment.completed ? <CircleCheckBig className="mr-1 h-3.5 w-3.5" /> : <TrendingUp className="mr-1 h-3.5 w-3.5" />}
                                  {enrollment.completed ? "Completed" : "In progress"}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{enrollment.progress}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-gradient-gold transition-all" style={{ width: `${enrollment.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <section className="container mx-auto grid min-h-[60vh] place-items-center px-4 py-16">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    </section>
  );
}