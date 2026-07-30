import { Link, createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import {
  BookOpen, CheckCircle2, ChevronRight, ChevronLeft, Circle,
  ExternalLink, FileText, Loader2, PlayCircle, X, AlertCircle,
  GraduationCap, Dumbbell, FolderOpen,
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SubscriptionGate } from "@/components/SubscriptionGate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api, { assetUrl } from "@/lib/api"
import type { ChapterDetailResponse, ChapterResource } from "@/lib/types"

export const Route = createFileRoute("/courses/$subjectSlug/$chapterSlug")({
  head: () => ({ meta: [{ title: "Chapitre — Edutopia" }] }),
  component: ChapterPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ChapterResource["resource_type"], string> = {
  pdf_lesson:       "Cours PDF",
  video_lesson:     "Vidéo",
  exercise_sheet:   "Exercice",
  correction_sheet: "Correction",
  extra_resource:   "Extra",
}

const RESOURCE_GROUPS: { label: string; icon: React.FC<{ className?: string }>; types: ChapterResource["resource_type"][] }[] = [
  { label: "Cours",       icon: GraduationCap, types: ["pdf_lesson", "video_lesson"] },
  { label: "Exercices",   icon: Dumbbell,      types: ["exercise_sheet"] },
  { label: "Corrections", icon: BookOpen,       types: ["correction_sheet"] },
  { label: "Ressources",  icon: FolderOpen,     types: ["extra_resource"] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

function resourceUrl(r: ChapterResource): string | null {
  return assetUrl(r.file_url) ?? assetUrl(r.external_url)
}

function ResourceIcon({ type, className = "h-5 w-5" }: { type: ChapterResource["resource_type"]; className?: string }) {
  if (type === "video_lesson")    return <PlayCircle className={`${className} text-bordeaux`} />
  if (type === "exercise_sheet")  return <Dumbbell   className={`${className} text-emerald-600`} />
  if (type === "correction_sheet")return <BookOpen   className={`${className} text-amber-600`} />
  return <FileText className={`${className} text-bordeaux`} />
}

// ─── Resource Viewer (fullscreen overlay) ────────────────────────────────────

interface ViewerProps {
  resource: ChapterResource
  allResources: ChapterResource[]
  onClose: () => void
  onNavigate: (r: ChapterResource) => void
}

function ResourceViewer({ resource, allResources, onClose, onNavigate }: ViewerProps) {
  const url      = resourceUrl(resource)
  const isVideo  = resource.resource_type === "video_lesson"
  const ytId     = url && isVideo ? getYouTubeId(url) : null
  const isDirect = isVideo && !ytId

  const idx  = allResources.findIndex(r => r.id === resource.id)
  const prev = idx > 0                        ? allResources[idx - 1] : null
  const next = idx < allResources.length - 1  ? allResources[idx + 1] : null

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-2.5 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>

        <div className="h-4 w-px bg-border" />

        <ResourceIcon type={resource.resource_type} className="h-4 w-4 flex-shrink-0" />
        <h2 className="font-semibold text-sm text-foreground truncate flex-1 min-w-0">
          {resource.title}
        </h2>
        <Badge className="hidden sm:inline-flex bg-gold/15 text-bordeaux border border-gold/40 flex-shrink-0">
          {RESOURCE_TYPE_LABELS[resource.resource_type]}
        </Badge>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Fermer (Échap)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-muted/30 relative">
        {!url ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-10 w-10" />
            <p className="text-sm font-medium">Aucun fichier lié à cette ressource.</p>
          </div>
        ) : ytId ? (
          /* YouTube embed */
          <iframe
            key={ytId}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        ) : isDirect ? (
          /* Direct video file */
          <div className="flex h-full items-center justify-center p-4 bg-black">
            <video
              key={url}
              src={url}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-lg shadow-2xl"
            />
          </div>
        ) : (
          /* PDF / other — iframe viewer */
          <iframe
            key={url}
            src={url}
            title={resource.title}
            className="h-full w-full border-0"
          />
        )}
      </div>

      {/* ── Bottom navigation ────────────────────────────────────── */}
      {(prev || next) && (
        <div className="flex items-center justify-between gap-4 border-t border-border bg-background/95 px-4 py-2.5 flex-shrink-0">
          <button
            onClick={() => prev && onNavigate(prev)}
            disabled={!prev}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline truncate max-w-[180px]">{prev?.title ?? ""}</span>
            <span className="sm:hidden">Précédent</span>
          </button>

          <span className="text-xs text-muted-foreground flex-shrink-0">
            {idx + 1} / {allResources.length}
          </span>

          <button
            onClick={() => next && onNavigate(next)}
            disabled={!next}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline truncate max-w-[180px]">{next?.title ?? ""}</span>
            <span className="sm:hidden">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  onOpen,
  onToggleComplete,
  completing,
}: {
  resource: ChapterResource
  onOpen: () => void
  onToggleComplete: (id: number, current: boolean) => void
  completing: boolean
}) {
  const url       = resourceUrl(resource)
  const completed = Boolean(resource.is_completed)

  const accentClass: Record<ChapterResource["resource_type"], string> = {
    pdf_lesson:       "border-l-bordeaux/60",
    video_lesson:     "border-l-blue-500/60",
    exercise_sheet:   "border-l-emerald-500/60",
    correction_sheet: "border-l-amber-500/60",
    extra_resource:   "border-l-violet-500/60",
  }

  return (
    <article className={`flex items-start gap-4 rounded-xl border border-border border-l-4 ${accentClass[resource.resource_type]} bg-card p-5 shadow-sm transition-all hover:shadow-md ${completed ? "bg-emerald-50/40" : ""}`}>
      {/* Completion toggle */}
      <button
        onClick={() => onToggleComplete(resource.id, completed)}
        disabled={completing}
        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 focus:outline-none"
        title={completed ? "Marquer comme non terminé" : "Marquer comme terminé"}
      >
        {completed
          ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          : <Circle className="h-6 w-6 text-border hover:text-emerald-400 transition-colors" />
        }
      </button>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-gold/10 text-bordeaux border border-gold/30 text-xs">
            {RESOURCE_TYPE_LABELS[resource.resource_type]}
          </Badge>
          {resource.duration_minutes && (
            <span className="text-xs text-muted-foreground">{resource.duration_minutes} min</span>
          )}
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Terminé
            </span>
          )}
        </div>
        <h3 className={`mt-2 font-display text-lg font-semibold leading-snug ${completed ? "text-muted-foreground line-through decoration-emerald-400/60" : "text-foreground"}`}>
          {resource.title}
        </h3>
        {resource.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {url ? (
          <>
            <Button
              size="sm"
              onClick={onOpen}
              className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-sm"
            >
              {resource.resource_type === "video_lesson" ? (
                <><PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Voir</>
              ) : (
                <><FileText className="mr-1.5 h-3.5 w-3.5" /> Ouvrir</>
              )}
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="h-3 w-3" /> Onglet
            </a>
          </>
        ) : (
          <span className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
            Bientôt
          </span>
        )}
      </div>
    </article>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ChapterPage() {
  const { subjectSlug, chapterSlug } = Route.useParams()
  const [viewerResource, setViewerResource] = useState<ChapterResource | null>(null)
  const queryClient = useQueryClient()

  const queryKey = ["course-chapter", subjectSlug, chapterSlug]

  const { data, isLoading, error } = useQuery<ChapterDetailResponse>({
    queryKey,
    queryFn: async () => {
      const res = await api.get<ChapterDetailResponse>(
        `/courses/subjects/${subjectSlug}/chapters/${chapterSlug}`
      )
      return res.data
    },
  })

  // Optimistic toggle
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      completed
        ? api.delete(`/courses/resources/${id}/complete`)
        : api.post(`/courses/resources/${id}/complete`),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<ChapterDetailResponse>(queryKey)
      queryClient.setQueryData<ChapterDetailResponse>(queryKey, old => {
        if (!old) return old
        return {
          ...old,
          resources: old.resources.map(r =>
            r.id === id ? { ...r, is_completed: !completed } : r
          ),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev)
      toast.error("Erreur lors de la mise à jour")
    },
    onSuccess: (_data, { completed }) => {
      toast.success(completed ? "Marqué comme non terminé" : "Terminé ✓")
      // Also invalidate the chapters list so progress bar updates
      queryClient.invalidateQueries({ queryKey: ["course-chapters", subjectSlug] })
    },
  })

  const handleToggleComplete = useCallback(
    (id: number, completed: boolean) => toggleMutation.mutate({ id, completed }),
    [toggleMutation]
  )

  const handleNavigate = useCallback((r: ChapterResource) => setViewerResource(r), [])
  const handleClose    = useCallback(() => setViewerResource(null), [])

  const isSubscriptionBlocked = (error as any)?.response?.data?.code === "SUBSCRIPTION_REQUIRED"
  const needsAcademicTrack    = (error as any)?.response?.data?.code === "ACADEMIC_TRACK_REQUIRED"
  const isQuizLocked          = (error as any)?.response?.data?.code === "QUIZ_LOCKED"

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (isQuizLocked) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-bordeaux/10 text-bordeaux">
            <FolderOpen className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Chapitre verrouillé</h1>
          <p className="mt-3 text-muted-foreground">
            Réussis le quiz du chapitre précédent pour débloquer ce chapitre.
          </p>
          <div className="mt-6">
            <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
              <Link to="/courses/$subjectSlug" params={{ subjectSlug }}>Retour aux chapitres</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (isSubscriptionBlocked) {
    return (
      <section className="container mx-auto px-4 py-12">
        <SubscriptionGate
          resourceKey="courses"
          title="Abonnement requis"
          description="Activez votre abonnement pour accéder à ce chapitre et ses ressources."
        />
      </section>
    )
  }

  if (needsAcademicTrack) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold text-foreground">Complète ton profil d'abord</h1>
          <p className="mt-3 text-muted-foreground">Nous avons besoin de ton niveau et de ta section.</p>
          <div className="mt-6">
            <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
              <Link to="/profile">Ouvrir le profil</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // ── Group resources by category ─────────────────────────────────────────────
  const resources = data?.resources ?? []
  const groups = RESOURCE_GROUPS
    .map(g => ({ ...g, items: resources.filter(r => g.types.includes(r.resource_type)) }))
    .filter(g => g.items.length > 0)

  return (
    <>
      {/* Viewer overlay */}
      {viewerResource && (
        <ResourceViewer
          resource={viewerResource}
          allResources={resources}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />
      )}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-14">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-2 text-sm text-primary-foreground/60">
            <Link to="/courses" className="hover:text-primary-foreground transition-colors">Matières</Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              to="/courses/$subjectSlug"
              params={{ subjectSlug }}
              className="hover:text-primary-foreground transition-colors"
            >
              {data?.subject.name ?? "Matière"}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-primary-foreground/90">{data?.chapter.title ?? "Chapitre"}</span>
          </nav>

          {/* Badges */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {data?.track?.title && (
              <Badge className="bg-white/10 text-primary-foreground border-white/20">
                {data.track.title}
              </Badge>
            )}
            <Badge className="bg-gold text-gold-foreground border-0">
              {resources.length} ressource{resources.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <h1 className="mt-5 font-display text-4xl md:text-5xl font-bold leading-tight">
            {data?.chapter.title ?? "Chargement..."}
          </h1>
          {data?.chapter.description && (
            <p className="mt-4 max-w-2xl text-primary-foreground/75 leading-relaxed">
              {data.chapter.description}
            </p>
          )}

          {/* Resource type counts */}
          {resources.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-primary-foreground/70">
              {data?.resources.filter(r => r.resource_type === "video_lesson").length ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <PlayCircle className="h-3.5 w-3.5" />
                  {data.resources.filter(r => r.resource_type === "video_lesson").length} vidéo{data.resources.filter(r => r.resource_type === "video_lesson").length > 1 ? "s" : ""}
                </span>
              ) : null}
              {data?.resources.filter(r => r.resource_type === "pdf_lesson").length ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <FileText className="h-3.5 w-3.5" />
                  {data.resources.filter(r => r.resource_type === "pdf_lesson").length} cours PDF
                </span>
              ) : null}
              {data?.resources.filter(r => r.resource_type === "exercise_sheet").length ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {data.resources.filter(r => r.resource_type === "exercise_sheet").length} exercice{data.resources.filter(r => r.resource_type === "exercise_sheet").length > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* ── Resources ──────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-10 space-y-10">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-bordeaux" />
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Aucune ressource publiée pour ce chapitre.</p>
            <p className="text-xs text-muted-foreground/70">Revenez bientôt — le contenu sera ajouté prochainement.</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bordeaux/10">
                  <group.icon className="h-4 w-4 text-bordeaux" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground">{group.label}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>

              {/* Resource cards */}
              <div className="grid gap-3 lg:grid-cols-2">
                {group.items.map(resource => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onOpen={() => setViewerResource(resource)}
                    onToggleComplete={handleToggleComplete}
                    completing={toggleMutation.isPending && toggleMutation.variables?.id === resource.id}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Bottom nav: prev/next chapter */}
        {data && (
          <div className="flex justify-between gap-4 pt-6 border-t border-border">
            <Button
              variant="outline"
              asChild
              className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"
            >
              <Link to="/courses/$subjectSlug" params={{ subjectSlug }}>
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Tous les chapitres
              </Link>
            </Button>
          </div>
        )}
      </section>
    </>
  )
}
