import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, MessageSquare, Users, Coins, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { AdminPageIntro } from "@/routes/admin";

type UsageResponse = {
  totals: {
    total_messages: number;
    total_conversations: number;
    active_users: number;
    prompt_tokens: number;
    completion_tokens: number;
    thumbs_up: number;
    thumbs_down: number;
  };
  by_day: { day: string; messages: number; tokens: number }[];
  by_model: { model: string; messages: number; tokens: number }[];
  top_users: { id: number; first_name: string; last_name: string; year_of_study: string | null; messages: number; tokens: number }[];
  needs_migration?: boolean;
};

function fmt(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("fr-FR");
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bordeaux/10 text-bordeaux">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function KhlayelUsageModule() {
  const { data, isLoading } = useQuery<UsageResponse>({
    queryKey: ["admin-khlayel-usage"],
    queryFn: async () => (await api.get<UsageResponse>("/ai/admin/usage")).data,
    refetchInterval: 60_000,
  });

  const totals = data?.totals;
  const totalTokens = Number(totals?.prompt_tokens ?? 0) + Number(totals?.completion_tokens ?? 0);
  const maxDayTokens = Math.max(1, ...(data?.by_day ?? []).map(d => Number(d.tokens) || Number(d.messages)));

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Khlayel AI"
        title="Utilisation de l'assistant"
        description="Tokens consommés, activité par jour, répartition par modèle et élèves les plus actifs."
      />

      {data?.needs_migration && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Les colonnes de tracking ne sont pas encore migrées — seuls les comptages de messages sont disponibles.
            Applique <code className="font-mono text-xs">migrations/2026-07-14-ai-usage.sql</code> et{" "}
            <code className="font-mono text-xs">2026-07-14-ai-feedback.sql</code> pour activer les tokens et le feedback.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Messages IA" value={fmt(totals?.total_messages)} sub={`${fmt(totals?.total_conversations)} conversations`} />
            <StatCard icon={<Users className="h-5 w-5" />} label="Élèves actifs" value={fmt(totals?.active_users)} />
            <StatCard icon={<Coins className="h-5 w-5" />} label="Tokens totaux" value={fmt(totalTokens)} sub={`${fmt(totals?.prompt_tokens)} in · ${fmt(totals?.completion_tokens)} out`} />
            <StatCard
              icon={<BrainCircuit className="h-5 w-5" />}
              label="Feedback"
              value={`${fmt(totals?.thumbs_up)} 👍 · ${fmt(totals?.thumbs_down)} 👎`}
              sub={Number(totals?.thumbs_up ?? 0) + Number(totals?.thumbs_down ?? 0) > 0
                ? `${Math.round((Number(totals?.thumbs_up ?? 0) / (Number(totals?.thumbs_up ?? 0) + Number(totals?.thumbs_down ?? 0))) * 100)}% positif`
                : "aucun vote"}
            />
          </div>

          {/* Daily activity */}
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="font-display text-xl text-bordeaux">Activité — 30 derniers jours</CardTitle>
              <CardDescription>Tokens consommés par jour (messages si tokens non tracés).</CardDescription>
            </CardHeader>
            <CardContent>
              {(data?.by_day ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité sur la période.</p>
              ) : (
                <div className="flex items-end gap-1 h-36">
                  {(data?.by_day ?? []).map(d => {
                    const v = Number(d.tokens) || Number(d.messages);
                    return (
                      <div
                        key={d.day}
                        className="group relative flex-1 rounded-t bg-gradient-bordeaux transition-opacity hover:opacity-80"
                        style={{ height: `${Math.max(4, (v / maxDayTokens) * 100)}%` }}
                        title={`${new Date(d.day).toLocaleDateString("fr-FR")} — ${fmt(d.messages)} msg · ${fmt(d.tokens)} tokens`}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* By model */}
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="font-display text-xl text-bordeaux">Par modèle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.by_model ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Pas encore de données par modèle.</p>
                ) : (
                  (data?.by_model ?? []).map(m => (
                    <div key={m.model} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3 text-sm">
                      <span className="font-mono text-xs truncate">{m.model}</span>
                      <span className="flex items-center gap-3 shrink-0 text-muted-foreground">
                        <span>{fmt(m.messages)} msg</span>
                        <Badge className="bg-bordeaux/10 text-bordeaux hover:bg-bordeaux/10 tabular-nums">{fmt(m.tokens)} tokens</Badge>
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top users */}
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="font-display text-xl text-bordeaux">Élèves les plus actifs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.top_users ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Pas encore de données par élève.</p>
                ) : (
                  (data?.top_users ?? []).map((u, i) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-2.5 text-sm">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bordeaux/10 text-xs font-bold text-bordeaux">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate">
                        {u.first_name} {u.last_name}
                        {u.year_of_study && <span className="ml-2 text-xs text-muted-foreground">({u.year_of_study})</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmt(u.messages)} msg</span>
                      <Badge className="shrink-0 bg-gold/15 text-bordeaux border border-gold/30 hover:bg-gold/15 tabular-nums">
                        {fmt(u.tokens)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
