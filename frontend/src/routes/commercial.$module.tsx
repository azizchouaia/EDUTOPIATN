import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  TicketPercent,
  TrendingUp,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminListControls } from "@/components/admin/AdminListControls";
import api, { assetUrl } from "@/lib/api";
import type { MarketOrder, Product, PromoCode, Reclamation, Subscription } from "@/lib/types";
import { AdminPageIntro } from "./admin";

// ── Types ────────────────────────────────────────────────────────────────────

type CommercialModuleName = "products" | "orders" | "subscriptions" | "promo-codes" | "reclamations";

interface CommercialStats {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_revenue: string | number;
  active_subscriptions: number;
  pending_approvals: number;
  open_reclamations: number;
  inprogress_reclamations: number;
  active_products: number;
  active_promo_codes: number;
}

// ── Router entry ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/commercial/$module")({
  component: CommercialModulePage,
});

function CommercialModulePage() {
  const { module } = Route.useParams();

  switch (module as CommercialModuleName) {
    case "products":
      return <ProductsReadOnly />;
    case "orders":
      return <OrdersModule />;
    case "subscriptions":
      return <SubscriptionsModule />;
    case "promo-codes":
      return <PromoCodesReadOnly />;
    case "reclamations":
      return <ReclamationsModule />;
    default:
      return (
        <Card className="border-border/70 bg-white/85">
          <CardContent className="p-8 text-center text-muted-foreground">Module inconnu.</CardContent>
        </Card>
      );
  }
}

// ── Overview (index route at /commercial) ────────────────────────────────────
// This is exported so commercial.tsx can render it as the default outlet content.

export function CommercialOverview() {
  const { data: stats, isLoading } = useQuery<CommercialStats>({
    queryKey: ["commercial-stats"],
    queryFn: async () => (await api.get<CommercialStats>("/commercial/stats")).data,
  });

  const revenue = stats ? Number(stats.total_revenue).toFixed(2) : "0.00";

  const kpis = [
    {
      label: "Commandes totales",
      value: stats?.total_orders ?? "—",
      sub: `${stats?.paid_orders ?? 0} payées · ${stats?.pending_orders ?? 0} en attente`,
      icon: ReceiptText,
      color: "text-bordeaux",
    },
    {
      label: "Revenu total (payé)",
      value: `DT${revenue}`,
      sub: `${stats?.cancelled_orders ?? 0} commandes annulées`,
      icon: TrendingUp,
      color: "text-emerald-700",
    },
    {
      label: "Abonnements actifs",
      value: stats?.active_subscriptions ?? "—",
      sub: `${stats?.pending_approvals ?? 0} approbations en attente`,
      icon: CreditCard,
      color: "text-indigo-700",
    },
    {
      label: "Réclamations ouvertes",
      value: stats?.open_reclamations ?? "—",
      sub: `${stats?.inprogress_reclamations ?? 0} en cours de traitement`,
      icon: MessageSquare,
      color: "text-amber-700",
    },
    {
      label: "Produits actifs",
      value: stats?.active_products ?? "—",
      sub: "Catalogue actif",
      icon: ShoppingBag,
      color: "text-bordeaux",
    },
    {
      label: "Codes promo actifs",
      value: stats?.active_promo_codes ?? "—",
      sub: "Codes utilisables",
      icon: TicketPercent,
      color: "text-bordeaux",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Vue d'ensemble"
        title="Tableau de bord commercial"
        description="Statistiques en temps réel de l'activité commerciale de la plateforme."
      />

      {isLoading ? (
        <Card className="border-border/70 bg-white/85">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-bordeaux" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/70 bg-white/85">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-[0.18em]">{kpi.label}</p>
                    <p className={`mt-2 font-display text-3xl font-bold ${kpi.color}`}>{String(kpi.value)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                  <kpi.icon className={`h-8 w-8 opacity-20 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Products (read-only) ─────────────────────────────────────────────────────

function ProductsReadOnly() {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["commercial-products"],
    queryFn: async () => (await api.get<Product[]>("/market/products", { params: { include_inactive: true } })).data,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Produits"
        title="Catalogue produits"
        description="Consultation du catalogue (lecture seule). Modifications disponibles dans l'espace admin."
      />
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Produits</CardTitle>
          <CardDescription>Données en temps réel depuis le backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <AdminListControls
                search={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Rechercher par nom ou catégorie"
              />
              {filtered.length === 0 ? (
                <EmptyState icon={PackageSearch} message="Aucun produit trouvé." />
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filtered.map((product) => (
                    <Card key={product.id} className="border-border/60 bg-card">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-display text-lg font-semibold text-foreground">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.category ?? "Aucune catégorie"} · stock {product.stock}</div>
                          </div>
                          <Badge className={product.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                            {product.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <div className="mt-2 font-display text-2xl text-bordeaux">DT{Number(product.price).toFixed(2)}</div>
                        {product.description ? (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

function OrdersModule() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<MarketOrder[]>({
    queryKey: ["commercial-orders"],
    queryFn: async () => (await api.get<MarketOrder[]>("/market/orders/all")).data,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MarketOrder["status"] }) =>
      api.put(`/market/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Commande mise à jour.");
      queryClient.invalidateQueries({ queryKey: ["commercial-orders"] });
    },
    onError: () => toast.error("Mise à jour de la commande impossible."),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const filtered = sortBy === "oldest"
    ? [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : sortBy === "total-asc"
    ? [...orders].sort((a, b) => Number(a.total_amount) - Number(b.total_amount))
    : sortBy === "total-desc"
    ? [...orders].sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
    : [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const visible = filtered.filter((order) => {
    const q = searchTerm.toLowerCase();
    const matchText = !q || `${order.first_name} ${order.last_name} ${order.email} ${order.promo_code ?? ""} ${order.id}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    return matchText && matchStatus;
  });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Commandes"
        title="Gestion des commandes"
        description="Consultez l'historique des commandes et mettez à jour leur statut de paiement."
      />
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Commandes</CardTitle>
          <CardDescription>Données en temps réel depuis le backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <AdminListControls
                search={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Rechercher par client, e-mail, promo ou ID"
                filters={[
                  {
                    label: "Statut",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { value: "all", label: "Tous les statuts" },
                      { value: "pending", label: "En attente" },
                      { value: "paid", label: "Payé" },
                      { value: "cancelled", label: "Annulé" },
                      { value: "refunded", label: "Remboursé" },
                    ],
                  },
                ]}
                sort={{
                  label: "Trier",
                  value: sortBy,
                  onChange: setSortBy,
                  options: [
                    { value: "recent", label: "Plus récent" },
                    { value: "oldest", label: "Plus ancien" },
                    { value: "total-desc", label: "Total le plus élevé" },
                    { value: "total-asc", label: "Total le plus bas" },
                  ],
                }}
              />
              <SimpleTable
                headers={["Client", "Promo", "Total", "Date", "Statut"]}
                rows={visible.map((order) => [
                  <div key={`c-${order.id}`}>
                    <div className="font-medium text-foreground">{order.first_name} {order.last_name}</div>
                    <div className="text-xs text-muted-foreground">{order.email}</div>
                  </div>,
                  order.promo_code ?? "Aucun",
                  `DT${Number(order.total_amount).toFixed(2)}`,
                  new Date(order.created_at).toLocaleString("fr-FR"),
                  <select
                    key={`s-${order.id}`}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={order.status}
                    onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value as MarketOrder["status"] })}
                  >
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="cancelled">cancelled</option>
                    <option value="refunded">refunded</option>
                  </select>,
                ])}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Subscriptions ────────────────────────────────────────────────────────────

function SubscriptionsModule() {
  const queryClient = useQueryClient();
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["commercial-subscriptions"],
    queryFn: async () => (await api.get<Subscription[]>("/subscriptions")).data,
  });
  const [receiptPreview, setReceiptPreview] = useState<{
    url: string;
    name: string;
    subscriptionId: number;
    isPdf: boolean;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/subscriptions/${id}/approve-bank-transfer`),
    onSuccess: (response) => {
      const devCode = (response.data as { development_code?: string })?.development_code;
      toast.success(devCode ? `Virement validé. Code dev : ${devCode}` : "Virement validé.");
      queryClient.invalidateQueries({ queryKey: ["commercial-subscriptions"] });
    },
    onError: () => toast.error("Validation du virement impossible."),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/subscriptions/${id}/regenerate-code`),
    onSuccess: (response) => {
      const devCode = (response.data as { development_code?: string })?.development_code;
      toast.success(devCode ? `Code régénéré. Code dev : ${devCode}` : "Code régénéré. Informez l'utilisateur.");
      queryClient.invalidateQueries({ queryKey: ["commercial-subscriptions"] });
    },
    onError: () => toast.error("Régénération du code impossible."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Subscription["status"] }) =>
      api.put(`/subscriptions/${id}`, { status }),
    onSuccess: () => {
      toast.success("Abonnement mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["commercial-subscriptions"] });
    },
    onError: () => toast.error("Mise à jour impossible."),
  });

  const filtered = subscriptions.filter((sub) => {
    const q = searchTerm.toLowerCase();
    const matchText =
      !q ||
      `${sub.first_name} ${sub.last_name} ${sub.email} ${sub.plan} ${sub.payment_method ?? ""}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchPlan = planFilter === "all" || sub.plan === planFilter;
    return matchText && matchStatus && matchPlan;
  });

  return (
    <>
      <Dialog open={Boolean(receiptPreview)} onOpenChange={(open) => { if (!open) setReceiptPreview(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Reçu — {receiptPreview?.name ?? "Document"}
            </DialogTitle>
          </DialogHeader>
          {receiptPreview && (
            <div className="space-y-4">
              {receiptPreview.isPdf ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 py-10 text-center">
                  <p className="text-sm text-muted-foreground">Reçu PDF — ouvrir dans un nouvel onglet</p>
                  <Button asChild variant="outline" className="border-bordeaux text-bordeaux">
                    <a href={receiptPreview.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir le PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <img
                  src={receiptPreview.url}
                  alt="Reçu de virement bancaire"
                  className="w-full max-h-[60vh] rounded-xl border border-border object-contain"
                />
              )}
              {subscriptions.find((s) => s.id === receiptPreview.subscriptionId)?.status === "pending_approval" && (
                <Button
                  className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                  onClick={() => { approveMutation.mutate(receiptPreview.subscriptionId); setReceiptPreview(null); }}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approbation…</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Approuver le virement</>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <AdminPageIntro
          eyebrow="Abonnements"
          title="Gestion des abonnements"
          description="Consultez les abonnements, approuvez les virements bancaires et régénérez les codes d'accès."
        />
        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">Abonnements</CardTitle>
            <CardDescription>Données en temps réel depuis le backend.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <LoadingSpinner /> : (
              <div className="space-y-4">
                <AdminListControls
                  search={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par utilisateur, plan ou mode de paiement"
                  filters={[
                    {
                      label: "Plan",
                      value: planFilter,
                      onChange: setPlanFilter,
                      options: [
                        { value: "all", label: "Tous les plans" },
                        { value: "basic", label: "Basic" },
                        { value: "premium", label: "Premium" },
                        { value: "enterprise", label: "Enterprise" },
                      ],
                    },
                    {
                      label: "Statut",
                      value: statusFilter,
                      onChange: setStatusFilter,
                      options: [
                        { value: "all", label: "Tous les statuts" },
                        { value: "pending_receipt", label: "Reçu en attente" },
                        { value: "pending_approval", label: "Approbation en attente" },
                        { value: "pending_code", label: "Code en attente" },
                        { value: "active", label: "Actif" },
                        { value: "expired", label: "Expiré" },
                        { value: "cancelled", label: "Annulé" },
                      ],
                    },
                  ]}
                />
                <SimpleTable
                  headers={["Utilisateur", "Plan", "Paiement", "Dates", "Statut", "Actions"]}
                  rows={filtered.map((sub) => [
                    <div key={`u-${sub.id}`}>
                      <div className="font-medium text-foreground">{sub.first_name} {sub.last_name}</div>
                      <div className="text-xs text-muted-foreground">{sub.email}</div>
                    </div>,
                    sub.plan,
                    <div key={`p-${sub.id}`} className="space-y-1 text-sm">
                      <div className="font-medium">{sub.payment_method?.replace("_", " ") ?? "online"}</div>
                      {sub.bank_receipt_path ? (
                        <button
                          type="button"
                          className="text-xs text-bordeaux hover:underline"
                          onClick={() => {
                            const url = assetUrl(sub.bank_receipt_path!) ?? sub.bank_receipt_path!;
                            const name = sub.bank_receipt_original_name ?? "receipt";
                            setReceiptPreview({ url, name, subscriptionId: sub.id, isPdf: name.toLowerCase().endsWith(".pdf") });
                          }}
                        >
                          {sub.bank_receipt_original_name ?? "Voir le reçu"}
                        </button>
                      ) : (
                        <div className="text-xs text-muted-foreground">Aucun reçu</div>
                      )}
                    </div>,
                    `${sub.start_date} → ${sub.end_date}`,
                    <select
                      key={`st-${sub.id}`}
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={sub.status}
                      onChange={(e) => updateMutation.mutate({ id: sub.id, status: e.target.value as Subscription["status"] })}
                    >
                      <option value="pending_receipt">pending receipt</option>
                      <option value="pending_approval">pending approval</option>
                      <option value="pending_code">pending code</option>
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="cancelled">cancelled</option>
                    </select>,
                    <div key={`a-${sub.id}`} className="flex flex-wrap gap-2">
                      {sub.bank_receipt_path ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-bordeaux text-bordeaux"
                          onClick={() => {
                            const url = assetUrl(sub.bank_receipt_path!) ?? sub.bank_receipt_path!;
                            const name = sub.bank_receipt_original_name ?? "receipt";
                            setReceiptPreview({ url, name, subscriptionId: sub.id, isPdf: name.toLowerCase().endsWith(".pdf") });
                          }}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Voir le reçu
                        </Button>
                      ) : null}
                      {sub.payment_method === "bank_transfer" && sub.status === "pending_approval" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-600 text-emerald-700"
                          onClick={() => approveMutation.mutate(sub.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approuver
                        </Button>
                      ) : null}
                      {sub.status === "pending_code" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-600 text-amber-700"
                          onClick={() => regenerateMutation.mutate(sub.id)}
                        >
                          Régénérer le code
                        </Button>
                      ) : null}
                    </div>,
                  ])}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Promo codes (read-only) ──────────────────────────────────────────────────

function PromoCodesReadOnly() {
  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ["commercial-promo-codes"],
    queryFn: async () => (await api.get<PromoCode[]>("/market/promo-codes")).data,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = promoCodes.filter((promo) => {
    const q = searchTerm.toLowerCase();
    const matchText = !q || `${promo.code} ${promo.product_name ?? ""}`.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? Boolean(promo.is_active) : !promo.is_active);
    return matchText && matchStatus;
  });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Codes promo"
        title="Codes promotionnels"
        description="Consultation des codes promo actifs (lecture seule). Modifications disponibles dans l'espace admin."
      />
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Codes promo</CardTitle>
          <CardDescription>Données en temps réel depuis le backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <AdminListControls
                search={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Rechercher par code ou produit"
                filters={[
                  {
                    label: "Statut",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { value: "all", label: "Tous" },
                      { value: "active", label: "Actif" },
                      { value: "inactive", label: "Inactif" },
                    ],
                  },
                ]}
              />
              {filtered.length === 0 ? (
                <EmptyState icon={TicketPercent} message="Aucun code promo trouvé." />
              ) : (
                <SimpleTable
                  headers={["Code", "Remise", "Produit", "Utilisation", "Statut"]}
                  rows={filtered.map((promo) => [
                    <span key={`c-${promo.id}`} className="font-mono font-semibold text-bordeaux">{promo.code}</span>,
                    `${promo.discount_percent}%`,
                    promo.product_name ?? "Tous les produits",
                    `${promo.used_count}/${promo.max_uses ?? "∞"}`,
                    <Badge
                      key={`s-${promo.id}`}
                      className={promo.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}
                    >
                      {promo.is_active ? "Actif" : "Inactif"}
                    </Badge>,
                  ])}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Reclamations ─────────────────────────────────────────────────────────────

function ReclamationsModule() {
  const queryClient = useQueryClient();
  type ReclamationRow = Reclamation & { first_name: string; last_name: string; email: string };
  const { data: reclamations = [], isLoading } = useQuery<ReclamationRow[]>({
    queryKey: ["commercial-reclamations"],
    queryFn: async () => (await api.get<ReclamationRow[]>("/reclamations")).data,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Reclamation["status"] }) =>
      api.put(`/reclamations/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Statut mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["commercial-reclamations"] });
    },
    onError: () => toast.error("Mise à jour impossible."),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categoryOptions = Array.from(new Set(reclamations.map((r) => r.category).filter(Boolean))) as string[];

  const filtered = reclamations.filter((ticket) => {
    const q = searchTerm.toLowerCase();
    const matchText =
      !q ||
      `${ticket.first_name} ${ticket.last_name} ${ticket.email} ${ticket.subject} ${ticket.message} ${ticket.category ?? ""}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchCat = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchText && matchStatus && matchCat;
  });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Réclamations"
        title="Support client"
        description="Examinez les tickets et mettez à jour leur statut de traitement."
      />
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Réclamations</CardTitle>
          <CardDescription>Données en temps réel depuis le backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-4">
              <AdminListControls
                search={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Rechercher par utilisateur, sujet ou message"
                filters={[
                  {
                    label: "Statut",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    options: [
                      { value: "all", label: "Tous les statuts" },
                      { value: "open", label: "Ouvert" },
                      { value: "in_progress", label: "En cours" },
                      { value: "resolved", label: "Résolu" },
                    ],
                  },
                  {
                    label: "Catégorie",
                    value: categoryFilter,
                    onChange: setCategoryFilter,
                    options: [
                      { value: "all", label: "Toutes les catégories" },
                      ...categoryOptions.map((cat) => ({ value: cat, label: cat })),
                    ],
                  },
                ]}
              />
              {filtered.length === 0 ? (
                <EmptyState icon={MessageSquare} message="Aucun ticket trouvé." />
              ) : (
                <SimpleTable
                  headers={["Utilisateur", "Sujet", "Catégorie", "Statut"]}
                  rows={filtered.map((ticket) => [
                    <div key={`u-${ticket.id}`}>
                      <div className="font-medium text-foreground">{ticket.first_name} {ticket.last_name}</div>
                      <div className="text-xs text-muted-foreground">{ticket.email}</div>
                    </div>,
                    <div key={`s-${ticket.id}`}>
                      <div className="font-medium text-foreground">{ticket.subject}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{ticket.message}</div>
                    </div>,
                    ticket.category ?? "-",
                    <select
                      key={`st-${ticket.id}`}
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={ticket.status}
                      onChange={(e) => updateMutation.mutate({ id: ticket.id, status: e.target.value as Reclamation["status"] })}
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in progress</option>
                      <option value="resolved">resolved</option>
                    </select>,
                  ])}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared UI primitives ─────────────────────────────────────────────────────

function SimpleTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="px-3 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">
                Aucun enregistrement.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-border/70 align-top">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-3">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-bordeaux" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
      <Icon className="h-10 w-10 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
