import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, MessageSquare, ReceiptText, ShoppingBag, TicketPercent, Users, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageIntro, ADMIN_MODULES } from "./admin";
import api from "@/lib/api";
import type { Course, Event, MarketOrder, Product, PromoCode, Reclamation, Subscription, TeamMember, User } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => (await api.get<Course[]>("/courses", { params: { include_all: true } })).data,
  });
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["admin-events"],
    queryFn: async () => (await api.get<Event[]>("/events", { params: { include_all: true } })).data,
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => (await api.get<Product[]>("/market/products", { params: { include_inactive: true } })).data,
  });
  const { data: orders = [] } = useQuery<MarketOrder[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => (await api.get<MarketOrder[]>("/market/orders/all")).data,
  });
  const { data: promoCodes = [] } = useQuery<PromoCode[]>({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => (await api.get<PromoCode[]>("/market/promo-codes")).data,
  });
  const { data: subscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => (await api.get<Subscription[]>("/subscriptions")).data,
  });
  const { data: reclamations = [] } = useQuery<Reclamation[]>({
    queryKey: ["admin-reclamations"],
    queryFn: async () => (await api.get<Reclamation[]>("/reclamations")).data,
  });
  const { data: team = [] } = useQuery<TeamMember[]>({
    queryKey: ["admin-team"],
    queryFn: async () => (await api.get<TeamMember[]>("/team/all")).data,
  });

  const stats = [
    { label: "Utilisateurs", value: users.length, icon: Users },
    { label: "Cours", value: courses.length, icon: BookOpen },
    { label: "Événements", value: events.length, icon: CalendarDays },
    { label: "Produits", value: products.length, icon: ShoppingBag },
    { label: "Commandes", value: orders.length, icon: ReceiptText },
    { label: "Codes promo", value: promoCodes.length, icon: TicketPercent },
    { label: "Abonnements", value: subscriptions.length, icon: UsersRound },
    { label: "Tickets", value: reclamations.length, icon: MessageSquare },
    { label: "Équipe", value: team.length, icon: UsersRound },
  ];

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Vue d'ensemble"
        title="Tableau de bord administratif"
        description="Vue d'ensemble de la plateforme avec accès rapide à chaque module opérationnel. Utilisez le navigateur de modules à droite pour accéder aux écrans CRUD."
        actions={
          <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
            <Link to="/">Retour au site public</Link>
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-border/70 bg-background/80">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-2 font-display text-3xl font-bold text-bordeaux">{stat.value}</div>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-bordeaux text-gold">
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminPageIntro>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">Carte des modules</CardTitle>
            <CardDescription>Chaque module dispose désormais de sa propre interface d'administration dédiée.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {ADMIN_MODULES.filter((item) => item.to !== "/admin").map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-2xl border border-border/70 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-bordeaux/25 hover:shadow-elegant"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-bordeaux text-gold">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground">Ouvrir l'espace CRUD</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-bordeaux" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">Tableau de surveillance</CardTitle>
            <CardDescription>Éléments nécessitant une attention immédiate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
              <div>
                <div className="font-medium text-foreground">Commandes en attente</div>
                <div className="text-muted-foreground">Commandes en attente d'action admin</div>
              </div>
              <Badge className="bg-bordeaux/10 text-bordeaux">{orders.filter((order) => order.status === "pending").length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
              <div>
                <div className="font-medium text-foreground">Réclamations ouvertes</div>
                <div className="text-muted-foreground">Tickets non résolus</div>
              </div>
              <Badge className="bg-bordeaux/10 text-bordeaux">{reclamations.filter((ticket) => ticket.status !== "resolved").length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
              <div>
                <div className="font-medium text-foreground">Produits inactifs</div>
                <div className="text-muted-foreground">Articles masqués de la marketplace</div>
              </div>
              <Badge className="bg-gold/15 text-bordeaux">{products.filter((product) => product.is_active === 0).length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
              <div>
                <div className="font-medium text-foreground">Événements annulés</div>
                <div className="text-muted-foreground">Toujours visibles dans l'historique pour révision admin</div>
              </div>
              <Badge className="bg-gold/15 text-bordeaux">{events.filter((event) => event.is_cancelled === 1).length}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
              <div>
                <div className="font-medium text-foreground">Membres d'équipe inactifs</div>
                <div className="text-muted-foreground">Masqués de la page équipe publique</div>
              </div>
              <Badge className="bg-gold/15 text-bordeaux">{team.filter((member) => member.is_active === 0).length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}