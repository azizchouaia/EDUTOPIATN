import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BookOpen, Award, ShoppingBag, MessageSquare, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMe } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatAcademicTrack } from "@/lib/academic";
import { isAuthenticated } from "@/lib/auth";
import type { Enrollment } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    // Skip on SSR — localStorage is only available in the browser
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Edutopia" },
      { name: "description", content: "Your learning dashboard: enrolled courses, test results, orders and reclamations." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useMe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !user) return
    if (user.role === "teacher") {
      window.location.replace("/teacher")
      return
    }
    if (user.role === "parent") {
      window.location.replace("/parent")
      return
    }
    if (user.role === "admin") {
      window.location.replace("/admin")
    }
  }, [mounted, user])

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const res = await api.get<Enrollment[]>("/courses/my-enrollments");
      return res.data;
    },
  });

  const stats = [
    { label: "Courses enrolled", value: String(enrollments.length), icon: BookOpen },
    { label: "Tests passed",     value: "—",  icon: Award },
    { label: "Orders",           value: "—",  icon: ShoppingBag },
    { label: "Avg. score",       value: "—",  icon: TrendingUp },
  ];

  if (mounted && user && user.role !== "student") {
    return (
      <section className="container mx-auto grid min-h-[60vh] place-items-center px-4 py-16">
        <div className="text-center text-muted-foreground">Redirecting...</div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-bordeaux ring-4 ring-gold/30 shadow-elegant">
            <User className="h-7 w-7 text-gold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {mounted && user ? `${user.first_name} ${user.last_name}` : "\u2026"}
            </h1>
            <Badge className="mt-1 bg-gold/15 text-bordeaux border border-gold/40 hover:bg-gold/15">
              {mounted ? (user?.role ?? "Student") : "Student"} · {mounted ? (user?.college ?? "Edutopia") : "Edutopia"}
            </Badge>
            {mounted && formatAcademicTrack(user ?? {}) && (
              <Badge className="mt-2 bg-white text-bordeaux border border-bordeaux/20 hover:bg-white">
                {formatAcademicTrack(user ?? {})}
              </Badge>
            )}
          </div>
        </div>
        <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
          <Link to="/courses">Explore more courses</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 hover:shadow-elegant transition-all">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-bordeaux text-gold">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="font-display text-3xl font-bold text-bordeaux">{s.value}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Enrolled courses */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">My Courses</h2>
            <Link to="/courses" className="text-sm font-medium text-bordeaux hover:underline">View all</Link>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not enrolled in any courses yet.</p>
          ) : (
            <div className="space-y-5">
              {enrollments.map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-5 hover:border-bordeaux transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{c.category ?? "Course"}</p>
                    </div>
                    <span className="font-display text-2xl font-bold text-bordeaux">{c.progress}%</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-gold transition-all" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-bordeaux text-primary-foreground p-6 shadow-elegant">
            <h3 className="font-display text-xl font-bold text-gold">Premium plan</h3>
            <p className="text-sm text-primary-foreground/80 mt-2">Manage your subscription</p>
            <Button asChild className="mt-4 w-full bg-gradient-gold text-bordeaux-deep font-semibold hover:opacity-90">
              <Link to="/market">Manage subscription</Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-bordeaux" /> Support
            </h3>
            <p className="text-sm text-muted-foreground mt-2">Need help? Send a reclamation to our team.</p>
            <Button asChild variant="outline" className="mt-4 w-full border-bordeaux text-bordeaux hover:bg-bordeaux/5">
              <Link to="/reclamations">New reclamation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}


