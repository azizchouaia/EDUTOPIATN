import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, ChevronRight, CreditCard, LayoutDashboard, MessageSquare, ReceiptText, ShoppingBag, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMe } from "@/hooks/useAuth";
import { isAuthenticated } from "@/lib/auth";

export const COMMERCIAL_MODULES = [
  { to: "/commercial",          label: "Vue d'ensemble",  icon: LayoutDashboard, exact: true },
  { to: "/commercial/products", label: "Produits",        icon: ShoppingBag },
  { to: "/commercial/orders",   label: "Commandes",       icon: ReceiptText },
  { to: "/commercial/subscriptions", label: "Abonnements", icon: CreditCard },
  { to: "/commercial/promo-codes",   label: "Codes promo", icon: TicketPercent },
  { to: "/commercial/reclamations",  label: "Réclamations", icon: MessageSquare },
] as const;

export const Route = createFileRoute("/commercial")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Espace Commercial — Edutopia" },
      { name: "description", content: "Espace dédié à la gestion commerciale d'Edutopia." },
    ],
  }),
  component: CommercialLayout,
});

function CommercialLayout() {
  const { data: user } = useMe();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && user && user.role !== "commercial" && user.role !== "admin") {
      window.location.replace("/dashboard");
    }
  }, [mounted, user]);

  if (!mounted || !user) {
    return (
      <section className="container mx-auto grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="text-center text-muted-foreground">Chargement de l'espace commercial…</div>
      </section>
    );
  }

  if (user.role !== "commercial" && user.role !== "admin") {
    return (
      <section className="container mx-auto grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="text-center text-muted-foreground">Redirection…</div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8 md:px-6 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {/* Hero banner */}
          <section className="overflow-hidden rounded-[2rem] border border-bordeaux/10 bg-gradient-to-br from-bordeaux-deep via-bordeaux to-[#a2273f] p-8 text-primary-foreground shadow-[0_24px_90px_rgba(122,19,37,0.28)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                  <Briefcase className="h-3.5 w-3.5" /> Espace commercial
                </div>
                <h1 className="font-display text-4xl font-bold md:text-5xl">Pilotez l'activité commerciale</h1>
                <p className="mt-4 text-sm leading-6 text-primary-foreground/80">
                  Consultez les commandes, gérez les abonnements, approuvez les virements et suivez les réclamations clients depuis un espace centralisé.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
                <Card className="border-white/10 bg-white/10 text-primary-foreground backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold/80">Rôle</p>
                    <p className="mt-2 font-display text-2xl font-bold capitalize">{user.role}</p>
                    <p className="mt-1 text-xs text-primary-foreground/70">{user.first_name} {user.last_name}</p>
                  </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/10 text-primary-foreground backdrop-blur">
                  <CardContent className="p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold/80">Modules</p>
                    <p className="mt-2 font-display text-2xl font-bold">{COMMERCIAL_MODULES.length - 1}</p>
                    <p className="mt-1 text-xs text-primary-foreground/70">Sections accessibles</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <Outlet />
        </div>

        {/* Sidebar */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-[0_20px_70px_rgba(122,19,37,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Modules</p>
                <h2 className="font-display text-2xl font-bold text-bordeaux">Navigation</h2>
              </div>
              <Badge className="bg-gold/15 text-bordeaux border border-gold/30">Commercial</Badge>
            </div>
            <div className="space-y-2">
              {COMMERCIAL_MODULES.map((item) => (
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
              Les produits et codes promo sont en lecture seule. Commandes, abonnements et réclamations sont modifiables.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
