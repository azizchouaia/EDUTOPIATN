import { Link, createFileRoute } from "@tanstack/react-router"
import { BookOpen, ChevronRight, FileText, Loader2, PlayCircle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { SubscriptionGate } from "@/components/SubscriptionGate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { SubjectChaptersResponse } from "@/lib/types"

export const Route = createFileRoute("/courses/$subjectSlug/")({
  component: SubjectIndexPage,
})

function SubjectIndexPage() {
  const { subjectSlug } = Route.useParams()
  const { data, isLoading, error } = useQuery<SubjectChaptersResponse>({
    queryKey: ["course-subject-chapters", subjectSlug],
    queryFn: async () => {
      const res = await api.get<SubjectChaptersResponse>(`/courses/subjects/${subjectSlug}/chapters`)
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
          description="Activate your subscription to see the chapters in this subject."
        />
      </section>
    )
  }

  if (needsAcademicTrack) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <h1 className="font-display text-3xl font-bold text-foreground">Complete your class and section first</h1>
          <p className="mt-3 text-muted-foreground">We need your academic track before we can match this subject to your profile.</p>
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
            <span>{data?.subject.name ?? "Subject"}</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {data?.track?.title && <Badge className="bg-white/10 text-primary-foreground border-white/20">{data.track.title}</Badge>}
            <Badge className="bg-gold text-gold-foreground border-0">{data?.chapters.length ?? 0} chapters</Badge>
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold">{data?.subject.name ?? "Loading..."}</h1>
          {data?.subject.description && <p className="mt-4 max-w-2xl text-primary-foreground/80">{data.subject.description}</p>}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-bordeaux" /></div>
        ) : !data || data.chapters.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">No chapters are published for this subject yet.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.chapters.map((chapter, index) => (
              <article key={chapter.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-elegant">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Chapter {index + 1}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">{chapter.title}</h2>
                    {chapter.description && <p className="mt-3 text-sm text-muted-foreground">{chapter.description}</p>}
                  </div>
                  <Badge className="bg-gold/15 text-bordeaux border border-gold/40">{chapter.resource_count} resources</Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><PlayCircle className="h-3.5 w-3.5" /> {chapter.video_count} videos</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><FileText className="h-3.5 w-3.5" /> {chapter.pdf_count} lessons</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><BookOpen className="h-3.5 w-3.5" /> {chapter.exercise_count} exercises</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">{chapter.correction_count} corrections</span>
                </div>

                <div className="mt-6">
                  <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                    <Link to="/courses/$subjectSlug/$chapterSlug" params={{ subjectSlug, chapterSlug: chapter.slug }}>Open chapter</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}