import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import type { SubscriptionAccessStatus } from "@/lib/types";

function PlaceholderTile({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="h-32 rounded-xl bg-gradient-to-br from-bordeaux/15 via-gold/10 to-bordeaux-deep/15" />
      <div className="mt-4 h-4 w-24 rounded-full bg-bordeaux/15" />
      <div className="mt-3 h-6 w-3/4 rounded-full bg-foreground/10" />
      <div className="mt-2 h-4 w-full rounded-full bg-foreground/10" />
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>{title}</span>
        <span>{meta}</span>
      </div>
    </div>
  );
}

export function SubscriptionGate({
  resourceKey,
  title,
  description,
}: {
  resourceKey: "courses" | "events";
  title: string;
  description: string;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery<SubscriptionAccessStatus>({
    queryKey: ["subscription-access-status"],
    queryFn: async () => (await api.get<SubscriptionAccessStatus>("/subscriptions/access-status")).data,
  });

  const activateMutation = useMutation({
    mutationFn: (activationCode: string) => api.post("/subscriptions/activate-code", { code: activationCode }),
    onSuccess: () => {
      toast.success("Abonnement activé. Accès débloqué.");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["subscription-access-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: [resourceKey] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? "Échec de l'activation du code");
    },
  });

  const pendingStatus = data?.pending_subscription?.status;
  const activationReady = pendingStatus === "pending_code";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-bordeaux/15 bg-card/70 shadow-elegant">
      <div className="grid gap-6 p-6 opacity-60 blur-[5px] md:grid-cols-3 md:p-10 pointer-events-none select-none">
        <PlaceholderTile title="Contenu premium" meta="Verrouillé" />
        <PlaceholderTile title="Sessions exclusives" meta="Abonnement" />
        <PlaceholderTile title="Accès protégé" meta="Activation requise" />
      </div>
      <div className="absolute inset-0 bg-background/30 backdrop-blur-xl" />
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-3xl border-bordeaux/20 bg-card shadow-elegant">
          <CardHeader className="space-y-3 text-center">
            <Badge className="mx-auto border-0 bg-bordeaux text-primary-foreground hover:bg-bordeaux">
              <LockKeyhole className="mr-2 h-3.5 w-3.5" /> Abonnement requis
            </Badge>
            <CardTitle className="font-display text-3xl text-bordeaux">{title}</CardTitle>
            <CardDescription className="mx-auto max-w-2xl text-sm text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-bordeaux/10 bg-bordeaux/5 p-5 text-sm text-foreground/80">
              <div className="flex items-center gap-2 font-semibold text-bordeaux">
                <Sparkles className="h-4 w-4 text-gold" /> Débloquez l'expérience complète
              </div>
              <p className="mt-3">
                Abonnez-vous d'abord, puis entrez le code d'activation reçu pour débloquer l'accès. En attendant, le catalogue reste flou et l'accès est bloqué.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                  <Link to="/subscriptions">Choisir un abonnement</Link>
                </Button>
                <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                  <Link to="/profile">Ouvrir le profil</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-bordeaux">Code d'activation</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {activationReady
                  ? "Entrez votre code ici après l'achat pour débloquer l'accès immédiatement."
                  : pendingStatus === "pending_receipt"
                    ? "Votre abonnement par virement bancaire attend un justificatif de paiement depuis la page abonnements."
                    : pendingStatus === "pending_approval"
                      ? "Votre reçu a été uploadé. Attendez l'approbation de l'admin avant que le code d'activation soit généré."
                      : "Entrez votre code ici après l'achat pour débloquer l'accès immédiatement."}
              </p>
              {isLoading ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification de l'abonnement...
                </div>
              ) : null}
              {activationReady && data?.development_code ? (
                <div className="mt-4 rounded-xl border border-dashed border-gold/60 bg-gold/10 px-4 py-3 text-sm text-bordeaux-deep">
                  Code de développement : <span className="font-semibold tracking-[0.2em]">{data.development_code}</span>
                </div>
              ) : null}
              {activationReady ? (
                <>
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="Entrer le code d'activation"
                    className="mt-4 border-bordeaux/20"
                  />
                  <Button
                    type="button"
                    className="mt-4 w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                    onClick={() => activateMutation.mutate(code)}
                    disabled={!code.trim() || activateMutation.isPending}
                  >
                    {activateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activation...</> : "Débloquer avec le code"}
                  </Button>
                </>
              ) : null}
              {data?.has_pending_activation ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {activationReady
                    ? "Un abonnement attend l'activation. Entrez le code ci-dessus pour débloquer l'accès."
                    : pendingStatus === "pending_receipt"
                      ? "Rendez-vous sur la page abonnements et uploadez d'abord votre reçu bancaire."
                      : "Votre reçu est en cours de révision. Le code n'apparaîtra qu'après l'approbation de l'admin."}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No pending activation found yet. Start from the subscriptions page first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}