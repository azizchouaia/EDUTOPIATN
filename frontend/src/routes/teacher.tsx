import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen, CalendarDays, Eye, EyeOff, Layers3, Link2, Loader2, Pencil, PlayCircle, Plus, Trash2, User, UserRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/hooks/useAuth"
import api from "@/lib/api"
import { isAuthenticated } from "@/lib/auth"
import { GRADE_OPTIONS, SECTION_OPTIONS, formatAcademicTrack, needsSection } from "@/lib/academic"
import { hasErrors, hasMinLength, isBlank, isFutureDateTime, isNonNegativeInteger, isNonNegativeNumber, isPositiveInteger, isValidDateInput, isValidSlug, isValidUrl, type FormErrors } from "@/lib/validation"
import type { Course, Event } from "@/lib/types"

type CourseForm = {
  title: string
  description: string
  category: string
  price: string
  duration_hours: string
  lessons_count: string
  cover_image: string
}

type ChapterForm = {
  title: string
  slug: string
  description: string
  display_order: string
  is_published: boolean
}

type ResourceType = "pdf_lesson" | "video_lesson" | "exercise_sheet" | "correction_sheet" | "extra_resource"

type EventForm = {
  title: string
  description: string
  category: string
  grade_code: string
  section_code: string
  course_id: string
  delivery_type: Event["delivery_type"]
  access_url: string
  event_date: string
  seats_total: string
}

type ResourceForm = {
  chapter_id: string
  resource_type: ResourceType
  title: string
  description: string
  file_url: string
  external_url: string
  duration_minutes: string
  display_order: string
  is_published: boolean
}

type TeacherCourseResource = {
  id: number
  chapter_id: number
  resource_type: ResourceType
  title: string
  description: string | null
  file_url: string | null
  external_url: string | null
  duration_minutes: number | null
  display_order: number
  is_published: number
}

type TeacherCourseChapter = {
  id: number
  course_id: number
  title: string
  slug: string
  description: string | null
  display_order: number
  is_published: number
  resources: TeacherCourseResource[]
}

type TeacherCourseOutline = {
  course: Course
  chapters: TeacherCourseChapter[]
}

type TeacherCourseStudent = {
  id: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  college: string | null
  school_cycle: "college" | "lycee" | null
  grade_code: string | null
  section_code: string | null
  progress: number
  completed: number
  enrolled_at: string
}

type TeacherCourseStudentsResponse = {
  course: Course
  stats: {
    total_students: number
    completed_students: number
    avg_progress: number
  }
  students: TeacherCourseStudent[]
}

const INITIAL_FORM: CourseForm = {
  title: "",
  description: "",
  category: "",
  price: "0",
  duration_hours: "0",
  lessons_count: "0",
  cover_image: "",
}

const INITIAL_CHAPTER_FORM: ChapterForm = {
  title: "",
  slug: "",
  description: "",
  display_order: "0",
  is_published: false,
}

const INITIAL_RESOURCE_FORM: ResourceForm = {
  chapter_id: "",
  resource_type: "pdf_lesson",
  title: "",
  description: "",
  file_url: "",
  external_url: "",
  duration_minutes: "",
  display_order: "0",
  is_published: false,
}

const INITIAL_EVENT_FORM: EventForm = {
  title: "",
  description: "",
  category: "",
  grade_code: "",
  section_code: "",
  course_id: "",
  delivery_type: "google_meet",
  access_url: "",
  event_date: "",
  seats_total: "20",
}

const RESOURCE_OPTIONS: Array<{ value: ResourceType; label: string }> = [
  { value: "pdf_lesson", label: "PDF lesson" },
  { value: "video_lesson", label: "Video lesson" },
  { value: "exercise_sheet", label: "Exercise sheet" },
  { value: "correction_sheet", label: "Correction sheet" },
  { value: "extra_resource", label: "Extra resource" },
]

export const Route = createFileRoute("/teacher")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" })
    }
  },
  head: () => ({
    meta: [
      { title: "Teacher Workspace - Edutopia" },
      { name: "description", content: "Create, edit, and publish your courses from a dedicated teacher workspace." },
    ],
  }),
  component: TeacherWorkspacePage,
})

function TeacherWorkspacePage() {
  const queryClient = useQueryClient()
  const { data: user } = useMe()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState<CourseForm>(INITIAL_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [errors, setErrors] = useState<FormErrors<keyof CourseForm & string>>({})
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [chapterForm, setChapterForm] = useState<ChapterForm>(INITIAL_CHAPTER_FORM)
  const [resourceForm, setResourceForm] = useState<ResourceForm>(INITIAL_RESOURCE_FORM)
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null)
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>(INITIAL_EVENT_FORM)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [chapterErrors, setChapterErrors] = useState<FormErrors<keyof ChapterForm & string>>({})
  const [resourceErrors, setResourceErrors] = useState<FormErrors<keyof ResourceForm & string>>({})
  const [eventErrors, setEventErrors] = useState<FormErrors<keyof EventForm & string>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !user) return
    if (user.role === "admin") {
      window.location.replace("/admin")
      return
    }
    if (user.role !== "teacher") {
      window.location.replace("/dashboard")
    }
  }, [mounted, user])

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["teacher-courses"],
    enabled: mounted && user?.role === "teacher",
    queryFn: async () => (await api.get<Course[]>("/courses", { params: { mine: true } })).data,
  })

  useEffect(() => {
    if (courses.length === 0) {
      setSelectedCourseId(null)
      return
    }

    const hasSelected = selectedCourseId !== null && courses.some((course) => course.id === selectedCourseId)
    if (!hasSelected) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  const { data: outline, isLoading: isOutlineLoading } = useQuery<TeacherCourseOutline>({
    queryKey: ["teacher-course-outline", selectedCourseId],
    enabled: selectedCourseId !== null,
    queryFn: async () => (await api.get<TeacherCourseOutline>(`/courses/${selectedCourseId}/outline`)).data,
  })

  const { data: events = [], isLoading: isEventsLoading } = useQuery<Event[]>({
    queryKey: ["teacher-events"],
    enabled: mounted && user?.role === "teacher",
    queryFn: async () => (await api.get<Event[]>("/events", { params: { mine: true } })).data,
  })

  const { data: studentRoster, isLoading: isStudentsLoading } = useQuery<TeacherCourseStudentsResponse>({
    queryKey: ["teacher-course-students", selectedCourseId],
    enabled: selectedCourseId !== null,
    queryFn: async () => (await api.get<TeacherCourseStudentsResponse>(`/courses/${selectedCourseId}/students`)).data,
  })

  useEffect(() => {
    if (!outline?.chapters.length) {
      setResourceForm((prev) => ({ ...prev, chapter_id: "" }))
      return
    }

    const hasSelectedChapter = outline.chapters.some((chapter) => String(chapter.id) === resourceForm.chapter_id)
    if (!hasSelectedChapter) {
      setResourceForm((prev) => ({ ...prev, chapter_id: String(outline.chapters[0].id) }))
    }
  }, [outline, resourceForm.chapter_id])

  useEffect(() => {
    if (!needsSection(eventForm.grade_code) && eventForm.section_code) {
      setEventForm((prev) => ({ ...prev, section_code: "" }))
    }
  }, [eventForm.grade_code, eventForm.section_code])

  useEffect(() => {
    if (courses.length === 0) {
      if (eventForm.course_id) {
        setEventForm((prev) => ({ ...prev, course_id: "" }))
      }
      return
    }

    const hasSelectedCourse = courses.some((course) => String(course.id) === eventForm.course_id)
    if (!hasSelectedCourse) {
      setEventForm((prev) => ({
        ...prev,
        course_id: selectedCourseId ? String(selectedCourseId) : String(courses[0].id),
      }))
    }
  }, [courses, eventForm.course_id, selectedCourseId])

  const createMutation = useMutation({
    mutationFn: () => api.post("/courses", coursePayload(form)),
    onSuccess: (response) => {
      toast.success("Cours cree.")
      resetForm(setForm, setEditingId, setErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] })
      const nextId = response.data?.id
      if (typeof nextId === "number") {
        setSelectedCourseId(nextId)
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du cours impossible.")),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/courses/${id}`, data),
    onSuccess: () => {
      toast.success("Cours mis a jour.")
      resetForm(setForm, setEditingId, setErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour du cours impossible.")),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/${id}`),
    onSuccess: () => {
      toast.success("Cours supprime.")
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression du cours impossible.")),
  })

  const createChapterMutation = useMutation({
    mutationFn: () => api.post(`/courses/${selectedCourseId}/chapters`, chapterPayload(chapterForm)),
    onSuccess: () => {
      toast.success("Chapitre cree.")
      resetChapterForm(setChapterForm, setEditingChapterId, setChapterErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du chapitre impossible.")),
  })

  const updateChapterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/courses/chapters/${id}`, data),
    onSuccess: () => {
      toast.success("Chapitre mis a jour.")
      resetChapterForm(setChapterForm, setEditingChapterId, setChapterErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour du chapitre impossible.")),
  })

  const deleteChapterMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/chapters/${id}`),
    onSuccess: () => {
      toast.success("Chapitre supprime.")
      resetChapterForm(setChapterForm, setEditingChapterId, setChapterErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression du chapitre impossible.")),
  })

  const createResourceMutation = useMutation({
    mutationFn: () => api.post(`/courses/${selectedCourseId}/resources`, resourcePayload(resourceForm)),
    onSuccess: () => {
      toast.success("Ressource creee.")
      resetResourceForm(setResourceForm, setEditingResourceId, setResourceErrors, outline?.chapters[0]?.id)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation de la ressource impossible.")),
  })

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/courses/resources/${id}`, data),
    onSuccess: () => {
      toast.success("Ressource mise a jour.")
      resetResourceForm(setResourceForm, setEditingResourceId, setResourceErrors, outline?.chapters[0]?.id)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de la ressource impossible.")),
  })

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/resources/${id}`),
    onSuccess: () => {
      toast.success("Ressource supprimee.")
      resetResourceForm(setResourceForm, setEditingResourceId, setResourceErrors, outline?.chapters[0]?.id)
      queryClient.invalidateQueries({ queryKey: ["teacher-course-outline", selectedCourseId] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression de la ressource impossible.")),
  })

  const createEventMutation = useMutation({
    mutationFn: () => api.post("/events", eventPayload(eventForm, courses)),
    onSuccess: () => {
      toast.success("Session creee.")
      resetEventForm(setEventForm, setEditingEventId, setEventErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-events"] })
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation de la session impossible.")),
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/events/${id}`, data),
    onSuccess: () => {
      toast.success("Session mise a jour.")
      resetEventForm(setEventForm, setEditingEventId, setEventErrors)
      queryClient.invalidateQueries({ queryKey: ["teacher-events"] })
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de la session impossible.")),
  })

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      toast.success("Session supprimee.")
      queryClient.invalidateQueries({ queryKey: ["teacher-events"] })
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression de la session impossible.")),
  })

  const stats = useMemo(() => {
    const published = courses.filter((course) => Boolean(course.is_published)).length
    const drafts = courses.length - published
    const chapterCount = outline?.chapters.length ?? 0
    const studentCount = studentRoster?.stats.total_students ?? 0

    return [
      { label: "Total courses", value: String(courses.length) },
      { label: "Published", value: String(published) },
      { label: "Drafts", value: String(drafts) },
      { label: "Chapters", value: String(chapterCount) },
      { label: "Students", value: String(studentCount) },
    ]
  }, [courses, outline, studentRoster])

  if (!mounted || !user) {
    return <LoadingState message="Loading teacher workspace..." />
  }

  if (user.role !== "teacher") {
    return <LoadingState message="Redirecting..." />
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <section className="container mx-auto px-4 py-8 md:px-6 lg:py-10">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-bordeaux/10 bg-gradient-to-br from-bordeaux-deep via-bordeaux to-[#a2273f] p-8 text-primary-foreground shadow-[0_24px_90px_rgba(122,19,37,0.28)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
                <UserRound className="h-3.5 w-3.5" /> Teacher workspace
              </div>
              <h1 className="font-display text-4xl font-bold md:text-5xl">Manage your courses without going through admin</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80 md:text-base">
                Create draft courses, refine the content, and publish only when the course is ready for students.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-bordeaux hover:bg-white/90">
                <Link to="/reclamations">Teacher support</Link>
              </Button>
            </div>
          </div>
        </section>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">Teacher profile</CardTitle>
            <CardDescription>Visible identity already ready to support your courses and sessions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-bordeaux ring-4 ring-gold/20 shadow-elegant">
                {user.avatar_url ? <img src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} className="h-16 w-16 rounded-full object-cover" /> : <User className="h-7 w-7 text-gold" />}
              </div>
              <div>
                <div className="font-display text-2xl font-semibold text-foreground">{user.first_name} {user.last_name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="border border-gold/30 bg-gold/10 text-bordeaux">Teacher</Badge>
                  {user.college ? <Badge className="border border-bordeaux/20 bg-bordeaux/5 text-bordeaux">{user.college}</Badge> : null}
                  {formatAcademicTrack(user) ? <Badge className="border border-border bg-muted/40 text-foreground">{formatAcademicTrack(user)}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="max-w-md text-sm leading-6 text-muted-foreground">
              <p>
                This profile block is ready to be surfaced now with the existing data model. A richer public teacher profile would be the next step if you want bio, expertise, and social links.
              </p>
              <Button asChild variant="outline" className="mt-4 border-bordeaux text-bordeaux hover:bg-bordeaux/5">
                <Link to="/profile">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <Card key={item.label} className="border-border/70 bg-white/85">
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
                <p className="mt-3 font-display text-4xl font-bold text-bordeaux">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="border-border/70 bg-white/85 xl:sticky xl:top-24 xl:self-start">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-bordeaux">{editingId ? "Edit course" : "Create course"}</CardTitle>
              <CardDescription>{editingId ? "Update the course details or keep it as a draft." : "Start with a draft, then publish when the course is ready."}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormInput label="Title" value={form.title} error={errors.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className={errors.description ? "border-destructive" : undefined} rows={5} />
                {errors.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
              </div>
              <FormInput label="Category" value={form.category} error={errors.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Price" type="number" value={form.price} error={errors.price} onChange={(value) => setForm((prev) => ({ ...prev, price: value }))} />
                <FormInput label="Hours" type="number" value={form.duration_hours} error={errors.duration_hours} onChange={(value) => setForm((prev) => ({ ...prev, duration_hours: value }))} />
              </div>
              <FormInput label="Lessons count" type="number" value={form.lessons_count} error={errors.lessons_count} onChange={(value) => setForm((prev) => ({ ...prev, lessons_count: value }))} />
              <FormInput label="Cover image URL" value={form.cover_image} error={errors.cover_image} onChange={(value) => setForm((prev) => ({ ...prev, cover_image: value }))} placeholder="https://..." />
              <div className="flex flex-wrap gap-3 pt-2">
                <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" onClick={() => handleSubmit(form, editingId, setErrors, createMutation.mutate, updateMutation.mutate)} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingId ? "Save changes" : "Create draft"}
                </Button>
                {editingId ? (
                  <Button variant="outline" className="border-bordeaux text-bordeaux" onClick={() => resetForm(setForm, setEditingId, setErrors)}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">My courses</CardTitle>
                <CardDescription>Your private working list includes both drafts and published courses.</CardDescription>
              </CardHeader>
            </Card>

            {isLoading ? (
              <LoadingCard />
            ) : courses.length === 0 ? (
              <Card className="border-border/70 bg-white/85">
                <CardContent className="grid min-h-[220px] place-items-center p-8 text-center">
                  <div>
                    <BookOpen className="mx-auto h-10 w-10 text-bordeaux/70" />
                    <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">No course yet</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Create your first draft course from the panel on the left.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {courses.map((course) => (
                  <Card key={course.id} className={`border-border/70 bg-white/85 ${selectedCourseId === course.id ? "ring-2 ring-bordeaux/20" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-display text-xl font-semibold text-foreground">{course.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{course.category ?? "No category"} · {Number(course.duration_hours ?? 0)} h · {Number(course.lessons_count ?? 0)} lessons</div>
                        </div>
                        <Badge className={course.is_published ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-amber-200 bg-amber-100 text-amber-800"}>
                          {course.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{course.description ?? "No description yet."}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>Price {Number(course.price ?? 0).toFixed(2)}</span>
                        <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => startEdit(course, setForm, setEditingId, setErrors)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => setSelectedCourseId(course.id)}>
                          <Layers3 className="mr-2 h-4 w-4" /> Content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-bordeaux text-bordeaux"
                          onClick={() => updateMutation.mutate({ id: course.id, data: { is_published: course.is_published ? 0 : 1 } })}
                        >
                          {course.is_published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                          {course.is_published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => deleteMutation.mutate(course.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedCourseId ? (
              <Card className="border-border/70 bg-white/85">
                <CardHeader>
                  <CardTitle className="font-display text-2xl text-foreground">Content studio</CardTitle>
                  <CardDescription>
                    {outline?.course.title ?? "Selected course"} · Build chapters and attach learning resources.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isOutlineLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading content outline...
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-6 xl:grid-cols-2">
                        <Card className="border-border/70 bg-background/70">
                          <CardHeader>
                            <CardTitle className="text-lg text-bordeaux">{editingChapterId ? "Edit chapter" : "New chapter"}</CardTitle>
                            <CardDescription>Structure the course into clear progressive steps.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <FormInput label="Title" value={chapterForm.title} error={chapterErrors.title} onChange={(value) => setChapterForm((prev) => ({ ...prev, title: value }))} />
                            <FormInput label="Slug" value={chapterForm.slug} error={chapterErrors.slug} onChange={(value) => setChapterForm((prev) => ({ ...prev, slug: value }))} placeholder="intro-algebre" />
                            <div className="space-y-1.5">
                              <Label>Description</Label>
                              <Textarea value={chapterForm.description} onChange={(event) => setChapterForm((prev) => ({ ...prev, description: event.target.value }))} className={chapterErrors.description ? "border-destructive" : undefined} rows={4} />
                              {chapterErrors.description ? <p className="text-xs text-destructive">{chapterErrors.description}</p> : null}
                            </div>
                            <FormInput label="Display order" type="number" value={chapterForm.display_order} error={chapterErrors.display_order} onChange={(value) => setChapterForm((prev) => ({ ...prev, display_order: value }))} />
                            <ToggleField label="Published" checked={chapterForm.is_published} onChange={(checked) => setChapterForm((prev) => ({ ...prev, is_published: checked }))} />
                            <div className="flex flex-wrap gap-3 pt-2">
                              <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={createChapterMutation.isPending || updateChapterMutation.isPending} onClick={() => handleChapterSubmit(chapterForm, editingChapterId, setChapterErrors, createChapterMutation.mutate, updateChapterMutation.mutate)}>
                                {createChapterMutation.isPending || updateChapterMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {editingChapterId ? "Save chapter" : "Add chapter"}
                              </Button>
                              {editingChapterId ? <Button variant="outline" className="border-bordeaux text-bordeaux" onClick={() => resetChapterForm(setChapterForm, setEditingChapterId, setChapterErrors)}>Cancel</Button> : null}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-border/70 bg-background/70">
                          <CardHeader>
                            <CardTitle className="text-lg text-bordeaux">{editingResourceId ? "Edit resource" : "New resource"}</CardTitle>
                            <CardDescription>Attach PDFs, videos, exercises, or supporting links to a chapter.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                              <Label>Chapter</Label>
                              <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${resourceErrors.chapter_id ? "border-destructive" : "border-input"}`} value={resourceForm.chapter_id} onChange={(event) => setResourceForm((prev) => ({ ...prev, chapter_id: event.target.value }))}>
                                <option value="">Select a chapter</option>
                                {(outline?.chapters ?? []).map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                              </select>
                              {resourceErrors.chapter_id ? <p className="text-xs text-destructive">{resourceErrors.chapter_id}</p> : null}
                            </div>
                            <div className="space-y-1.5">
                              <Label>Resource type</Label>
                              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={resourceForm.resource_type} onChange={(event) => setResourceForm((prev) => ({ ...prev, resource_type: event.target.value as ResourceType }))}>
                                {RESOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </div>
                            <FormInput label="Title" value={resourceForm.title} error={resourceErrors.title} onChange={(value) => setResourceForm((prev) => ({ ...prev, title: value }))} />
                            <div className="space-y-1.5">
                              <Label>Description</Label>
                              <Textarea value={resourceForm.description} onChange={(event) => setResourceForm((prev) => ({ ...prev, description: event.target.value }))} className={resourceErrors.description ? "border-destructive" : undefined} rows={3} />
                              {resourceErrors.description ? <p className="text-xs text-destructive">{resourceErrors.description}</p> : null}
                            </div>
                            <FormInput label="File URL" value={resourceForm.file_url} error={resourceErrors.file_url} onChange={(value) => setResourceForm((prev) => ({ ...prev, file_url: value }))} placeholder="https://..." />
                            <FormInput label="External URL" value={resourceForm.external_url} error={resourceErrors.external_url} onChange={(value) => setResourceForm((prev) => ({ ...prev, external_url: value }))} placeholder="https://..." />
                            {resourceErrors.source ? <p className="text-xs text-destructive">{resourceErrors.source}</p> : null}
                            <div className="grid gap-4 sm:grid-cols-2">
                              <FormInput label="Duration (min)" type="number" value={resourceForm.duration_minutes} error={resourceErrors.duration_minutes} onChange={(value) => setResourceForm((prev) => ({ ...prev, duration_minutes: value }))} />
                              <FormInput label="Display order" type="number" value={resourceForm.display_order} error={resourceErrors.display_order} onChange={(value) => setResourceForm((prev) => ({ ...prev, display_order: value }))} />
                            </div>
                            <ToggleField label="Published" checked={resourceForm.is_published} onChange={(checked) => setResourceForm((prev) => ({ ...prev, is_published: checked }))} />
                            <div className="flex flex-wrap gap-3 pt-2">
                              <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={createResourceMutation.isPending || updateResourceMutation.isPending || !outline?.chapters.length} onClick={() => handleResourceSubmit(resourceForm, editingResourceId, setResourceErrors, createResourceMutation.mutate, updateResourceMutation.mutate)}>
                                {createResourceMutation.isPending || updateResourceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {editingResourceId ? "Save resource" : "Add resource"}
                              </Button>
                              {editingResourceId ? <Button variant="outline" className="border-bordeaux text-bordeaux" onClick={() => resetResourceForm(setResourceForm, setEditingResourceId, setResourceErrors, outline?.chapters[0]?.id)}>Cancel</Button> : null}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {outline?.chapters.length ? (
                        <div className="space-y-4">
                          {outline.chapters.map((chapter) => (
                            <Card key={chapter.id} className="border-border/70 bg-background/70">
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-display text-xl font-semibold text-foreground">{chapter.title}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">Slug {chapter.slug} · Order {chapter.display_order}</div>
                                  </div>
                                  <Badge className={chapter.is_published ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-amber-200 bg-amber-100 text-amber-800"}>{chapter.is_published ? "Published" : "Draft"}</Badge>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">{chapter.description ?? "No chapter description yet."}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => startChapterEdit(chapter, setChapterForm, setEditingChapterId, setChapterErrors)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit chapter
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateChapterMutation.mutate({ id: chapter.id, data: { is_published: chapter.is_published ? 0 : 1 } })}>
                                    {chapter.is_published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                    {chapter.is_published ? "Unpublish" : "Publish"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => deleteChapterMutation.mutate(chapter.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete chapter
                                  </Button>
                                </div>

                                <div className="mt-5 space-y-3">
                                  {chapter.resources.length ? chapter.resources.map((resource) => (
                                    <div key={resource.id} className="rounded-2xl border border-border/70 bg-white px-4 py-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium text-foreground">{resource.title}</div>
                                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{resource.resource_type.replaceAll("_", " ")}</div>
                                        </div>
                                        <Badge className={resource.is_published ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-amber-200 bg-amber-100 text-amber-800"}>{resource.is_published ? "Published" : "Draft"}</Badge>
                                      </div>
                                      <p className="mt-2 text-sm text-muted-foreground">{resource.description ?? "No resource description yet."}</p>
                                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        {resource.file_url ? <a href={resource.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-bordeaux hover:underline"><Link2 className="h-4 w-4" /> File</a> : null}
                                        {resource.external_url ? <a href={resource.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-bordeaux hover:underline"><Link2 className="h-4 w-4" /> External</a> : null}
                                        <span>Order {resource.display_order}</span>
                                        {resource.duration_minutes ? <span>{resource.duration_minutes} min</span> : null}
                                      </div>
                                      <div className="mt-4 flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => startResourceEdit(resource, setResourceForm, setEditingResourceId, setResourceErrors)}>
                                          <Pencil className="mr-2 h-4 w-4" /> Edit resource
                                        </Button>
                                        <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateResourceMutation.mutate({ id: resource.id, data: { is_published: resource.is_published ? 0 : 1 } })}>
                                          {resource.is_published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                          {resource.is_published ? "Unpublish" : "Publish"}
                                        </Button>
                                        <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => deleteResourceMutation.mutate(resource.id)}>
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete resource
                                        </Button>
                                      </div>
                                    </div>
                                  )) : (
                                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                                      This chapter does not have resources yet.
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/80 bg-muted/30 px-6 py-12 text-center">
                          <p className="font-display text-2xl text-foreground">No chapter yet</p>
                          <p className="mt-2 text-sm text-muted-foreground">Start by creating the first chapter of this course, then attach its resources.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {selectedCourseId ? (
              <Card className="border-border/70 bg-white/85">
                <CardHeader>
                  <CardTitle className="font-display text-2xl text-foreground">Students & analytics</CardTitle>
                  <CardDescription>
                    {studentRoster?.course.title ?? outline?.course.title ?? "Selected course"} · Track enrollments, completion, and average progress.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isStudentsLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading student roster...
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-border/70 bg-background/70">
                          <CardContent className="p-5">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Enrolled</p>
                            <p className="mt-3 font-display text-4xl font-bold text-bordeaux">{studentRoster?.stats.total_students ?? 0}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-border/70 bg-background/70">
                          <CardContent className="p-5">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Completed</p>
                            <p className="mt-3 font-display text-4xl font-bold text-bordeaux">{studentRoster?.stats.completed_students ?? 0}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-border/70 bg-background/70">
                          <CardContent className="p-5">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Average progress</p>
                            <p className="mt-3 font-display text-4xl font-bold text-bordeaux">{studentRoster?.stats.avg_progress ?? 0}%</p>
                          </CardContent>
                        </Card>
                      </div>

                      {studentRoster?.students.length ? (
                        <div className="space-y-3">
                          {studentRoster.students.map((student) => (
                            <div key={student.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-bordeaux ring-2 ring-gold/15">
                                    {student.avatar_url ? <img src={student.avatar_url} alt={`${student.first_name} ${student.last_name}`} className="h-12 w-12 rounded-full object-cover" /> : <User className="h-5 w-5 text-gold" />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-foreground">{student.first_name} {student.last_name}</div>
                                    <div className="text-sm text-muted-foreground">{student.email}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {student.college ? <Badge className="border border-bordeaux/20 bg-bordeaux/5 text-bordeaux">{student.college}</Badge> : null}
                                      {formatAcademicTrack(student) ? <Badge className="border border-border bg-muted/40 text-foreground">{formatAcademicTrack(student)}</Badge> : null}
                                      <Badge className={student.completed ? "border border-emerald-200 bg-emerald-100 text-emerald-800" : "border border-amber-200 bg-amber-100 text-amber-800"}>{student.completed ? "Completed" : "In progress"}</Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="min-w-[220px] md:max-w-[260px]">
                                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{student.progress}%</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div className="h-full bg-gradient-gold transition-all" style={{ width: `${student.progress}%` }} />
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">Enrolled {new Date(student.enrolled_at).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/80 bg-muted/30 px-6 py-12 text-center">
                          <p className="font-display text-2xl text-foreground">No enrolled student yet</p>
                          <p className="mt-2 text-sm text-muted-foreground">This course does not have enrolled students for now.</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-foreground">Session studio</CardTitle>
                <CardDescription>Create and manage your free Google Meet lives and video sessions from the same workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                  <Card className="border-border/70 bg-background/70">
                    <CardHeader>
                      <CardTitle className="text-lg text-bordeaux">{editingEventId ? "Edit session" : "New session"}</CardTitle>
                      <CardDescription>Publish a live Google Meet or a free video under your teacher identity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormInput label="Title" value={eventForm.title} error={eventErrors.title} onChange={(value) => setEventForm((prev) => ({ ...prev, title: value }))} />
                      <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Textarea value={eventForm.description} onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))} className={eventErrors.description ? "border-destructive" : undefined} rows={4} />
                        {eventErrors.description ? <p className="text-xs text-destructive">{eventErrors.description}</p> : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Class</Label>
                          <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${eventErrors.grade_code ? "border-destructive" : "border-input"}`} value={eventForm.grade_code} onChange={(event) => setEventForm((prev) => ({ ...prev, grade_code: event.target.value }))}>
                            <option value="">Select class</option>
                            {GRADE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          {eventErrors.grade_code ? <p className="text-xs text-destructive">{eventErrors.grade_code}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Course</Label>
                          <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${eventErrors.course_id ? "border-destructive" : "border-input"}`} value={eventForm.course_id} onChange={(event) => setEventForm((prev) => ({ ...prev, course_id: event.target.value }))}>
                            <option value="">Select course</option>
                            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                          </select>
                          {eventErrors.course_id ? <p className="text-xs text-destructive">{eventErrors.course_id}</p> : null}
                        </div>
                      </div>
                      {needsSection(eventForm.grade_code) ? (
                        <div className="space-y-1.5">
                          <Label>Section</Label>
                          <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${eventErrors.section_code ? "border-destructive" : "border-input"}`} value={eventForm.section_code} onChange={(event) => setEventForm((prev) => ({ ...prev, section_code: event.target.value }))}>
                            <option value="">Select section</option>
                            {SECTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          {eventErrors.section_code ? <p className="text-xs text-destructive">{eventErrors.section_code}</p> : null}
                        </div>
                      ) : null}
                      <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        Session category preview: <span className="font-medium text-foreground">{buildEventCategory(eventForm, courses) || "Choose class and course"}</span>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Session type</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={eventForm.delivery_type} onChange={(event) => setEventForm((prev) => ({ ...prev, delivery_type: event.target.value as Event["delivery_type"] }))}>
                          <option value="google_meet">Google Meet live</option>
                          <option value="video">Free video</option>
                        </select>
                      </div>
                      <FormInput label={eventForm.delivery_type === "video" ? "Video URL" : "Meeting URL"} value={eventForm.access_url} error={eventErrors.access_url} onChange={(value) => setEventForm((prev) => ({ ...prev, access_url: value }))} placeholder="https://..." />
                      <FormInput label="Date and time" type="datetime-local" value={eventForm.event_date} error={eventErrors.event_date} onChange={(value) => setEventForm((prev) => ({ ...prev, event_date: value }))} />
                      {eventForm.delivery_type === "google_meet" ? <FormInput label="Seats" type="number" value={eventForm.seats_total} error={eventErrors.seats_total} onChange={(value) => setEventForm((prev) => ({ ...prev, seats_total: value }))} /> : null}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={createEventMutation.isPending || updateEventMutation.isPending} onClick={() => handleEventSubmit(eventForm, editingEventId, setEventErrors, createEventMutation.mutate, updateEventMutation.mutate)}>
                          {createEventMutation.isPending || updateEventMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          {editingEventId ? "Save session" : "Create session"}
                        </Button>
                        {editingEventId ? <Button variant="outline" className="border-bordeaux text-bordeaux" onClick={() => resetEventForm(setEventForm, setEditingEventId, setEventErrors)}>Cancel</Button> : null}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    {isEventsLoading ? (
                      <Card className="border-border/70 bg-background/70">
                        <CardContent className="flex min-h-[220px] items-center justify-center text-muted-foreground">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading sessions...
                        </CardContent>
                      </Card>
                    ) : events.length === 0 ? (
                      <Card className="border-border/70 bg-background/70">
                        <CardContent className="grid min-h-[220px] place-items-center text-center">
                          <div>
                            <CalendarDays className="mx-auto h-10 w-10 text-bordeaux/70" />
                            <h3 className="mt-4 font-display text-2xl font-semibold text-foreground">No session yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">Publish your first live or video session from the form on the left.</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {events.map((event) => (
                          <Card key={event.id} className="border-border/70 bg-background/70">
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-display text-xl font-semibold text-foreground">{event.title}</div>
                                  <div className="mt-1 text-sm text-muted-foreground">{event.category ?? "No category"} · {formatEventDate(event.event_date)}</div>
                                </div>
                                <Badge className={event.is_cancelled ? "border border-amber-200 bg-amber-100 text-amber-800" : "border border-emerald-200 bg-emerald-100 text-emerald-800"}>{event.is_cancelled ? "Cancelled" : "Active"}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <span>{event.delivery_type === "video" ? "Free video" : `Google Meet · ${event.seats_taken}/${event.seats_total} seats`}</span>
                                {event.access_url ? <a href={event.access_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-bordeaux hover:underline"><PlayCircle className="h-4 w-4" /> Open link</a> : null}
                              </div>
                              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{event.description ?? "No session description yet."}</p>
                              <div className="mt-5 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => startEventEdit(event, courses, setEventForm, setEditingEventId, setEventErrors)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateEventMutation.mutate({ id: event.id, data: { is_cancelled: event.is_cancelled ? 0 : 1 } })}>
                                  {event.is_cancelled ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                                  {event.is_cancelled ? "Restore" : "Cancel"}
                                </Button>
                                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" onClick={() => deleteEventMutation.mutate(event.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

function handleSubmit(
  form: CourseForm,
  editingId: number | null,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof CourseForm & string>>>,
  createCourse: () => void,
  updateCourse: (payload: { id: number; data: Record<string, unknown> }) => void,
) {
  const nextErrors = validateCourseForm(form)
  setErrors(nextErrors)
  if (hasErrors(nextErrors)) {
    toast.error("Corrigez le formulaire cours avant enregistrement.")
    return
  }

  if (editingId) {
    updateCourse({ id: editingId, data: coursePayload(form) })
    return
  }

  createCourse()
}

function validateCourseForm(form: CourseForm) {
  const errors: FormErrors<keyof CourseForm & string> = {}

  if (isBlank(form.title) || !hasMinLength(form.title, 3)) {
    errors.title = "Le titre doit contenir au moins 3 caracteres."
  }
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) {
    errors.description = "La description doit contenir au moins 10 caracteres."
  }
  if (!isBlank(form.category) && !hasMinLength(form.category, 2)) {
    errors.category = "La categorie est invalide."
  }
  if (!isNonNegativeNumber(form.price)) {
    errors.price = "Le prix doit etre superieur ou egal a 0."
  }
  if (!isNonNegativeNumber(form.duration_hours)) {
    errors.duration_hours = "La duree doit etre superieure ou egale a 0."
  }
  if (!isNonNegativeInteger(form.lessons_count)) {
    errors.lessons_count = "Le nombre de lecons doit etre superieur ou egal a 0."
  }
  if (!isBlank(form.cover_image) && !isValidUrl(form.cover_image)) {
    errors.cover_image = "L'URL de l'image de couverture est invalide."
  }

  return errors
}

function handleChapterSubmit(
  form: ChapterForm,
  editingId: number | null,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ChapterForm & string>>>,
  createChapter: () => void,
  updateChapter: (payload: { id: number; data: Record<string, unknown> }) => void,
) {
  const nextErrors = validateChapterForm(form)
  setErrors(nextErrors)
  if (hasErrors(nextErrors)) {
    toast.error("Corrigez le formulaire chapitre avant enregistrement.")
    return
  }

  if (editingId) {
    updateChapter({ id: editingId, data: chapterPayload(form) })
    return
  }

  createChapter()
}

function validateChapterForm(form: ChapterForm) {
  const errors: FormErrors<keyof ChapterForm & string> = {}

  if (isBlank(form.title) || !hasMinLength(form.title, 3)) {
    errors.title = "Le titre du chapitre doit contenir au moins 3 caracteres."
  }
  if (isBlank(form.slug) || !isValidSlug(form.slug)) {
    errors.slug = "Le slug doit etre en minuscules avec des tirets."
  }
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) {
    errors.description = "La description doit contenir au moins 10 caracteres."
  }
  if (!isNonNegativeInteger(form.display_order)) {
    errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0."
  }

  return errors
}

function chapterPayload(form: ChapterForm) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || undefined,
    display_order: Number(form.display_order || 0),
    is_published: form.is_published ? 1 : 0,
  }
}

function startChapterEdit(
  chapter: TeacherCourseChapter,
  setForm: React.Dispatch<React.SetStateAction<ChapterForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ChapterForm & string>>>,
) {
  setEditingId(chapter.id)
  setErrors({})
  setForm({
    title: chapter.title,
    slug: chapter.slug,
    description: chapter.description ?? "",
    display_order: String(chapter.display_order ?? 0),
    is_published: Boolean(chapter.is_published),
  })
}

function resetChapterForm(
  setForm: React.Dispatch<React.SetStateAction<ChapterForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ChapterForm & string>>>,
) {
  setForm(INITIAL_CHAPTER_FORM)
  setEditingId(null)
  setErrors({})
}

function handleResourceSubmit(
  form: ResourceForm,
  editingId: number | null,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ResourceForm & string>>>,
  createResource: () => void,
  updateResource: (payload: { id: number; data: Record<string, unknown> }) => void,
) {
  const nextErrors = validateResourceForm(form)
  setErrors(nextErrors)
  if (hasErrors(nextErrors)) {
    toast.error("Corrigez le formulaire ressource avant enregistrement.")
    return
  }

  if (editingId) {
    updateResource({ id: editingId, data: resourcePayload(form) })
    return
  }

  createResource()
}

function validateResourceForm(form: ResourceForm) {
  const errors: FormErrors<keyof ResourceForm & string> & { source?: string } = {}

  if (!form.chapter_id) {
    errors.chapter_id = "Selectionnez un chapitre."
  }
  if (isBlank(form.title) || !hasMinLength(form.title, 3)) {
    errors.title = "Le titre de la ressource doit contenir au moins 3 caracteres."
  }
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) {
    errors.description = "La description doit contenir au moins 10 caracteres."
  }
  if (!isBlank(form.file_url) && !isValidUrl(form.file_url)) {
    errors.file_url = "L'URL du fichier est invalide."
  }
  if (!isBlank(form.external_url) && !isValidUrl(form.external_url)) {
    errors.external_url = "L'URL externe est invalide."
  }
  if (isBlank(form.file_url) && isBlank(form.external_url)) {
    errors.source = "Ajoutez une URL de fichier ou une URL externe."
  }
  if (!isBlank(form.duration_minutes) && !isNonNegativeInteger(form.duration_minutes)) {
    errors.duration_minutes = "La duree doit etre superieure ou egale a 0."
  }
  if (!isNonNegativeInteger(form.display_order)) {
    errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0."
  }

  return errors
}

function resourcePayload(form: ResourceForm) {
  return {
    chapter_id: Number(form.chapter_id),
    resource_type: form.resource_type,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    file_url: form.file_url.trim() || undefined,
    external_url: form.external_url.trim() || undefined,
    duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
    display_order: Number(form.display_order || 0),
    is_published: form.is_published ? 1 : 0,
  }
}

function startResourceEdit(
  resource: TeacherCourseResource,
  setForm: React.Dispatch<React.SetStateAction<ResourceForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ResourceForm & string>>>,
) {
  setEditingId(resource.id)
  setErrors({})
  setForm({
    chapter_id: String(resource.chapter_id),
    resource_type: resource.resource_type,
    title: resource.title,
    description: resource.description ?? "",
    file_url: resource.file_url ?? "",
    external_url: resource.external_url ?? "",
    duration_minutes: resource.duration_minutes === null ? "" : String(resource.duration_minutes),
    display_order: String(resource.display_order ?? 0),
    is_published: Boolean(resource.is_published),
  })
}

function resetResourceForm(
  setForm: React.Dispatch<React.SetStateAction<ResourceForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof ResourceForm & string>>>,
  defaultChapterId?: number,
) {
  setForm({ ...INITIAL_RESOURCE_FORM, chapter_id: defaultChapterId ? String(defaultChapterId) : "" })
  setEditingId(null)
  setErrors({})
}

function handleEventSubmit(
  form: EventForm,
  editingId: number | null,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof EventForm & string>>>,
  createEvent: () => void,
  updateEvent: (payload: { id: number; data: Record<string, unknown> }) => void,
) {
  const nextErrors = validateEventForm(form)
  setErrors(nextErrors)
  if (hasErrors(nextErrors)) {
    toast.error("Corrigez le formulaire session avant enregistrement.")
    return
  }

  if (editingId) {
    updateEvent({ id: editingId, data: eventPayload(form) })
    return
  }

  createEvent()
}

function validateEventForm(form: EventForm) {
  const errors: FormErrors<keyof EventForm & string> = {}

  if (!hasMinLength(form.title, 4)) errors.title = "Le titre doit contenir au moins 4 caracteres."
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres."
  if (isBlank(form.grade_code)) errors.grade_code = "Selectionnez une classe."
  if (needsSection(form.grade_code) && isBlank(form.section_code)) errors.section_code = "Selectionnez une section."
  if (isBlank(form.course_id)) errors.course_id = "Selectionnez un cours."
  if (!isValidUrl(form.access_url)) errors.access_url = form.delivery_type === "video" ? "Saisissez une URL video valide." : "Saisissez un lien de session valide."
  if (form.delivery_type === "google_meet" ? !isFutureDateTime(form.event_date) : !isValidDateInput(form.event_date)) {
    errors.event_date = form.delivery_type === "google_meet" ? "Choisissez une date et une heure futures." : "Choisissez une date et une heure valides."
  }
  if (form.delivery_type === "google_meet" && !isPositiveInteger(form.seats_total, 1)) {
    errors.seats_total = "Le nombre de places doit etre au moins egal a 1."
  }

  return errors
}

function eventPayload(form: EventForm, courses: Course[]) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    category: buildEventCategory(form, courses) || form.category.trim() || undefined,
    delivery_type: form.delivery_type,
    access_url: form.access_url.trim(),
    event_date: new Date(form.event_date).toISOString(),
    seats_total: form.delivery_type === "video" ? 0 : Number(form.seats_total || 0),
  }
}

function startEventEdit(
  event: Event,
  courses: Course[],
  setForm: React.Dispatch<React.SetStateAction<EventForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof EventForm & string>>>,
) {
  const parsedCategory = parseEventCategory(event.category, courses)
  setEditingId(event.id)
  setErrors({})
  setForm({
    title: event.title,
    description: event.description ?? "",
    category: event.category ?? "",
    grade_code: parsedCategory.grade_code,
    section_code: parsedCategory.section_code,
    course_id: parsedCategory.course_id,
    delivery_type: event.delivery_type,
    access_url: event.access_url ?? "",
    event_date: toDateTimeLocal(event.event_date),
    seats_total: String(event.seats_total ?? 0),
  })
}

function resetEventForm(
  setForm: React.Dispatch<React.SetStateAction<EventForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof EventForm & string>>>,
) {
  setForm(INITIAL_EVENT_FORM)
  setEditingId(null)
  setErrors({})
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function buildEventCategory(form: EventForm, courses: Course[]) {
  const selectedCourse = courses.find((course) => String(course.id) === form.course_id)
  const gradeLabel = GRADE_OPTIONS.find((option) => option.value === form.grade_code)?.label ?? form.grade_code.trim()
  const sectionLabel = SECTION_OPTIONS.find((option) => option.value === form.section_code)?.label ?? form.section_code.trim()
  const academicLabel = gradeLabel ? needsSection(form.grade_code) && sectionLabel ? `${gradeLabel} - ${sectionLabel}` : gradeLabel : ""

  if (academicLabel && selectedCourse?.title) {
    return `${academicLabel} · ${selectedCourse.title}`
  }
  if (selectedCourse?.title) {
    return selectedCourse.title
  }
  if (academicLabel) {
    return academicLabel
  }

  return form.category.trim()
}

function parseEventCategory(category: string | null | undefined, courses: Course[]) {
  const rawCategory = category?.trim() ?? ""
  if (!rawCategory) {
    return { category: "", grade_code: "", section_code: "", course_id: "" }
  }

  const sortedCourses = [...courses].sort((left, right) => right.title.length - left.title.length)
  const matchedCourse = sortedCourses.find((course) => rawCategory === course.title || rawCategory.endsWith(` · ${course.title}`))
  const academicSegment = matchedCourse && rawCategory !== matchedCourse.title
    ? rawCategory.slice(0, rawCategory.length - (` · ${matchedCourse.title}`).length)
    : ""

  const [rawGrade = "", rawSection = ""] = academicSegment.split(" - ")
  const gradeCode = GRADE_OPTIONS.find((option) => option.label === rawGrade || option.value === rawGrade)?.value ?? ""
  const sectionCode = SECTION_OPTIONS.find((option) => option.label.toLowerCase() === rawSection.toLowerCase() || option.value === rawSection.toLowerCase())?.value ?? ""

  return {
    category: rawCategory,
    grade_code: gradeCode,
    section_code: sectionCode,
    course_id: matchedCourse ? String(matchedCourse.id) : "",
  }
}

function coursePayload(form: CourseForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    category: form.category.trim() || undefined,
    price: Number(form.price || 0),
    duration_hours: Number(form.duration_hours || 0),
    lessons_count: Number(form.lessons_count || 0),
    cover_image: form.cover_image.trim() || undefined,
  }
}

function startEdit(
  course: Course,
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof CourseForm & string>>>,
) {
  setEditingId(course.id)
  setErrors({})
  setForm({
    title: course.title,
    description: course.description ?? "",
    category: course.category ?? "",
    price: String(course.price ?? 0),
    duration_hours: String(course.duration_hours ?? 0),
    lessons_count: String(course.lessons_count ?? 0),
    cover_image: course.cover_image ?? "",
  })
}

function resetForm(
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>,
  setEditingId: React.Dispatch<React.SetStateAction<number | null>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors<keyof CourseForm & string>>>,
) {
  setForm(INITIAL_FORM)
  setEditingId(null)
  setErrors({})
}

function FormInput({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={error ? "border-destructive" : undefined} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-input text-bordeaux focus:ring-bordeaux" />
      <span>{label}</span>
    </label>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <section className="container mx-auto grid min-h-[60vh] place-items-center px-4 py-16">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </div>
    </section>
  )
}

function LoadingCard() {
  return (
    <Card className="border-border/70 bg-white/85">
      <CardContent className="flex min-h-[220px] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading courses...
      </CardContent>
    </Card>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  return apiMessage || fallback
}