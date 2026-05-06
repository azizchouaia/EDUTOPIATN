import { createFileRoute, redirect } from "@tanstack/react-router";
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
    const user = getStoredUser();
    if (user?.role === "teacher") {
      throw redirect({ to: "/teacher" });
    }
  },
  head: () => ({
    meta: [
      { title: "Live Events — Edutopia" },
      { name: "description", content: "Join live course events hosted by Edutopia teachers. Limited seats — reserve your spot today." },
      { property: "og:title", content: "Live Events — Edutopia" },
      { property: "og:description", content: "Live course sessions with limited seats, hosted by Edutopia's teachers." },
    ],
  }),
  component: EventsPage,
});

const CATEGORIES = ["All", "Development", "Design", "Business", "Data", "Arts"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function EventsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const viewer = getStoredUser();
  const canCreate = viewer?.role === "admin" || viewer?.role === "teacher";
  const loggedIn = isAuthenticated();

  const { data: events = [], isLoading } = useQuery<ApiEvent[]>({
    queryKey: ["events", query, category],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      if (category !== "All") params.category = category;
      const res = await api.get<ApiEvent[]>("/events", { params });
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: (eventId: number) => api.post(`/events/${eventId}/register`),
    onSuccess: () => {
      toast.success("Place reservee.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Inscription impossible.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: number) => api.delete(`/events/${eventId}/register`),
    onSuccess: () => {
      toast.success("Inscription annulee.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Annulation impossible.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; category: string; delivery_type: "google_meet" | "video"; access_url: string; event_date: string; seats_total: number }) =>
      api.post("/events", data),
    onSuccess: () => {
      toast.success("Evenement publie.");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Creation de l'evenement impossible.");
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
            Retrouvez des lives Google Meet et des videos gratuites publiees par les enseignants Edutopia.
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
              placeholder="Rechercher une session, un enseignant ou une categorie"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === category ? "default" : "outline"}
                onClick={() => setCategory(c)}
                className={c === category ? "bg-gradient-bordeaux text-primary-foreground" : "border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"}
              >
                {c}
              </Button>
            ))}
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
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-bordeaux" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">Aucune session ne correspond a votre recherche.</div>
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
  const isVideo = event.delivery_type === "video";
  const isRegistered = Boolean(event.is_registered);
  const seatsLeft = event.seats_total - event.seats_taken;
  const fillPct = isVideo || event.seats_total <= 0 ? 0 : Math.min(100, (event.seats_taken / event.seats_total) * 100);
  const isFull = !isVideo && seatsLeft <= 0;
  const isAlmostFull = !isVideo && !isFull && seatsLeft <= Math.max(3, event.seats_total * 0.1);

  return (
    <Card className="flex flex-col overflow-hidden border-border/60 hover:shadow-elegant transition-shadow">
      <CardHeader className="bg-gradient-bordeaux text-primary-foreground">
        <div className="flex items-center justify-between">
          {event.category && (
            <Badge className="bg-gold/90 text-bordeaux hover:bg-gold border-0">{event.category}</Badge>
          )}
          <Badge className="border-0 bg-white/15 text-primary-foreground hover:bg-white/15">
            {isVideo ? "Video gratuite" : "Live Google Meet"}
          </Badge>
        </div>
        <CardTitle className="font-display text-2xl mt-3 leading-tight">{event.title}</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          by {event.first_name} {event.last_name}
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
        {!isVideo ? (
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
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Video gratuite accessible a tout moment.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-card/50 py-4">
        <span className="flex items-center gap-1 font-display text-xl text-bordeaux">
          <Sparkles className="h-4 w-4 text-gold" /> Free
        </span>
        {isVideo ? (
          event.access_url ? (
            <Button asChild className="bg-gradient-bordeaux text-primary-foreground">
              <a href={event.access_url} target="_blank" rel="noreferrer">
                <PlayCircle className="mr-2 h-4 w-4" /> Regarder la video
              </a>
            </Button>
          ) : (
            <Button disabled className="bg-gradient-bordeaux text-primary-foreground">Video bientot disponible</Button>
          )
        ) : isRegistered ? (
          <div className="flex flex-wrap gap-2">
            {event.access_url ? (
              <Button asChild className="bg-gradient-bordeaux text-primary-foreground">
                <a href={event.access_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Rejoindre le live
                </a>
              </Button>
            ) : (
              <Button disabled className="bg-gradient-bordeaux text-primary-foreground">Lien Meet en attente</Button>
            )}
            <Button variant="outline" onClick={onCancel} className="border-bordeaux text-bordeaux">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Annuler
            </Button>
          </div>
        ) : !loggedIn ? (
          <Button onClick={onLoginRequired} className="bg-gradient-bordeaux text-primary-foreground">
            Se connecter pour reserver
          </Button>
        ) : (
          <Button
            onClick={onRegister}
            disabled={isFull}
            className="bg-gradient-bordeaux text-primary-foreground"
          >
            {isFull ? "Complet" : "Reserver une place"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function CreateEventDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { title: string; description: string; category: string; delivery_type: "google_meet" | "video"; access_url: string; event_date: string; seats_total: number }) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Development");
  const [deliveryType, setDeliveryType] = useState<"google_meet" | "video">("google_meet");
  const [accessUrl, setAccessUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [seats, setSeats] = useState(20);
  const [errors, setErrors] = useState<FormErrors<"title" | "description" | "access_url" | "event_date" | "seats_total">>({});

  function updateErrorState(field: "title" | "description" | "access_url" | "event_date" | "seats_total") {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: FormErrors<"title" | "description" | "access_url" | "event_date" | "seats_total"> = {};

    if (!hasMinLength(title, 4)) {
      nextErrors.title = "Le titre doit contenir au moins 4 caracteres";
    }
    if (description.trim().length > 0 && !hasMinLength(description, 10)) {
      nextErrors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee";
    }
    if (!isValidUrl(accessUrl)) {
      nextErrors.access_url = deliveryType === "video" ? "Saisissez une URL video valide" : "Saisissez un lien Google Meet valide";
    }
    if (deliveryType === "google_meet" ? !isFutureDateTime(eventDate) : !isValidDateInput(eventDate)) {
      nextErrors.event_date = deliveryType === "google_meet" ? "Choisissez une date et une heure futures" : "Choisissez une date et une heure valides";
    }
    if (deliveryType === "google_meet" && !isPositiveInteger(seats, 1)) {
      nextErrors.seats_total = "Le nombre de places doit etre au moins egal a 1";
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrigez le formulaire de l'evenement avant publication.")
      return
    }

    onSubmit({ title, description, category, delivery_type: deliveryType, access_url: accessUrl, event_date: new Date(eventDate).toISOString(), seats_total: deliveryType === "video" ? 0 : seats });
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl text-bordeaux">Creer une session gratuite</DialogTitle>
        <DialogDescription>Publiez un live Google Meet ou une video gratuite pour les eleves.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="ev-title">Title *</Label>
          <Input id="ev-title" value={title} onChange={(e) => { setTitle(e.target.value); updateErrorState("title"); }} placeholder="Live Workshop: ..." className={errors.title ? "border-destructive" : undefined} />
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={deliveryType} onValueChange={(value: "google_meet" | "video") => setDeliveryType(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google_meet">Live Google Meet</SelectItem>
                <SelectItem value="video">Video gratuite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {deliveryType === "google_meet" ? (
          <div className="space-y-2">
            <Label htmlFor="ev-seats">Places</Label>
            <Input id="ev-seats" type="number" min={1} value={seats} onChange={(e) => { setSeats(Number(e.target.value)); updateErrorState("seats_total"); }} className={errors.seats_total ? "border-destructive" : undefined} />
            {errors.seats_total ? <p className="text-xs text-destructive">{errors.seats_total}</p> : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="ev-link">{deliveryType === "video" ? "Lien video *" : "Lien Google Meet *"}</Label>
          <Input id="ev-link" value={accessUrl} onChange={(e) => { setAccessUrl(e.target.value); updateErrorState("access_url"); }} placeholder={deliveryType === "video" ? "https://youtube.com/..." : "https://meet.google.com/..."} className={errors.access_url ? "border-destructive" : undefined} />
          {errors.access_url ? <p className="text-xs text-destructive">{errors.access_url}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-date">Date et heure *</Label>
          <Input id="ev-date" type="datetime-local" value={eventDate} onChange={(e) => { setEventDate(e.target.value); updateErrorState("event_date"); }} className={errors.event_date ? "border-destructive" : undefined} />
          {errors.event_date ? <p className="text-xs text-destructive">{errors.event_date}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-desc">Description</Label>
          <Textarea id="ev-desc" value={description} onChange={(e) => { setDescription(e.target.value); updateErrorState("description"); }} rows={3} className={errors.description ? "border-destructive" : undefined} />
          {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
        </div>
        <Button type="submit" disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
          {isPending ? "Publication..." : "Publier la session"}
        </Button>
      </form>
    </DialogContent>
  );
}
