import { Link, createFileRoute } from "@tanstack/react-router"
import { BookOpen, ChevronRight, ExternalLink, FileText, Loader2, PlayCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { SubscriptionGate } from "@/components/SubscriptionGate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api, { assetUrl } from "@/lib/api"
import type { ChapterDetailResponse, ChapterResource } from "@/lib/types"

export const Route = createFileRoute("/courses/$subjectSlug/$chapterSlug")({
  component: ChapterPage,
})

const RESOURCE_TYPE_LABELS: Record<ChapterResource["resource_type"], string> = {
  pdf_lesson: "PDF lesson",
  video_lesson: "Video lesson",
  exercise_sheet: "Exercise sheet",
  correction_sheet: "Correction sheet",
  extra_resource: "Extra resource",
}

function resourceIcon(type: ChapterResource["resource_type"]) {
  if (type === "video_lesson") return <PlayCircle className="h-5 w-5 text-bordeaux" />
  if (type === "exercise_sheet") return <BookOpen className="h-5 w-5 text-bordeaux" />
  return <FileText className="h-5 w-5 text-bordeaux" />
}

function ChapterPage() {
  const { subjectSlug, chapterSlug } = Route.useParams()
  const { data, isLoading, error } = useQuery<ChapterDetailResponse>({
    queryKey: ["course-chapter", subjectSlug, chapterSlug],
    queryFn: async () => {
      const res = await api.get<ChapterDetailResponse>(`/courses/subjects/${subjectSlug}/chapters/${chapterSlug}`)
      return res.data
    },
  })

  const isSubscriptionBlocked = (error as any)?.response?.data?.code === "SUBSCRIPTION_REQUIRED"
  const needsAcademicTrack = (error as any)?.response?.data?.code === "ACADEMIC_TRACK_REQUIRED"

  if (isSubscriptionBlocked) {
    return (
      <section className="container mx-auto px-4 py-12">
        <SubscriptionGate
          resourceKey="courses"
          title="Courses unlock after subscription activation"
          description="Activate your subscription to see this chapter and its resources."
        />
      </section>
    )
  }

  if (needsAcademicTrack) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold text-foreground">Complete your class and section first</h1>
          <p className="mt-3 text-muted-foreground">We need your academic track before we can match this chapter to your profile.</p>
          <div className="mt-6">
            <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
              <Link to="/profile">Open profile</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-wrap items-center gap-2 text-sm text-primary-foreground/70">
            <Link to="/courses" className="hover:text-primary-foreground">Subjects</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/courses/$subjectSlug" params={{ subjectSlug }} className="hover:text-primary-foreground">{data?.subject.name ?? "Subject"}</Link>
            <ChevronRight className="h-4 w-4" />
            <span>{data?.chapter.title ?? "Chapter"}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {data?.track?.title && <Badge className="bg-white/10 text-primary-foreground border-white/20">{data.track.title}</Badge>}
            <Badge className="bg-gold text-gold-foreground border-0">{data?.resources.length ?? 0} resources</Badge>
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold">{data?.chapter.title ?? "Loading..."}</h1>
          {data?.chapter.description && <p className="mt-4 max-w-2xl text-primary-foreground/80">{data.chapter.description}</p>}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-bordeaux" /></div>
        ) : !data || data.resources.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">No resources are published for this chapter yet.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.resources.map((resource) => {
              const href = assetUrl(resource.file_url) ?? assetUrl(resource.external_url)

              return (
                <article key={resource.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{resourceIcon(resource.resource_type)}</div>
                    <div className="min-w-0 flex-1">
                      <Badge className="bg-gold/15 text-bordeaux border border-gold/40">{RESOURCE_TYPE_LABELS[resource.resource_type]}</Badge>
                      <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">{resource.title}</h2>
                      {resource.description && <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>}
                      {resource.duration_minutes ? <p className="mt-3 text-xs text-muted-foreground">Estimated duration: {resource.duration_minutes} min</p> : null}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {href ? (
                      <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                        <a href={href} target="_blank" rel="noreferrer">
                          Open resource <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">No file linked yet</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}