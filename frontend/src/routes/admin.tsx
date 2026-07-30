import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, BrainCircuit, CalendarDays, ChevronRight, ClipboardCheck, MessageSquare, ReceiptText, Shield, ShoppingBag, TicketPercent, Users, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMe } from "@/hooks/useAuth";
import { isAuthenticated } from "@/lib/auth";

export const ADMIN_MODULES = [
  { to: "/admin", label: "Overview", icon: Shield, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/products", label: "Products", icon: ShoppingBag },
  { to: "/admin/orders", label: "Orders", icon: ReceiptText },
  { to: "/admin/promo-codes", label: "Promo Codes", icon: TicketPercent },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: UsersRound },
  { to: "/admin/reclamations", label: "Reclamations", icon: MessageSquare },
  { to: "/admin/team", label: "Team", icon: UsersRound },
  { to: "/admin/quizzes", label: "Quiz", icon: ClipboardCheck },
  { to: "/admin/khlayel", label: "Khlayel AI", icon: BrainCircuit },
] as const;

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Workspace - Edutopia" },
      { name: "description", content: "A dedicated workspace for managing Edutopia modules." },
    ],
  }),
  component: AdminLayout,
});

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-[0_20px_80px_rgba(122,19,37,0.08)] md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-bordeaux">
            {eyebrow}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}

function AdminLayout() {
  const { data: user } = useMe();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user && user.role !== "admin") {
      window.location.replace("/dashboard");
    }
  }, [mounted, user]);

  const heroCards = useMemo(
    () => [
      { label: "Workspace", value: "Admin", hint: "Dedicated control room" },
      { label: "Scope", value: String(ADMIN_MODULES.length - 1), hint: "Managed modules" },
      { label: "Role", value: user?.role ?? "admin", hint: user ? `${user.first_name} ${user.last_name}` : "Loading" },
    ],
    [user]
  );

  if (!mounted || !user) {
    return (
      <section className="container mx-auto grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="text-center text-muted-foreground">Loading admin workspace...</div>
      </section>
    )
  }

  if (user.role !== "admin") {
    return (
      <section className="container mx-auto grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="text-center text-muted-foreground">Redirecting...</div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-8 md:px-6 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[2rem] border border-bordeaux/10 bg-gradient-to-br from-bordeaux-deep via-bordeaux to-[#a2273f] p-8 text-primary-foreground shadow-[0_24px_90px_rgba(122,19,37,0.28)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                  <Shield className="h-3.5 w-3.5" /> Administrator workspace
                </div>
                <h1 className="font-display text-4xl font-bold md:text-5xl">Operate Edutopia like a product studio</h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80 md:text-base">
                  Dedicated module pages, cleaner operations, and a focused admin navigation. Move between users, catalog, events, support, team, promo codes, and subscriptions without stacking every tool on a single screen.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                {heroCards.map((item) => (
                  <Card key={item.label} className="border-white/10 bg-white/10 text-primary-foreground backdrop-blur">
                    <CardContent className="p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold/80">{item.label}</p>
                      <p className="mt-2 font-display text-3xl font-bold">{item.value}</p>
                      <p className="mt-1 text-xs text-primary-foreground/70">{item.hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <Outlet />
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-[0_20px_70px_rgba(122,19,37,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Modules</p>
                <h2 className="font-display text-2xl font-bold text-bordeaux">Navigate</h2>
              </div>
              <Badge className="bg-gold/15 text-bordeaux border border-gold/30">Admin</Badge>
            </div>
            <div className="space-y-2">
              {ADMIN_MODULES.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  activeProps={{ className: "border-bordeaux/30 bg-gradient-bordeaux text-primary-foreground shadow-elegant" }}
                  className="flex items-center justify-between rounded-2xl border border-transparent bg-muted/40 px-4 py-3 text-sm font-medium text-foreground/80 transition-all hover:border-bordeaux/20 hover:bg-bordeaux/5 hover:text-bordeaux"
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-70" />
                </Link>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-gold/30 bg-gold/5 p-4 text-sm text-muted-foreground">
              The public team page is now backed by data. Promo codes can also target a specific product, and subscriptions are managed per user.
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}