import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CalendarDays,
  Users,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Loader2,
  ExternalLink,
  PlayCircle,
  Lock,
  Globe,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { hasMinLength, isFutureDateTime, isPositiveInteger, isValidDateInput, isValidUrl, type FormErrors } from "@/lib/validation";
import type { Event as ApiEvent } from "@/lib/types";

export const Route = createFileRoute("/events")({
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
      { title: "Événements en direct — Edutopia" },
      { name: "description", content: "Rejoignez les sessions de cours en direct animées par les enseignants Edutopia. Places limitées — réservez votre place dès aujourd'hui." },
      { property: "og:title", content: "Événements en direct — Edutopia" },
      { property: "og:description", content: "Sessions de cours en direct avec places limitées, animées par les enseignants d'Edutopia." },
    ],
  }),
  component: EventsPage,
});

const CATEGORIES = ["Tous", "Développement", "Design", "Business", "Data", "Arts"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function EventsPage() {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const viewer = getStoredUser();
  const canCreate = viewer?.role === "admin" || viewer?.role === "teacher";
  const loggedIn = isAuthenticated();

  const { data: events = [], isLoading } = useQuery<ApiEvent[]>({
    queryKey: ["events", query],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      const res = await api.get<ApiEvent[]>("/events", { params });
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: (eventId: number) => api.post(`/events/${eventId}/register`),
    onSuccess: () => {
      toast.success("Place réservée.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Inscription impossible.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: number) => api.delete(`/events/${eventId}/register`),
    onSuccess: () => {
      toast.success("Inscription annulée.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Annulation impossible.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      category: string;
      delivery_type: "google_meet" | "video";
      access_url: string;
      event_date: string;
      seats_total: number;
      is_free: boolean;
    }) => api.post("/events", data),
    onSuccess: () => {
      toast.success("Événement publié.");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Création de l'événement impossible.");
    },
  });

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">Live Sessions</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mt-3">Events & Live Courses</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="max-w-xl mx-auto text-primary-foreground/80">
            Lives Google Meet et videos publiees par les enseignants Edutopia. Sessions gratuites et sessions reservees aux abonnes.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une session, un enseignant ou une catégorie"
              className="pl-9"
            />
          </div>
          {canCreate ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-bordeaux text-primary-foreground shadow-elegant">
                  <Plus className="h-4 w-4" /> Nouvelle session
                </Button>
              </DialogTrigger>
              <CreateEventDialog onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />
            </Dialog>
          ) : null}
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-card">
                  <div className="skeleton h-36 rounded-none" />
                  <div className="space-y-3 p-6">
                    <div className="skeleton h-4 w-1/3" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-10 w-40 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-bordeaux/10 text-bordeaux">
                <CalendarDays className="h-7 w-7" />
              </span>
              <p className="text-muted-foreground">Aucune session ne correspond a votre recherche.</p>
              {query && (
                <Button variant="outline" size="sm" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"
                  onClick={() => setQuery("")}>
                  Effacer la recherche
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  loggedIn={loggedIn}
                  onRegister={() => registerMutation.mutate(ev.id)}
                  onCancel={() => cancelMutation.mutate(ev.id)}
                  onLoginRequired={() => window.location.assign("/login")}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function EventCard({
  event,
  loggedIn,
  onRegister,
  onCancel,
  onLoginRequired,
}: {
  event: ApiEvent;
  loggedIn: boolean;
  onRegister: () => void;
  onCancel: () => void;
  onLoginRequired: () => void;
}) {
  const isVideo     = event.delivery_type === "video";
  const isLive      = event.delivery_type === "google_meet";
  const isUnlimited = isLive && event.seats_total === 0;
  const isLimited   = isLive && event.seats_total > 0;
  const isFree      = Boolean(event.is_free);
  const hasSubscription = Boolean(event.has_subscription);
  const canAccess   = isFree || hasSubscription;
  const isRegistered = Boolean(event.is_registered);

  const seatsLeft    = isLimited ? event.seats_total - event.seats_taken : Infinity;
  const isFull       = isLimited && seatsLeft <= 0 && !isRegistered;
  const isAlmostFull = isLimited && !isFull && seatsLeft <= Math.max(3, event.seats_total * 0.1);
  const fillPct      = isLimited ? Math.min(100, (event.seats_taken / event.seats_total) * 100) : 0;

  // Time gate: backend reveals URL within 15 min of start, we use the same threshold for display
  const eventMs    = new Date(event.event_date).getTime();
  const isStarting = isLive && eventMs <= Date.now() + 15 * 60 * 1000;

  // ── CTA logic ──────────────────────────────────────────────────────────────
  function renderCTA() {
    if (!loggedIn) {
      return (
        <Button onClick={onLoginRequired} className="bg-gradient-bordeaux text-primary-foreground">
          Se connecter pour participer
        </Button>
      );
    }

    // ── Video ──────────────────────────────────────────────────────────────
    if (isVideo) {
      if (!canAccess) {
        return (
          <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
            <Link to="/subscriptions"><Lock className="mr-2 h-4 w-4" /> Abonnement requis</Link>
          </Button>
        );
      }
      if (!event.access_url) {
        return <Button disabled className="bg-gradient-bordeaux text-primary-foreground opacity-60">Video bientot disponible</Button>;
      }
      return (
        <Button asChild className="bg-gradient-bordeaux text-primary-foreground">
          <a href={event.access_url} target="_blank" rel="noreferrer">
            <PlayCircle className="mr-2 h-4 w-4" /> Regarder la video
          </a>
        </Button>
      );
    }

    // ── Unlimited live ─────────────────────────────────────────────────────
    if (isUnlimited) {
      if (!canAccess) {
        return (
          <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
            <Link to="/subscriptions"><Lock className="mr-2 h-4 w-4" /> Abonnement requis</Link>
          </Button>
        );
      }
      if (!event.access_url) {
        // Either not started yet or URL not published
        return (
          <Button disabled className="bg-gradient-bordeaux text-primary-foreground opacity-60">
            <Clock className="mr-2 h-4 w-4" />
            {isStarting ? "Lien non encore publié" : "Lien disponible au début du live"}
          </Button>
        );
      }
      return (
        <Button asChild className="bg-gradient-bordeaux text-primary-foreground">
          <a href={event.access_url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Rejoindre le live
          </a>
        </Button>
      );
    }

    // ── Limited live ───────────────────────────────────────────────────────
    if (isLimited) {
      if (!canAccess) {
        return (
          <Button asChild variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5">
            <Link to="/subscriptions"><Lock className="mr-2 h-4 w-4" /> Abonnement requis</Link>
          </Button>
        );
      }
      if (isRegistered) {
        const joinBtn = event.access_url ? (
          <Button asChild className="bg-gradient-bordeaux text-primary-foreground">
            <a href={event.access_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Rejoindre le live
            </a>
          </Button>
        ) : (
          <Button disabled className="bg-gradient-bordeaux text-primary-foreground opacity-60">
            <Clock className="mr-2 h-4 w-4" />
            {isStarting ? "Lien en attente" : "Lien disponible au début"}
          </Button>
        );
        return (
          <div className="flex flex-wrap gap-2">
            {joinBtn}
            <Button variant="outline" onClick={onCancel} className="border-bordeaux text-bordeaux">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Annuler
            </Button>
          </div>
        );
      }
      if (isFull) {
        return <Button disabled className="bg-muted text-muted-foreground">Complet</Button>;
      }
      return (
        <Button onClick={onRegister} className="bg-gradient-bordeaux text-primary-foreground">
          Reserver une place
        </Button>
      );
    }

    return null;
  }

  // ── Seat / access bar ──────────────────────────────────────────────────────
  function renderInfoBar() {
    if (isVideo) {
      return (
        <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <PlayCircle className="h-4 w-4 shrink-0" />
          Video a la demande — regardez quand vous voulez.
        </div>
      );
    }
    if (isUnlimited) {
      return (
        <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 shrink-0" />
          Live illimite — aucune inscription requise.
        </div>
      );
    }
    // Limited live
    return (
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1 text-foreground/70">
            <Users className="h-3.5 w-3.5" />
            {event.seats_taken} / {event.seats_total} places
          </span>
          <span className={isFull ? "font-semibold text-destructive" : isAlmostFull ? "font-semibold text-bordeaux" : "text-muted-foreground"}>
            {isFull ? "Complet" : isAlmostFull ? `Plus que ${seatsLeft}` : `${seatsLeft} restantes`}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-gold transition-all" style={{ width: `${fillPct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant">
      <CardHeader className="bg-gradient-bordeaux text-primary-foreground">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {event.category && (
            <Badge className="bg-gold/90 text-bordeaux hover:bg-gold border-0">{event.category}</Badge>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Free vs subscription badge */}
            {isFree ? (
              <Badge className="border-0 bg-emerald-500/80 text-white hover:bg-emerald-500/80">
                <Sparkles className="h-3 w-3 mr-1" /> Gratuit
              </Badge>
            ) : (
              <Badge className="border-0 bg-gold/90 text-bordeaux hover:bg-gold/90">
                <Lock className="h-3 w-3 mr-1" /> Abonnes
              </Badge>
            )}
            {/* Type badge */}
            <Badge className="border-0 bg-white/15 text-primary-foreground hover:bg-white/15">
              {isVideo ? "Vidéo" : isUnlimited ? "Live illimité" : "Live Google Meet"}
            </Badge>
            {/* Starting-soon indicator */}
            {isStarting && (
              <Badge className="border-0 bg-red-500/90 text-white hover:bg-red-500/90">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Bientot
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="font-display text-2xl mt-3 leading-tight">{event.title}</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          par {event.first_name} {event.last_name}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-6 space-y-4">
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <CalendarDays className="h-4 w-4 text-bordeaux" />
          {formatDate(event.event_date)}
        </div>
        {renderInfoBar()}
        {/* Subscription hint for non-subscribers on paid events */}
        {!isFree && !hasSubscription && loggedIn && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            Cette session est reservee aux abonnes.{" "}
            <Link to="/subscriptions" className="text-bordeaux font-medium hover:underline">Voir les formules</Link>
          </p>
        )}
        {/* Registered confirmation */}
        {isRegistered && !isStarting && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Inscrit — lien disponible au debut du live
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-card/50 py-4">
        <span className="flex items-center gap-1.5 font-display text-sm text-muted-foreground">
          {isFree
            ? <><Sparkles className="h-4 w-4 text-gold" /> Gratuit</>
            : <><Lock className="h-4 w-4 text-bordeaux" /> Abonnes uniquement</>
          }
        </span>
        {renderCTA()}
      </CardFooter>
    </Card>
  );
}

function CreateEventDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    delivery_type: "google_meet" | "video";
    access_url: string;
    event_date: string;
    seats_total: number;
    is_free: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Développement");
  const [deliveryType, setDeliveryType] = useState<"google_meet" | "video">("google_meet");
  const [accessUrl, setAccessUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [seats, setSeats] = useState(20);
  const [unlimitedSeats, setUnlimitedSeats] = useState(false);
  const [isFree, setIsFree] = useState(true);
  const [errors, setErrors] = useState<FormErrors<"title" | "description" | "access_url" | "event_date" | "seats_total">>({});

  function clearError(field: "title" | "description" | "access_url" | "event_date" | "seats_total") {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: FormErrors<"title" | "description" | "access_url" | "event_date" | "seats_total"> = {};

    if (!hasMinLength(title, 4)) {
      nextErrors.title = "Le titre doit contenir au moins 4 caractères";
    }
    if (description.trim().length > 0 && !hasMinLength(description, 10)) {
      nextErrors.description = "La description doit contenir au moins 10 caractères si renseignée";
    }
    if (!isValidUrl(accessUrl)) {
      nextErrors.access_url = deliveryType === "video" ? "Saisissez une URL vidéo valide" : "Saisissez un lien Google Meet valide";
    }
    if (deliveryType === "google_meet" ? !isFutureDateTime(eventDate) : !isValidDateInput(eventDate)) {
      nextErrors.event_date = deliveryType === "google_meet" ? "Choisissez une date et une heure futures" : "Choisissez une date valide";
    }
    if (deliveryType === "google_meet" && !unlimitedSeats && !isPositiveInteger(seats, 1)) {
      nextErrors.seats_total = "Le nombre de places doit être au moins 1, ou cochez Illimité";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrigez le formulaire avant publication.");
      return;
    }

    const seats_total = deliveryType === "video" ? 0 : unlimitedSeats ? 0 : seats;
    onSubmit({ title, description, category, delivery_type: deliveryType, access_url: accessUrl, event_date: new Date(eventDate).toISOString(), seats_total, is_free: isFree });
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl text-bordeaux">Creer une session</DialogTitle>
        <DialogDescription>Publiez un live Google Meet ou une video pour les eleves.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4">

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="ev-title">Titre *</Label>
          <Input id="ev-title" value={title} onChange={(e) => { setTitle(e.target.value); clearError("title"); }} placeholder="Live Workshop: ..." className={errors.title ? "border-destructive" : undefined} />
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>

        {/* Category + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c !== "Tous").map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={deliveryType} onValueChange={(value: "google_meet" | "video") => {
              setDeliveryType(value);
              if (value === "video") setUnlimitedSeats(false);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google_meet">Live Google Meet</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Free vs subscription toggle */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <Label className="text-sm font-medium">Acces</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsFree(true)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                isFree
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-1.5" />
              Gratuit
              <p className="text-xs font-normal mt-0.5 text-muted-foreground">Tous les inscrits</p>
            </button>
            <button
              type="button"
              onClick={() => setIsFree(false)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                !isFree
                  ? "border-bordeaux bg-bordeaux/5 text-bordeaux dark:bg-bordeaux/20"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              <Lock className="h-4 w-4 inline mr-1.5" />
              Abonnes
              <p className="text-xs font-normal mt-0.5 text-muted-foreground">Abonnement actif requis</p>
            </button>
          </div>
        </div>

        {/* Seats (live only) */}
        {deliveryType === "google_meet" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ev-seats">Places</Label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={unlimitedSeats}
                  onChange={(e) => { setUnlimitedSeats(e.target.checked); clearError("seats_total"); }}
                  className="rounded"
                />
                <span className="text-muted-foreground">Illimite</span>
              </label>
            </div>
            {!unlimitedSeats ? (
              <>
                <Input
                  id="ev-seats"
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => { setSeats(Number(e.target.value)); clearError("seats_total"); }}
                  className={errors.seats_total ? "border-destructive" : undefined}
                />
                {errors.seats_total ? <p className="text-xs text-destructive">{errors.seats_total}</p> : null}
              </>
            ) : (
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 inline mr-2" />
                Ouvert a tous les utilisateurs eligibles — pas d'inscription requise.
              </div>
            )}
          </div>
        ) : null}

        {/* URL */}
        <div className="space-y-2">
          <Label htmlFor="ev-link">{deliveryType === "video" ? "Lien video *" : "Lien Google Meet *"}</Label>
          <Input
            id="ev-link"
            value={accessUrl}
            onChange={(e) => { setAccessUrl(e.target.value); clearError("access_url"); }}
            placeholder={deliveryType === "video" ? "https://youtube.com/..." : "https://meet.google.com/..."}
            className={errors.access_url ? "border-destructive" : undefined}
          />
          {errors.access_url ? <p className="text-xs text-destructive">{errors.access_url}</p> : null}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="ev-date">Date et heure *</Label>
          <Input
            id="ev-date"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => { setEventDate(e.target.value); clearError("event_date"); }}
            className={errors.event_date ? "border-destructive" : undefined}
          />
          {errors.event_date ? <p className="text-xs text-destructive">{errors.event_date}</p> : null}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea
            id="ev-desc"
            value={description}
            onChange={(e) => { setDescription(e.target.value); clearError("description"); }}
            rows={3}
            className={errors.description ? "border-destructive" : undefined}
          />
          {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
        </div>

        <Button type="submit" disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publication...</> : "Publier la session"}
        </Button>
      </form>
    </DialogContent>
  );
}
