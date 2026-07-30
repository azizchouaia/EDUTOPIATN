import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { BookOpen, CheckCircle2, ChevronRight, FileText, Loader2, PlayCircle, Lock, Trophy, ClipboardCheck } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { SubscriptionGate } from "@/components/SubscriptionGate"
import { QuizModal } from "@/components/QuizModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import type { SubjectChaptersResponse } from "@/lib/types"

export const Route = createFileRoute("/courses/$subjectSlug/")({
  component: SubjectIndexPage,
})

function SubjectIndexPage() {
  const { subjectSlug } = Route.useParams()
  const queryClient = useQueryClient()
  const [quizChapter, setQuizChapter] = useState<{ id: number; title: string } | null>(null)
  const { data, isLoading, error } = useQuery<SubjectChaptersResponse>({
    queryKey: ["course-chapters", subjectSlug],
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
            {data.chapters.map((chapter, index) => {
              const total     = chapter.resource_count
              const done      = chapter.completed_count ?? 0
              const pct       = total > 0 ? Math.round((done / total) * 100) : 0
              const allDone   = total > 0 && done >= total
              const locked    = Boolean((chapter as any).locked)
              const hasQuiz   = Boolean((chapter as any).has_quiz)
              const quizPassed = Boolean((chapter as any).quiz_passed)

              return (
              <article key={chapter.id} className={`relative rounded-3xl border bg-card p-6 shadow-sm transition-transform ${locked ? "border-border opacity-80" : `hover:-translate-y-1 hover:shadow-elegant ${allDone ? "border-emerald-200 dark:border-emerald-800/50" : "border-border"}`}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Chapitre {index + 1}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">{chapter.title}</h2>
                    {chapter.description && <p className="mt-3 text-sm text-muted-foreground">{chapter.description}</p>}
                  </div>
                  {locked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground flex-shrink-0">
                      <Lock className="h-3.5 w-3.5" /> Verrouillé
                    </span>
                  ) : quizPassed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                      <Trophy className="h-3.5 w-3.5" /> Quiz réussi
                    </span>
                  ) : allDone ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
                    </span>
                  ) : (
                    <Badge className="bg-gold/15 text-bordeaux border border-gold/40 flex-shrink-0">{chapter.resource_count} ressources</Badge>
                  )}
                </div>

                {/* Progress bar */}
                {total > 0 && !locked && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{done}/{total} ressources</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : "bg-bordeaux"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {locked ? (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0" />
                    Réussis le quiz du chapitre précédent pour débloquer ce chapitre.
                  </p>
                ) : (
                  <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><PlayCircle className="h-3.5 w-3.5" /> {chapter.video_count} vidéos</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><FileText className="h-3.5 w-3.5" /> {chapter.pdf_count} cours</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"><BookOpen className="h-3.5 w-3.5" /> {chapter.exercise_count} exercices</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">{chapter.correction_count} corrections</span>
                  </div>
                )}

                {!locked && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                      <Link to="/courses/$subjectSlug/$chapterSlug" params={{ subjectSlug, chapterSlug: chapter.slug }}>
                        {allDone ? "Revoir le chapitre" : done > 0 ? "Continuer" : "Ouvrir le chapitre"}
                      </Link>
                    </Button>
                    {hasQuiz && (
                      <Button
                        variant="outline"
                        className={quizPassed ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5" : "border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"}
                        onClick={() => setQuizChapter({ id: chapter.id, title: chapter.title })}
                      >
                        <ClipboardCheck className="mr-1.5 h-4 w-4" />
                        {quizPassed ? "Refaire le quiz" : "Passer le quiz"}
                      </Button>
                    )}
                  </div>
                )}
              </article>
              )
            })}
          </div>
        )}
      </section>

      {quizChapter && (
        <QuizModal
          chapterId={quizChapter.id}
          chapterTitle={quizChapter.title}
          onClose={() => setQuizChapter(null)}
          onPassed={() => queryClient.invalidateQueries({ queryKey: ["course-chapters", subjectSlug] })}
        />
      )}
    </>
  )
}