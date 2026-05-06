import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import type { Reclamation } from "@/lib/types";

export const Route = createFileRoute("/reclamations")({
  head: () => ({
    meta: [
      { title: "Support & Reclamations — Edutopia" },
      { name: "description", content: "Submit a reclamation or follow up on existing tickets with the Edutopia support team." },
      { property: "og:title", content: "Support & Reclamations — Edutopia" },
      { property: "og:description", content: "Submit and track your support tickets." },
    ],
  }),
  component: ReclamationsPage,
});

const statusConfig = {
  open:        { label: "Ouverte",       icon: AlertCircle,   className: "bg-bordeaux/10 text-bordeaux border-bordeaux/30" },
  in_progress: { label: "En cours",      icon: Clock,         className: "bg-gold/15 text-bordeaux-deep border-gold/40" },
  resolved:    { label: "Resolue",       icon: CheckCircle2,  className: "bg-green-100 text-green-800 border-green-300" },
} as const;

interface ReclamationForm {
  subject: string;
  category: string;
  message: string;
}

const reclamationSchema = z.object({
  subject: z.string().trim().min(4, "Le sujet doit contenir au moins 4 caracteres"),
  category: z.enum(["course", "payment", "technical", "other"]),
  message: z.string().trim().min(20, "Le message doit contenir au moins 20 caracteres"),
})

function ReclamationsPage() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReclamationForm>({
    resolver: zodResolver(reclamationSchema),
    defaultValues: { category: "course" },
  });

  const { data: tickets = [], isLoading } = useQuery<Reclamation[]>({
    queryKey: ["reclamations"],
    queryFn: async () => {
      const res = await api.get<Reclamation[]>("/reclamations");
      return res.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: ReclamationForm) => api.post("/reclamations", data),
    onSuccess: () => {
      toast.success("Reclamation envoyee.");
      reset();
      queryClient.invalidateQueries({ queryKey: ["reclamations"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Envoi de la reclamation impossible.");
    },
  });

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">Support</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mt-3">Reclamations</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="max-w-xl mx-auto text-primary-foreground/80">
            We're here to help. Submit your reclamation and our team will respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 grid lg:grid-cols-5 gap-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit((d) => submitMutation.mutate(d))}
          className="lg:col-span-3 rounded-2xl border border-border bg-card p-8"
        >
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-bordeaux" /> New reclamation
          </h2>
          <div className="gold-divider mt-3 mb-6" />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief title..."
                {...register("subject", { required: "Subject is required" })}
              />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                {...register("category")}
              >
                <option value="course">Course</option>
                <option value="payment">Payment</option>
                <option value="technical">Technical</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Describe your issue in detail..."
              rows={6}
              {...register("message", { required: "Message is required" })}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="mt-6 w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit reclamation"}
          </Button>
        </form>

        {/* Tickets list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground">My tickets</h2>
          <div className="gold-divider" />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tickets…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet. Submit your first reclamation.</p>
          ) : (
            tickets.map((t) => {
              const cfg = statusConfig[t.status] ?? statusConfig.open;
              const Icon = cfg.icon;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-5 hover:border-bordeaux hover:shadow-elegant transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{t.id}</span>
                    <Badge variant="outline" className={cfg.className}>
                      <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                    </Badge>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground mt-2">{t.subject}</h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span className="capitalize">{t.category}</span>
                    <span>{formatDate(t.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
