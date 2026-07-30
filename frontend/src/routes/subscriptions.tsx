import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Banknote, Check, Crown, Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api, { assetUrl } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import type { Subscription, SubscriptionAccessStatus, SubscriptionPaymentMethod, SubscriptionPlan } from "@/lib/types";

// ── Bank account details ─────────────────────────────────────────────────────
// Update these constants to match your real bank account information.
const BANK_INFO = {
  beneficiary: "Edutopia Academy SARL",
  bank:        "Banque Nationale Agricole (BNA)",
  rib:         "08 006 0123456789 00",
  iban:        "TN59 0800 6012 3456 7890 0",
  swift:       "BNATTNTT",
  reference:   "SUB-{email}",   // {email} will be replaced with the student's email
} as const;

export const Route = createFileRoute("/subscriptions")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) throw redirect({ to: "/login" });
    const user = getStoredUser();
    if (user?.role === "teacher") {
      throw redirect({ to: "/teacher" });
    }
  },
  head: () => ({
    meta: [
      { title: "Subscriptions — Edutopia" },
      { name: "description", content: "Choose an Edutopia subscription plan for 1 month, 3 months, or 1 year." },
    ],
  }),
  component: SubscriptionsPage,
});

type BillingCycle = "1_month" | "3_months" | "1_year";

const billingCycleLabels: Record<BillingCycle, string> = {
  "1_month": "1 month",
  "3_months": "3 months",
  "1_year": "1 year",
};

function cyclePrice(plan: SubscriptionPlan, cycle: BillingCycle) {
  if (cycle === "1_month") return Number(plan.monthly_price);
  if (cycle === "3_months") return Number(plan.quarterly_price);
  return Number(plan.yearly_price);
}

function planBadge(plan: SubscriptionPlan) {
  if (plan.is_popular) return "Most popular";
  if (plan.is_recommended) return "Recommended";
  return null;
}
function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("1_month");
  const [activationCode, setActivationCode] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null); // drives the confirmation dialog

  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: async () => (await api.get<SubscriptionPlan[]>("/subscriptions/plans")).data,
  });

  const { data: subscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["my-subscriptions"],
    queryFn: async () => (await api.get<Subscription[]>("/subscriptions")).data,
    enabled: isAuthenticated(),
  });

  const { data: accessStatus } = useQuery<SubscriptionAccessStatus>({
    queryKey: ["subscription-access-status"],
    queryFn: async () => (await api.get<SubscriptionAccessStatus>("/subscriptions/access-status")).data,
    enabled: isAuthenticated(),
  });

  const activeSubscription = useMemo(
    () => accessStatus?.active_subscription ?? subscriptions.find((subscription) => subscription.status === "active") ?? null,
    [accessStatus, subscriptions]
  );

  const PENDING_STATUSES = ["pending_payment", "pending_receipt", "pending_approval", "pending_code"] as const;
  const pendingSubscription = useMemo(
    () => accessStatus?.pending_subscription ?? subscriptions.find((subscription) => (PENDING_STATUSES as readonly string[]).includes(subscription.status)) ?? null,
    [accessStatus, subscriptions]
  );


  const checkoutMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) =>
      api.post("/subscriptions/checkout", { plan: plan.slug, billing_cycle: billingCycle, payment_method: "bank_transfer" }),
    onSuccess: () => {
      toast.success("Demande d'abonnement enregistree. Uploadez votre recu pour continuer.");
      setCheckoutPlan(null);
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-access-status"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Failed to create subscription");
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post("/subscriptions/activate-code", { code: activationCode }),
    onSuccess: () => {
      toast.success("Subscription activated");
      setActivationCode("");
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-access-status"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Failed to activate code");
    },
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async () => {
      if (!pendingSubscription || !receiptFile) {
        throw new Error("Receipt file is required");
      }
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      return api.post(`/subscriptions/${pendingSubscription.id}/receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Receipt uploaded. Waiting for admin approval.");
      setReceiptFile(null);
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-access-status"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? error?.message ?? "Failed to upload receipt");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/subscriptions/${pendingSubscription!.id}/cancel`),
    onSuccess: () => {
      toast.success("Demande d'abonnement annulee.");
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-access-status"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? "Annulation impossible."),
  });

  const isCodeExpired = pendingSubscription?.status === "pending_code" &&
    pendingSubscription.activation_code_expires_at != null &&
    new Date(pendingSubscription.activation_code_expires_at) < new Date();

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return;
    }
    // Open the confirmation dialog instead of calling checkout directly.
    setCheckoutPlan(plan);
  };

  const storedUser = getStoredUser();
  const bankReference = BANK_INFO.reference.replace("{email}", storedUser?.email ?? "unknown");

  const checkoutPrice = checkoutPlan ? cyclePrice(checkoutPlan, billingCycle) : 0;

  return (
    <>
      {/* ── Checkout confirmation dialog ────────────────────────────────────── */}
      <Dialog open={Boolean(checkoutPlan)} onOpenChange={(open) => { if (!open && !checkoutMutation.isPending) setCheckoutPlan(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-foreground">Instructions de virement</DialogTitle>
          </DialogHeader>

          {checkoutPlan && (
            <div className="space-y-5 pt-1">
              {/* Order summary */}
              <div className="rounded-xl border border-bordeaux/20 bg-bordeaux/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bordeaux">Recapitulatif</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="font-display text-xl font-bold capitalize text-foreground">{checkoutPlan.title}</p>
                    <p className="text-sm text-muted-foreground">{billingCycleLabels[billingCycle]} · Virement bancaire</p>
                  </div>
                  <p className="font-display text-2xl font-bold text-bordeaux">{checkoutPrice} DT</p>
                </div>
              </div>

              {/* Bank account details */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Banknote className="h-4 w-4 text-bordeaux" /> Coordonnees bancaires
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Beneficiaire", value: BANK_INFO.beneficiary },
                    { label: "Banque",       value: BANK_INFO.bank },
                    { label: "RIB",          value: BANK_INFO.rib },
                    { label: "IBAN",         value: BANK_INFO.iban },
                    { label: "SWIFT/BIC",    value: BANK_INFO.swift },
                    { label: "Reference",    value: bankReference },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">{label}</span>
                      <span className="font-mono font-medium text-foreground text-right break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-3 flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Effectuez le virement en premier, puis cliquez sur <strong>Confirmer</strong>. Vous pourrez ensuite envoyer votre recu pour validation.</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-bordeaux text-bordeaux hover:bg-bordeaux/5"
                  onClick={() => setCheckoutPlan(null)}
                  disabled={checkoutMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" /> Annuler
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                  onClick={() => checkoutMutation.mutate(checkoutPlan)}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</>
                    : <><Check className="mr-2 h-4 w-4" /> Confirmer la demande</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Subscriptions</span>
          <h1 className="mt-3 font-display text-5xl font-bold md:text-6xl">Choose your Edutopia plan</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="mx-auto max-w-2xl text-primary-foreground/80">
            This page is separate from the shop. Pick your plan and choose if you want it for 1 month, 3 months, or 1 year.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="mx-auto flex max-w-fit flex-wrap gap-2 rounded-full border border-border/70 bg-card p-2 shadow-elegant">
          {(Object.keys(billingCycleLabels) as BillingCycle[]).map((cycle) => (
            <Button
              key={cycle}
              type="button"
              variant={billingCycle === cycle ? "default" : "ghost"}
              className={billingCycle === cycle ? "bg-gradient-bordeaux text-primary-foreground hover:opacity-90" : "text-bordeaux hover:bg-bordeaux/5"}
              onClick={() => setBillingCycle(cycle)}
            >
              {billingCycleLabels[cycle]}
            </Button>
          ))}
        </div>
        {/* Payment method: bank transfer only */}
        <div className="mx-auto mt-5 flex max-w-fit items-center gap-2 rounded-full border border-border/70 bg-card px-5 py-3 shadow-elegant text-sm text-muted-foreground">
          <Banknote className="h-4 w-4 text-bordeaux" />
          Paiement par virement bancaire uniquement
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12">
        {activeSubscription ? (
          <Card className="mx-auto mb-10 max-w-3xl border-gold/50 bg-gold/5 shadow-elegant">
            <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-bordeaux">Active subscription</div>
                <div className="mt-2 font-display text-2xl font-bold text-foreground">{activeSubscription.plan} · {activeSubscription.billing_cycle?.replaceAll("_", " ") ?? "custom"}</div>
                <div className="mt-1 text-sm text-muted-foreground">Valid until {activeSubscription.end_date}</div>
              </div>
              <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                <Link to="/profile">View profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {pendingSubscription ? (
          <Card className="mx-auto mb-10 max-w-3xl border-bordeaux/20 bg-white/90 dark:bg-card shadow-elegant">
            <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-bordeaux">Activation required</div>
                <div className="mt-2 font-display text-2xl font-bold text-foreground">
                  {pendingSubscription.status === "pending_payment"
                    ? "Complete your online payment"
                    : pendingSubscription.status === "pending_receipt"
                      ? "Upload your bank-transfer receipt"
                      : pendingSubscription.status === "pending_approval"
                        ? "Your receipt is under admin review"
                        : "Your subscription is waiting for code activation"}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {pendingSubscription.status === "pending_payment"
                    ? "You started an online payment that hasn't been confirmed yet. If you already paid, your activation code will appear here shortly. Otherwise, cancel this request and try again."
                    : pendingSubscription.status === "pending_receipt"
                      ? "Bank transfer does not show a code immediately. Upload the receipt here first, then wait for the admin to approve it."
                      : pendingSubscription.status === "pending_approval"
                        ? "The receipt is already uploaded. The code will only appear after admin approval."
                        : "Enter the code here to unlock courses and events. New purchases stay blocked while one activation is already pending."}
                </div>
                {pendingSubscription.status === "pending_code" && accessStatus?.development_code ? (
                  <div className="mt-4 inline-flex rounded-full border border-dashed border-gold/60 bg-gold/10 px-4 py-2 text-sm font-medium text-bordeaux-deep">
                    Development code: {accessStatus.development_code}
                  </div>
                ) : null}
                {pendingSubscription.bank_receipt_path ? (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Uploaded receipt: <a className="font-medium text-bordeaux underline-offset-4 hover:underline" href={assetUrl(pendingSubscription.bank_receipt_path) ?? undefined} target="_blank" rel="noreferrer">{pendingSubscription.bank_receipt_original_name ?? "Open receipt"}</a>
                  </div>
                ) : null}
                {pendingSubscription.status === "pending_receipt" ? (
                  <div className="mt-4 max-w-md space-y-3">
                    <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)} className="border-bordeaux/20" />
                    <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, WEBP, or PDF. Max size: 5 MB.</p>
                  </div>
                ) : null}
                {pendingSubscription.status === "pending_code" ? (
                  <Input
                    value={activationCode}
                    onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                    placeholder="Enter activation code"
                    className="mt-4 max-w-md border-bordeaux/20"
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {pendingSubscription.status === "pending_payment" ? (
                  <Button type="button" disabled className="bg-gradient-bordeaux text-primary-foreground opacity-80">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Awaiting payment confirmation
                  </Button>
                ) : pendingSubscription.status === "pending_receipt" ? (
                  <Button
                    type="button"
                    className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                    onClick={() => uploadReceiptMutation.mutate()}
                    disabled={!receiptFile || uploadReceiptMutation.isPending}
                  >
                    {uploadReceiptMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Upload receipt"}
                  </Button>
                ) : pendingSubscription.status === "pending_code" ? (
                  <>
                    {isCodeExpired ? (
                      <p className="text-xs text-amber-700">Code expired. Contact an admin to regenerate your activation code.</p>
                    ) : null}
                    <Button
                      type="button"
                      className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                      onClick={() => activateMutation.mutate()}
                      disabled={!activationCode.trim() || activateMutation.isPending || isCodeExpired}
                    >
                      {activateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</> : "Activate code"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" disabled className="bg-gradient-bordeaux text-primary-foreground opacity-80">
                    Waiting for admin approval
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/5"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : "Cancel this request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-bordeaux" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = Boolean(plan.is_popular || plan.is_recommended);
              const badgeLabel = planBadge(plan);
              return (
                <div
                  key={plan.id}
                  className={featured
                    ? "relative scale-[1.02] rounded-2xl border-2 border-gold bg-gradient-bordeaux p-8 text-primary-foreground shadow-elegant"
                    : "rounded-2xl border border-border bg-card p-8 transition-all hover:border-bordeaux hover:shadow-elegant"}
                >
                  {featured && badgeLabel ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 bg-gradient-gold px-4 py-1 text-bordeaux-deep">
                      <Crown className="mr-1 h-3 w-3" /> {badgeLabel}
                    </Badge>
                  ) : null}
                  <h2 className={`font-display text-2xl font-bold ${featured ? "text-gold" : "text-bordeaux"}`}>{plan.title}</h2>
                  {plan.title_arabic ? (
                    <div className={`mt-1 text-sm ${featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{plan.title_arabic}</div>
                  ) : null}
                  <p className={`mt-3 text-sm ${featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-bold">{cyclePrice(plan, billingCycle)} DT</span>
                    <span className={featured ? "text-primary-foreground/70" : "text-muted-foreground"}>/{billingCycleLabels[billingCycle]}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className={`mt-0.5 h-4 w-4 ${featured ? "text-gold" : "text-bordeaux"}`} />
                        <span className={featured ? "text-primary-foreground/90" : "text-foreground/80"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className={featured ? "mt-8 w-full bg-gradient-gold font-semibold text-bordeaux-deep hover:opacity-90" : "mt-8 w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90"}
                    onClick={() => handleSubscribe(plan)}
                    disabled={checkoutMutation.isPending || Boolean(activeSubscription) || Boolean(pendingSubscription)}
                  >
                    {checkoutMutation.isPending ? "Processing..." : activeSubscription ? "Already active" : pendingSubscription ? "Activation pending" : `Subscribe for ${billingCycleLabels[billingCycle]}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
