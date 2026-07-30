import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Loader2, Pencil, Plus, Trash2, Upload, UserCheck, X } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, SelectCheckbox, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api, { API_ORIGIN } from "@/lib/api"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { FormErrors, hasErrors, hasMinLength, isBlank, isNonNegativeInteger, isNonNegativeNumber, isValidHexColor, isValidSlug, isValidUrl } from "@/lib/validation"
import { AdminPageIntro } from "@/routes/admin"

type AdminTrack = {
  id: number
  school_cycle: "college" | "lycee"
  grade_code: string
  section_code: string | null
  slug: string
  title: string
  description: string | null
  is_active: number
  display_order: number
}

type AdminSubject = {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  is_active: number
}

type AdminTrackSubject = {
  id: number
  academic_track_id: number
  subject_id: number
  description: string | null
  cover_image: string | null
  display_order: number
  is_published: number
  track_title: string
  track_slug: string
  subject_name: string
  subject_slug: string
  chapter_count: number
  resource_count: number
}

type AdminChapter = {
  id: number
  track_subject_id: number
  title: string
  slug: string
  description: string | null
  display_order: number
  is_published: number
  academic_track_id: number
  subject_id: number
  track_title: string
  subject_name: string
  resource_count: number
}

type AdminResource = {
  id: number
  chapter_id: number
  resource_type: "pdf_lesson" | "video_lesson" | "exercise_sheet" | "correction_sheet" | "extra_resource"
  title: string
  description: string | null
  file_url: string | null
  external_url: string | null
  duration_minutes: number | null
  display_order: number
  is_published: number
  chapter_title: string
  track_subject_id: number
  subject_name: string
  track_title: string
}

type AdminCurriculumResponse = {
  tracks: AdminTrack[]
  subjects: AdminSubject[]
  track_subjects: AdminTrackSubject[]
  chapters: AdminChapter[]
  resources: AdminResource[]
}

type TeacherAssignment = {
  id: number
  teacher_id: number
  first_name: string
  last_name: string
  email: string
  track_subject_id: number
  subject_name: string
  subject_slug: string
  track_title: string
  grade_code: string
  section_code: string | null
  assigned_at: string
}

type UnassignedTeacher = { id: number; first_name: string; last_name: string; email: string }
type TrackSubjectItem  = { id: number; subject_name: string; track_title: string; grade_code: string; section_code: string | null }

type AssignmentForm = { teacher_id: string; track_subject_id: string }

type SubjectForm = {
  name: string
  slug: string
  description: string
  icon: string
  color: string
  is_active: boolean
}

type TrackSubjectForm = {
  academic_track_id: string
  subject_id: string
  description: string
  cover_image: string
  display_order: string
  is_published: boolean
}

type ChapterForm = {
  track_subject_id: string
  title: string
  slug: string
  description: string
  display_order: string
  is_published: boolean
}

type ResourceForm = {
  chapter_id: string
  resource_type: AdminResource["resource_type"]
  title: string
  description: string
  file_url: string
  external_url: string
  duration_minutes: string
  display_order: string
  is_published: boolean
}

const INITIAL_SUBJECT_FORM: SubjectForm = { name: "", slug: "", description: "", icon: "", color: "", is_active: true }
const INITIAL_TRACK_SUBJECT_FORM: TrackSubjectForm = { academic_track_id: "", subject_id: "", description: "", cover_image: "", display_order: "0", is_published: true }
const INITIAL_CHAPTER_FORM: ChapterForm = { track_subject_id: "", title: "", slug: "", description: "", display_order: "0", is_published: true }
const INITIAL_RESOURCE_FORM: ResourceForm = { chapter_id: "", resource_type: "pdf_lesson", title: "", description: "", file_url: "", external_url: "", duration_minutes: "", display_order: "0", is_published: true }
const RESOURCE_TYPES: AdminResource["resource_type"][] = ["pdf_lesson", "video_lesson", "exercise_sheet", "correction_sheet", "extra_resource"]

function payloadError(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}

function DataTable<T>({ headers, rows, items, getId, selectedIds, onToggle, onToggleAll }: {
  headers: string[]
  rows: Array<Array<React.ReactNode>>
  items?: T[]
  getId?: (item: T) => number
  selectedIds?: Set<number>
  onToggle?: (id: number) => void
  onToggleAll?: () => void
}) {
  const selectable = Boolean(items && getId && selectedIds && onToggle && onToggleAll)
  const allChecked = selectable && items!.length > 0 && items!.every((item) => selectedIds!.has(getId!(item)))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {selectable ? (
              <th className="w-10 px-3 py-3">
                <SelectCheckbox checked={allChecked} onChange={() => onToggleAll!()} ariaLabel="Select all" />
              </th>
            ) : null}
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length + (selectable ? 1 : 0)} className="px-3 py-8 text-center text-muted-foreground">No records yet.</td>
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => {
            const id = selectable ? getId!(items![rowIndex]) : undefined
            return (
              <tr key={rowIndex} className={`border-b border-border/70 align-top ${selectable && id !== undefined && selectedIds!.has(id) ? "bg-destructive/5" : ""}`}>
                {selectable ? (
                  <td className="px-3 py-3">
                    <SelectCheckbox checked={selectedIds!.has(id!)} onChange={() => onToggle!(id!)} ariaLabel={`Select row ${id}`} />
                  </td>
                ) : null}
                {row.map((cell, index) => <td key={index} className="px-3 py-3">{cell}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TextField({ label, value, onChange, type = "text", placeholder, error }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} className={error ? "border-destructive" : undefined} onChange={(event) => onChange(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function SelectField({ label, value, onChange, children, error }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${error ? "border-destructive" : "border-input"}`} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function TextAreaField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={4} value={value} className={error ? "border-destructive" : undefined} onChange={(event) => onChange(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function ActionButtons({ isPending, onSubmit, submitLabel, onCancel }: { isPending: boolean; onSubmit: () => void; submitLabel: string; onCancel?: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}
      </Button>
      {onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}
    </div>
  )
}

function iconButton(label: string, icon: React.ReactNode, onClick: () => void, destructive = false) {
  return (
    <Button size="sm" variant="outline" className={destructive ? "border-red-300 text-red-700" : "border-bordeaux text-bordeaux"} onClick={onClick}>
      {icon}
      {label}
    </Button>
  )
}

export function CurriculumAdminModule() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<AdminCurriculumResponse>({
    queryKey: ["admin-curriculum"],
    queryFn: async () => (await api.get<AdminCurriculumResponse>("/courses/admin/curriculum")).data,
  })

  const tracks = data?.tracks ?? []
  const subjects = data?.subjects ?? []
  const trackSubjects = data?.track_subjects ?? []
  const chapters = data?.chapters ?? []
  const resources = data?.resources ?? []

  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [trackEditForm, setTrackEditForm] = useState({ title: "", description: "", display_order: "0", is_active: true })
  const [subjectForm, setSubjectForm] = useState(INITIAL_SUBJECT_FORM)
  const [trackSubjectForm, setTrackSubjectForm] = useState(INITIAL_TRACK_SUBJECT_FORM)
  const [chapterForm, setChapterForm] = useState(INITIAL_CHAPTER_FORM)
  const [resourceForm, setResourceForm] = useState(INITIAL_RESOURCE_FORM)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null)
  const [editingTrackSubjectId, setEditingTrackSubjectId] = useState<number | null>(null)
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null)
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null)
  const [subjectErrors, setSubjectErrors] = useState<FormErrors<keyof SubjectForm & string>>({})
  const [trackSubjectErrors, setTrackSubjectErrors] = useState<FormErrors<keyof TrackSubjectForm & string>>({})
  const [chapterErrors, setChapterErrors] = useState<FormErrors<keyof ChapterForm & string>>({})
  const [resourceErrors, setResourceErrors] = useState<FormErrors<keyof ResourceForm & string>>({})
  const [trackSearch, setTrackSearch] = useState("")
  const [trackCycleFilter, setTrackCycleFilter] = useState("all")
  const [trackStatusFilter, setTrackStatusFilter] = useState("all")
  const [trackSortBy, setTrackSortBy] = useState("title-asc")
  const [subjectSearch, setSubjectSearch] = useState("")
  const [subjectStatusFilter, setSubjectStatusFilter] = useState("all")
  const [subjectSortBy, setSubjectSortBy] = useState("name-asc")
  const [assignmentSearch, setAssignmentSearch] = useState("")
  const [assignmentTrackFilter, setAssignmentTrackFilter] = useState("all")
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("all")
  const [assignmentSortBy, setAssignmentSortBy] = useState("track-asc")
  const [chapterSearch, setChapterSearch] = useState("")
  const [chapterTrackFilter, setChapterTrackFilter] = useState("all")
  const [chapterStatusFilter, setChapterStatusFilter] = useState("all")
  const [chapterSortBy, setChapterSortBy] = useState("title-asc")
  const [resourceSearch, setResourceSearch] = useState("")
  const [resourceTrackFilter, setResourceTrackFilter] = useState("all")
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all")
  const [resourceStatusFilter, setResourceStatusFilter] = useState("all")
  const [resourceSortBy, setResourceSortBy] = useState("title-asc")

  const filteredTracks = sortItems(
    tracks.filter((track) => {
      const matchesText = matchesSearch(trackSearch, track.title, track.slug, track.grade_code, track.section_code ?? "", track.description ?? "")
      const matchesCycle = trackCycleFilter === "all" || track.school_cycle === trackCycleFilter
      const matchesStatus = trackStatusFilter === "all" || (trackStatusFilter === "active" ? Boolean(track.is_active) : !track.is_active)

      return matchesText && matchesCycle && matchesStatus
    }),
    (track) => {
      switch (trackSortBy) {
        case "order-asc":
        case "order-desc":
          return track.display_order
        case "title-desc":
        case "title-asc":
        default:
          return track.title
      }
    },
    trackSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const filteredSubjects = sortItems(
    subjects.filter((subject) => {
      const matchesText = matchesSearch(subjectSearch, subject.name, subject.slug, subject.description ?? "", subject.icon ?? "")
      const matchesStatus = subjectStatusFilter === "all" || (subjectStatusFilter === "active" ? Boolean(subject.is_active) : !subject.is_active)

      return matchesText && matchesStatus
    }),
    (subject) => (subjectSortBy.startsWith("slug") ? subject.slug : subject.name),
    subjectSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const filteredTrackSubjects = sortItems(
    trackSubjects.filter((item) => {
      const matchesText = matchesSearch(assignmentSearch, item.track_title, item.subject_name, item.description ?? "", item.track_slug, item.subject_slug)
      const matchesTrack = assignmentTrackFilter === "all" || String(item.academic_track_id) === assignmentTrackFilter
      const matchesStatus = assignmentStatusFilter === "all" || (assignmentStatusFilter === "published" ? Boolean(item.is_published) : !item.is_published)

      return matchesText && matchesTrack && matchesStatus
    }),
    (item) => {
      switch (assignmentSortBy) {
        case "subject-asc":
        case "subject-desc":
          return item.subject_name
        case "chapters-desc":
        case "chapters-asc":
          return item.chapter_count
        case "resources-desc":
        case "resources-asc":
          return item.resource_count
        case "track-desc":
        case "track-asc":
        default:
          return `${item.track_title} ${item.subject_name}`
      }
    },
    assignmentSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const filteredChapters = sortItems(
    chapters.filter((chapter) => {
      const matchesText = matchesSearch(chapterSearch, chapter.track_title, chapter.subject_name, chapter.title, chapter.slug, chapter.description ?? "")
      const matchesTrack = chapterTrackFilter === "all" || String(chapter.academic_track_id) === chapterTrackFilter
      const matchesStatus = chapterStatusFilter === "all" || (chapterStatusFilter === "published" ? Boolean(chapter.is_published) : !chapter.is_published)

      return matchesText && matchesTrack && matchesStatus
    }),
    (chapter) => {
      switch (chapterSortBy) {
        case "resources-desc":
        case "resources-asc":
          return chapter.resource_count
        case "track-desc":
        case "track-asc":
          return `${chapter.track_title} ${chapter.subject_name} ${chapter.title}`
        case "title-desc":
        case "title-asc":
        default:
          return chapter.title
      }
    },
    chapterSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const filteredResources = sortItems(
    resources.filter((resource) => {
      const matchesText = matchesSearch(resourceSearch, resource.track_title, resource.subject_name, resource.chapter_title, resource.title, resource.description ?? "")
      const matchesTrack = resourceTrackFilter === "all" || resource.track_title === resourceTrackFilter
      const matchesType = resourceTypeFilter === "all" || resource.resource_type === resourceTypeFilter
      const matchesStatus = resourceStatusFilter === "all" || (resourceStatusFilter === "published" ? Boolean(resource.is_published) : !resource.is_published)

      return matchesText && matchesTrack && matchesType && matchesStatus
    }),
    (resource) => {
      switch (resourceSortBy) {
        case "duration-desc":
        case "duration-asc":
          return resource.duration_minutes ?? -1
        case "track-desc":
        case "track-asc":
          return `${resource.track_title} ${resource.subject_name} ${resource.chapter_title} ${resource.title}`
        case "type-asc":
        case "type-desc":
          return resource.resource_type
        case "title-desc":
        case "title-asc":
        default:
          return resource.title
      }
    },
    resourceSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const invalidateCurriculum = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const updateTrackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put(`/courses/admin/tracks/${id}`, payload),
    onSuccess: () => { toast.success("Filière mise à jour."); setEditingTrackId(null); invalidateCurriculum() },
    onError: (e) => toast.error(payloadError(e, "Mise à jour impossible.")),
  })

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/tracks/${id}`),
    onSuccess: () => { toast.success("Filière supprimée."); invalidateCurriculum() },
    onError: (e) => toast.error(payloadError(e, "Suppression impossible.")),
  })

  const trackBulkSelection = useBulkSelection()
  const bulkDeleteTrackMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/tracks/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} filière(s) supprimée(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      trackBulkSelection.clear()
      invalidateCurriculum()
    },
  })

  const toggleTrackMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/courses/admin/tracks/${id}/toggle`),
    onSuccess: () => { invalidateCurriculum() },
    onError: (e) => toast.error(payloadError(e, "Changement de statut impossible.")),
  })

  // ── Teacher assignments ────────────────────────────────────────────────────
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({ teacher_id: "", track_subject_id: "" })

  const { data: assignments = [] } = useQuery<TeacherAssignment[]>({
    queryKey: ["admin-teacher-assignments"],
    queryFn: async () => (await api.get<TeacherAssignment[]>("/courses/admin/teacher-assignments")).data,
  })
  const { data: unassignedTeachers = [] } = useQuery<UnassignedTeacher[]>({
    queryKey: ["admin-unassigned-teachers"],
    queryFn: async () => (await api.get<UnassignedTeacher[]>("/courses/admin/unassigned-teachers")).data,
  })
  const { data: trackSubjectsList = [] } = useQuery<TrackSubjectItem[]>({
    queryKey: ["admin-track-subjects-list"],
    queryFn: async () => (await api.get<TrackSubjectItem[]>("/courses/admin/track-subjects-list")).data,
  })

  const invalidateAssignments = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-teacher-assignments"] })
    queryClient.invalidateQueries({ queryKey: ["admin-unassigned-teachers"] })
  }

  const createAssignmentMutation = useMutation({
    mutationFn: (payload: { teacher_id: number; track_subject_id: number }) =>
      api.post("/courses/admin/teacher-assignments", payload),
    onSuccess: () => {
      toast.success("Enseignant assigné avec succès.")
      setAssignmentForm({ teacher_id: "", track_subject_id: "" })
      invalidateAssignments()
    },
    onError: (error) => toast.error(payloadError(error, "Assignation impossible.")),
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/teacher-assignments/${id}`),
    onSuccess: () => {
      toast.success("Assignation supprimée.")
      invalidateAssignments()
    },
    onError: (error) => toast.error(payloadError(error, "Suppression impossible.")),
  })

  const assignmentBulkSelection = useBulkSelection()
  const bulkDeleteAssignmentMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/teacher-assignments/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} assignation(s) supprimée(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      assignmentBulkSelection.clear()
      invalidateAssignments()
    },
  })

  const saveAssignment = () => {
    if (!assignmentForm.teacher_id || !assignmentForm.track_subject_id) {
      toast.error("Sélectionnez un enseignant et une matière.")
      return
    }
    createAssignmentMutation.mutate({
      teacher_id: Number(assignmentForm.teacher_id),
      track_subject_id: Number(assignmentForm.track_subject_id),
    })
  }

  const subjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) => id ? api.put(`/courses/admin/subjects/${id}`, payload) : api.post("/courses/admin/subjects", payload),
    onSuccess: () => {
      toast.success(editingSubjectId ? "Matiere mise a jour." : "Matiere creee.")
      setSubjectForm(INITIAL_SUBJECT_FORM)
      setEditingSubjectId(null)
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de la matiere impossible.")),
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/subjects/${id}`),
    onSuccess: () => { toast.success("Matiere supprimee."); invalidateCurriculum() },
    onError: (error) => toast.error(payloadError(error, "Suppression de la matiere impossible.")),
  })

  const subjectBulkSelection = useBulkSelection()
  const bulkDeleteSubjectMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/subjects/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} matiere(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      subjectBulkSelection.clear()
      invalidateCurriculum()
    },
  })

  const toggleSubjectMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/courses/admin/subjects/${id}/toggle`),
    onSuccess: () => invalidateCurriculum(),
    onError: (error) => toast.error(payloadError(error, "Changement de statut impossible.")),
  })

  const trackSubjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) => id ? api.put(`/courses/admin/track-subjects/${id}`, payload) : api.post("/courses/admin/track-subjects", payload),
    onSuccess: () => {
      toast.success(editingTrackSubjectId ? "Affectation mise a jour." : "Affectation creee.")
      setTrackSubjectForm(INITIAL_TRACK_SUBJECT_FORM)
      setEditingTrackSubjectId(null)
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de l'affectation impossible.")),
  })

  const deleteTrackSubjectMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/track-subjects/${id}`),
    onSuccess: () => {
      toast.success("Affectation supprimee.")
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Suppression de l'affectation impossible.")),
  })

  const trackSubjectBulkSelection = useBulkSelection()
  const bulkDeleteTrackSubjectMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/track-subjects/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} affectation(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      trackSubjectBulkSelection.clear()
      invalidateCurriculum()
    },
  })

  const chapterMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) => id ? api.put(`/courses/admin/chapters/${id}`, payload) : api.post("/courses/admin/chapters", payload),
    onSuccess: () => {
      toast.success(editingChapterId ? "Chapitre mis a jour." : "Chapitre cree.")
      setChapterForm(INITIAL_CHAPTER_FORM)
      setEditingChapterId(null)
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement du chapitre impossible.")),
  })

  const deleteChapterMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/chapters/${id}`),
    onSuccess: () => {
      toast.success("Chapitre supprime.")
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Suppression du chapitre impossible.")),
  })

  const chapterBulkSelection = useBulkSelection()
  const bulkDeleteChapterMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/chapters/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} chapitre(s) supprime(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      chapterBulkSelection.clear()
      invalidateCurriculum()
    },
  })

  const resourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) => id ? api.put(`/courses/admin/resources/${id}`, payload) : api.post("/courses/admin/resources", payload),
    onSuccess: () => {
      toast.success(editingResourceId ? "Ressource mise a jour." : "Ressource creee.")
      setResourceForm(INITIAL_RESOURCE_FORM)
      setEditingResourceId(null)
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de la ressource impossible.")),
  })

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/resources/${id}`),
    onSuccess: () => {
      toast.success("Ressource supprimee.")
      invalidateCurriculum()
    },
    onError: (error) => toast.error(payloadError(error, "Suppression de la ressource impossible.")),
  })

  const resourceBulkSelection = useBulkSelection()
  const bulkDeleteResourceMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/resources/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} ressource(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont echoue.`)
      resourceBulkSelection.clear()
      invalidateCurriculum()
    },
  })

  const saveSubject = () => {
    const nextErrors = validateSubjectForm(subjectForm)
    setSubjectErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      toast.error("Corrigez le formulaire matiere avant enregistrement")
      return
    }

    subjectMutation.mutate({
      id: editingSubjectId ?? undefined,
      payload: {
        name: subjectForm.name,
        slug: subjectForm.slug,
        description: subjectForm.description || null,
        icon: subjectForm.icon || null,
        color: subjectForm.color || null,
        is_active: subjectForm.is_active ? 1 : 0,
      },
    })
  }

  const saveTrackSubject = () => {
    const nextErrors = validateTrackSubjectForm(trackSubjectForm)
    setTrackSubjectErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      toast.error("Corrigez le formulaire d'affectation avant enregistrement")
      return
    }

    trackSubjectMutation.mutate({
      id: editingTrackSubjectId ?? undefined,
      payload: {
        academic_track_id: Number(trackSubjectForm.academic_track_id),
        subject_id: Number(trackSubjectForm.subject_id),
        description: trackSubjectForm.description || null,
        cover_image: trackSubjectForm.cover_image || null,
        display_order: Number(trackSubjectForm.display_order || 0),
        is_published: trackSubjectForm.is_published ? 1 : 0,
      },
    })
  }

  const saveChapter = () => {
    const nextErrors = validateChapterForm(chapterForm)
    setChapterErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      toast.error("Corrigez le formulaire chapitre avant enregistrement")
      return
    }

    chapterMutation.mutate({
      id: editingChapterId ?? undefined,
      payload: {
        track_subject_id: Number(chapterForm.track_subject_id),
        title: chapterForm.title,
        slug: chapterForm.slug,
        description: chapterForm.description || null,
        display_order: Number(chapterForm.display_order || 0),
        is_published: chapterForm.is_published ? 1 : 0,
      },
    })
  }

  const saveResource = () => {
    const nextErrors = validateResourceForm(resourceForm)
    setResourceErrors(nextErrors)
    if (hasErrors(nextErrors)) {
      toast.error("Corrigez le formulaire ressource avant enregistrement")
      return
    }

    resourceMutation.mutate({
      id: editingResourceId ?? undefined,
      payload: {
        chapter_id: Number(resourceForm.chapter_id),
        resource_type: resourceForm.resource_type,
        title: resourceForm.title,
        description: resourceForm.description || null,
        file_url: resourceForm.file_url || null,
        external_url: resourceForm.external_url || null,
        duration_minutes: resourceForm.duration_minutes ? Number(resourceForm.duration_minutes) : null,
        display_order: Number(resourceForm.display_order || 0),
        is_published: resourceForm.is_published ? 1 : 0,
      },
    })
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Courses"
        title="Curriculum manager"
        description="Manage Tunisian matieres, assign them to class tracks, create chapters, and attach learning resources without using the old flat paid-courses model."
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading curriculum...</div>
      ) : (
        <>
          <Card className="border-border/70 bg-white/85">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-bordeaux">Academic tracks</CardTitle>
              <CardDescription>Seeded class and section combinations used to filter the student curriculum.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminListControls
                search={trackSearch}
                onSearchChange={setTrackSearch}
                searchPlaceholder="Search tracks, grades, or sections"
                filters={[
                  { label: "Cycle", value: trackCycleFilter, onChange: setTrackCycleFilter, options: [{ value: "all", label: "All cycles" }, { value: "college", label: "College" }, { value: "lycee", label: "Lycee" }] },
                  { label: "Status", value: trackStatusFilter, onChange: setTrackStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
                ]}
                sort={{ label: "Sort", value: trackSortBy, onChange: setTrackSortBy, options: [{ value: "title-asc", label: "Track A-Z" }, { value: "title-desc", label: "Track Z-A" }, { value: "order-asc", label: "Display order asc" }, { value: "order-desc", label: "Display order desc" }] }}
              />
              <BulkActionBar
                count={trackBulkSelection.count}
                isPending={bulkDeleteTrackMutation.isPending}
                onClear={trackBulkSelection.clear}
                onDelete={() => { if (confirmBulkDelete(trackBulkSelection.count)) bulkDeleteTrackMutation.mutate(Array.from(trackBulkSelection.selectedIds)) }}
              />
              <DataTable
                headers={["Track", "Cycle", "Grade", "Section", "Status", "Actions"]}
                items={filteredTracks}
                getId={(track) => track.id}
                selectedIds={trackBulkSelection.selectedIds}
                onToggle={trackBulkSelection.toggle}
                onToggleAll={() => trackBulkSelection.toggleAll(filteredTracks.map((track) => track.id))}
                rows={filteredTracks.map((track) => [
                  editingTrackId === track.id ? (
                    <div key={`edit-${track.id}`} className="space-y-2 py-1">
                      <Input
                        value={trackEditForm.title}
                        onChange={e => setTrackEditForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Titre"
                        className="h-8 text-sm"
                      />
                      <Input
                        value={trackEditForm.description}
                        onChange={e => setTrackEditForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Description"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        value={trackEditForm.display_order}
                        onChange={e => setTrackEditForm(p => ({ ...p, display_order: e.target.value }))}
                        placeholder="Ordre"
                        className="h-8 text-sm w-24"
                      />
                    </div>
                  ) : track.title,
                  track.school_cycle,
                  track.grade_code,
                  track.section_code ?? "—",
                  <span key={`status-${track.id}`} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${track.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {track.is_active ? "actif" : "inactif"}
                  </span>,
                  editingTrackId === track.id ? (
                    <div key={`actions-edit-${track.id}`} className="flex gap-2">
                      <Button size="sm" className="bg-gradient-bordeaux text-white hover:opacity-90 h-8 px-3 text-xs"
                        disabled={updateTrackMutation.isPending}
                        onClick={() => updateTrackMutation.mutate({ id: track.id, payload: { title: trackEditForm.title, description: trackEditForm.description || null, display_order: Number(trackEditForm.display_order), is_active: trackEditForm.is_active ? 1 : 0 } })}>
                        {updateTrackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sauver"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => setEditingTrackId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div key={`actions-${track.id}`} className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline"
                        className={`h-7 px-2 text-xs ${track.is_active ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                        disabled={toggleTrackMutation.isPending}
                        onClick={() => toggleTrackMutation.mutate(track.id)}>
                        {track.is_active ? "Désactiver" : "Activer"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-bordeaux text-bordeaux"
                        onClick={() => { setEditingTrackId(track.id); setTrackEditForm({ title: track.title, description: track.description ?? "", display_order: String(track.display_order), is_active: Boolean(track.is_active) }) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-300 text-red-700"
                        onClick={() => { if (confirm(`Supprimer "${track.title}" ?`)) deleteTrackMutation.mutate(track.id) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ),
                ])}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Subjects</CardTitle>
                <CardDescription>Create or update reusable matieres.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <TextField label="Name" value={subjectForm.name} error={subjectErrors.name} onChange={(value) => setSubjectForm((prev) => ({ ...prev, name: value }))} />
                <TextField label="Slug" value={subjectForm.slug} error={subjectErrors.slug} onChange={(value) => setSubjectForm((prev) => ({ ...prev, slug: value }))} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Icon" value={subjectForm.icon} error={subjectErrors.icon} onChange={(value) => setSubjectForm((prev) => ({ ...prev, icon: value }))} placeholder="book-open" />
                  <TextField label="Color" value={subjectForm.color} error={subjectErrors.color} onChange={(value) => setSubjectForm((prev) => ({ ...prev, color: value }))} placeholder="#7d1022" />
                </div>
                <TextAreaField label="Description" value={subjectForm.description} error={subjectErrors.description} onChange={(value) => setSubjectForm((prev) => ({ ...prev, description: value }))} />
                <SelectField label="Status" value={subjectForm.is_active ? "1" : "0"} error={subjectErrors.is_active} onChange={(value) => setSubjectForm((prev) => ({ ...prev, is_active: value === "1" }))}>
                  <option value="1">active</option>
                  <option value="0">inactive</option>
                </SelectField>
                <ActionButtons isPending={subjectMutation.isPending} onSubmit={saveSubject} submitLabel={editingSubjectId ? "Save subject" : "Create subject"} onCancel={editingSubjectId ? () => { setSubjectForm(INITIAL_SUBJECT_FORM); setEditingSubjectId(null); } : undefined} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Subject list</CardTitle>
                <CardDescription>Current matieres available for assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminListControls
                  search={subjectSearch}
                  onSearchChange={setSubjectSearch}
                  searchPlaceholder="Search subjects by name or slug"
                  filters={[
                    { label: "Status", value: subjectStatusFilter, onChange: setSubjectStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
                  ]}
                  sort={{ label: "Sort", value: subjectSortBy, onChange: setSubjectSortBy, options: [{ value: "name-asc", label: "Name A-Z" }, { value: "name-desc", label: "Name Z-A" }, { value: "slug-asc", label: "Slug A-Z" }, { value: "slug-desc", label: "Slug Z-A" }] }}
                />
                <BulkActionBar
                  count={subjectBulkSelection.count}
                  isPending={bulkDeleteSubjectMutation.isPending}
                  onClear={subjectBulkSelection.clear}
                  onDelete={() => { if (confirmBulkDelete(subjectBulkSelection.count)) bulkDeleteSubjectMutation.mutate(Array.from(subjectBulkSelection.selectedIds)) }}
                />
                <DataTable
                  headers={["Subject", "Slug", "Status", "Actions"]}
                  items={filteredSubjects}
                  getId={(subject) => subject.id}
                  selectedIds={subjectBulkSelection.selectedIds}
                  onToggle={subjectBulkSelection.toggle}
                  onToggleAll={() => subjectBulkSelection.toggleAll(filteredSubjects.map((subject) => subject.id))}
                  rows={filteredSubjects.map((subject) => [
                    <div key={`subject-${subject.id}`}>
                      <div className="font-medium text-foreground">{subject.name}</div>
                      <div className="text-xs text-muted-foreground">{subject.description ?? "No description"}</div>
                    </div>,
                    subject.slug,
                    <span key={`ss-${subject.id}`} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${subject.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {subject.is_active ? "actif" : "inactif"}
                    </span>,
                    <div key={`subject-actions-${subject.id}`} className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline"
                        className={`h-7 px-2 text-xs ${subject.is_active ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                        disabled={toggleSubjectMutation.isPending}
                        onClick={() => toggleSubjectMutation.mutate(subject.id)}>
                        {subject.is_active ? "Désactiver" : "Activer"}
                      </Button>
                      {iconButton("Edit", <Pencil className="mr-2 h-4 w-4" />, () => {
                        setEditingSubjectId(subject.id)
                        setSubjectForm({ name: subject.name, slug: subject.slug, description: subject.description ?? "", icon: subject.icon ?? "", color: subject.color ?? "", is_active: Boolean(subject.is_active) })
                      })}
                      {iconButton("Delete", <Trash2 className="mr-2 h-4 w-4" />, () => { if (confirm(`Supprimer "${subject.name}" ?`)) deleteSubjectMutation.mutate(subject.id) }, true)}
                    </div>,
                  ])}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Track assignments</CardTitle>
                <CardDescription>Attach a subject to one academic track.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SelectField label="Track" value={trackSubjectForm.academic_track_id} error={trackSubjectErrors.academic_track_id} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, academic_track_id: value }))}>
                  <option value="">Select track</option>
                  {tracks.map((track) => <option key={track.id} value={String(track.id)}>{track.title}</option>)}
                </SelectField>
                <SelectField label="Subject" value={trackSubjectForm.subject_id} error={trackSubjectErrors.subject_id} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, subject_id: value }))}>
                  <option value="">Select subject</option>
                  {subjects.map((subject) => <option key={subject.id} value={String(subject.id)}>{subject.name}</option>)}
                </SelectField>
                <TextField label="Display order" type="number" value={trackSubjectForm.display_order} error={trackSubjectErrors.display_order} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, display_order: value }))} />
                <ImageUpload label="Image de couverture" value={trackSubjectForm.cover_image} onChange={(url) => setTrackSubjectForm((prev) => ({ ...prev, cover_image: url }))} />
                <TextAreaField label="Description" value={trackSubjectForm.description} error={trackSubjectErrors.description} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, description: value }))} />
                <SelectField label="Status" value={trackSubjectForm.is_published ? "1" : "0"} error={trackSubjectErrors.is_published} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, is_published: value === "1" }))}>
                  <option value="1">published</option>
                  <option value="0">draft</option>
                </SelectField>
                <ActionButtons isPending={trackSubjectMutation.isPending} onSubmit={saveTrackSubject} submitLabel={editingTrackSubjectId ? "Save assignment" : "Assign subject"} onCancel={editingTrackSubjectId ? () => { setTrackSubjectForm(INITIAL_TRACK_SUBJECT_FORM); setEditingTrackSubjectId(null); } : undefined} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Assigned subjects</CardTitle>
                <CardDescription>Subjects currently visible inside each track.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminListControls
                  search={assignmentSearch}
                  onSearchChange={setAssignmentSearch}
                  searchPlaceholder="Search track assignments"
                  filters={[
                    { label: "Track", value: assignmentTrackFilter, onChange: setAssignmentTrackFilter, options: [{ value: "all", label: "All tracks" }, ...tracks.map((track) => ({ value: String(track.id), label: track.title }))] },
                    { label: "Status", value: assignmentStatusFilter, onChange: setAssignmentStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
                  ]}
                  sort={{ label: "Sort", value: assignmentSortBy, onChange: setAssignmentSortBy, options: [{ value: "track-asc", label: "Track A-Z" }, { value: "track-desc", label: "Track Z-A" }, { value: "subject-asc", label: "Subject A-Z" }, { value: "subject-desc", label: "Subject Z-A" }, { value: "chapters-desc", label: "Most chapters" }, { value: "chapters-asc", label: "Fewest chapters" }, { value: "resources-desc", label: "Most resources" }, { value: "resources-asc", label: "Fewest resources" }] }}
                />
                <BulkActionBar
                  count={trackSubjectBulkSelection.count}
                  isPending={bulkDeleteTrackSubjectMutation.isPending}
                  onClear={trackSubjectBulkSelection.clear}
                  onDelete={() => { if (confirmBulkDelete(trackSubjectBulkSelection.count)) bulkDeleteTrackSubjectMutation.mutate(Array.from(trackSubjectBulkSelection.selectedIds)) }}
                />
                <DataTable
                  headers={["Track", "Subject", "Stats", "Status", "Actions"]}
                  items={filteredTrackSubjects}
                  getId={(item) => item.id}
                  selectedIds={trackSubjectBulkSelection.selectedIds}
                  onToggle={trackSubjectBulkSelection.toggle}
                  onToggleAll={() => trackSubjectBulkSelection.toggleAll(filteredTrackSubjects.map((item) => item.id))}
                  rows={filteredTrackSubjects.map((item) => [
                    item.track_title,
                    item.subject_name,
                    `${item.chapter_count} chapters · ${item.resource_count} resources`,
                    item.is_published ? "published" : "draft",
                    <div key={`assignment-actions-${item.id}`} className="flex flex-wrap gap-2">
                      {iconButton("Edit", <Pencil className="mr-2 h-4 w-4" />, () => {
                        setEditingTrackSubjectId(item.id)
                        setTrackSubjectForm({ academic_track_id: String(item.academic_track_id), subject_id: String(item.subject_id), description: item.description ?? "", cover_image: item.cover_image ?? "", display_order: String(item.display_order ?? 0), is_published: Boolean(item.is_published) })
                      })}
                      {iconButton("Delete", <Trash2 className="mr-2 h-4 w-4" />, () => deleteTrackSubjectMutation.mutate(item.id), true)}
                    </div>,
                  ])}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Chapters</CardTitle>
                <CardDescription>Create chapters inside one assigned subject.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SelectField label="Assigned subject" value={chapterForm.track_subject_id} error={chapterErrors.track_subject_id} onChange={(value) => setChapterForm((prev) => ({ ...prev, track_subject_id: value }))}>
                  <option value="">Select assigned subject</option>
                  {trackSubjects.map((item) => <option key={item.id} value={String(item.id)}>{item.track_title} · {item.subject_name}</option>)}
                </SelectField>
                <TextField label="Title" value={chapterForm.title} error={chapterErrors.title} onChange={(value) => setChapterForm((prev) => ({ ...prev, title: value }))} />
                <TextField label="Slug" value={chapterForm.slug} error={chapterErrors.slug} onChange={(value) => setChapterForm((prev) => ({ ...prev, slug: value }))} />
                <TextField label="Display order" type="number" value={chapterForm.display_order} error={chapterErrors.display_order} onChange={(value) => setChapterForm((prev) => ({ ...prev, display_order: value }))} />
                <TextAreaField label="Description" value={chapterForm.description} error={chapterErrors.description} onChange={(value) => setChapterForm((prev) => ({ ...prev, description: value }))} />
                <SelectField label="Status" value={chapterForm.is_published ? "1" : "0"} error={chapterErrors.is_published} onChange={(value) => setChapterForm((prev) => ({ ...prev, is_published: value === "1" }))}>
                  <option value="1">published</option>
                  <option value="0">draft</option>
                </SelectField>
                <ActionButtons isPending={chapterMutation.isPending} onSubmit={saveChapter} submitLabel={editingChapterId ? "Save chapter" : "Create chapter"} onCancel={editingChapterId ? () => { setChapterForm(INITIAL_CHAPTER_FORM); setEditingChapterId(null); } : undefined} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Chapter list</CardTitle>
                <CardDescription>Published and draft chapters across all tracks.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminListControls
                  search={chapterSearch}
                  onSearchChange={setChapterSearch}
                  searchPlaceholder="Search chapters by title, slug, track, or subject"
                  filters={[
                    { label: "Track", value: chapterTrackFilter, onChange: setChapterTrackFilter, options: [{ value: "all", label: "All tracks" }, ...tracks.map((track) => ({ value: String(track.id), label: track.title }))] },
                    { label: "Status", value: chapterStatusFilter, onChange: setChapterStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
                  ]}
                  sort={{ label: "Sort", value: chapterSortBy, onChange: setChapterSortBy, options: [{ value: "title-asc", label: "Title A-Z" }, { value: "title-desc", label: "Title Z-A" }, { value: "track-asc", label: "Track A-Z" }, { value: "track-desc", label: "Track Z-A" }, { value: "resources-desc", label: "Most resources" }, { value: "resources-asc", label: "Fewest resources" }] }}
                />
                <BulkActionBar
                  count={chapterBulkSelection.count}
                  isPending={bulkDeleteChapterMutation.isPending}
                  onClear={chapterBulkSelection.clear}
                  onDelete={() => { if (confirmBulkDelete(chapterBulkSelection.count)) bulkDeleteChapterMutation.mutate(Array.from(chapterBulkSelection.selectedIds)) }}
                />
                <DataTable
                  headers={["Track", "Subject", "Chapter", "Resources", "Actions"]}
                  items={filteredChapters}
                  getId={(chapter) => chapter.id}
                  selectedIds={chapterBulkSelection.selectedIds}
                  onToggle={chapterBulkSelection.toggle}
                  onToggleAll={() => chapterBulkSelection.toggleAll(filteredChapters.map((chapter) => chapter.id))}
                  rows={filteredChapters.map((chapter) => [
                    chapter.track_title,
                    chapter.subject_name,
                    <div key={`chapter-${chapter.id}`}>
                      <div className="font-medium text-foreground">{chapter.title}</div>
                      <div className="text-xs text-muted-foreground">{chapter.slug}</div>
                    </div>,
                    `${chapter.resource_count} resources · ${chapter.is_published ? "published" : "draft"}`,
                    <div key={`chapter-actions-${chapter.id}`} className="flex flex-wrap gap-2">
                      {iconButton("Edit", <Pencil className="mr-2 h-4 w-4" />, () => {
                        setEditingChapterId(chapter.id)
                        setChapterForm({ track_subject_id: String(chapter.track_subject_id), title: chapter.title, slug: chapter.slug, description: chapter.description ?? "", display_order: String(chapter.display_order ?? 0), is_published: Boolean(chapter.is_published) })
                      })}
                      {iconButton("Delete", <Trash2 className="mr-2 h-4 w-4" />, () => deleteChapterMutation.mutate(chapter.id), true)}
                    </div>,
                  ])}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Resources</CardTitle>
                <CardDescription>Attach PDFs, videos, exercises, and corrections to a chapter.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SelectField label="Chapter" value={resourceForm.chapter_id} error={resourceErrors.chapter_id} onChange={(value) => setResourceForm((prev) => ({ ...prev, chapter_id: value }))}>
                  <option value="">Select chapter</option>
                  {chapters.map((chapter) => <option key={chapter.id} value={String(chapter.id)}>{chapter.track_title} · {chapter.subject_name} · {chapter.title}</option>)}
                </SelectField>
                <SelectField label="Resource type" value={resourceForm.resource_type} error={resourceErrors.resource_type} onChange={(value) => setResourceForm((prev) => ({ ...prev, resource_type: value as AdminResource["resource_type"] }))}>
                  {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </SelectField>
                <TextField label="Title" value={resourceForm.title} error={resourceErrors.title} onChange={(value) => setResourceForm((prev) => ({ ...prev, title: value }))} />

                {/* ── File upload ───────────────────────────────────── */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fichier (PDF / Vidéo)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.mp4,.mov,.avi,.webm,.mkv,.m4v"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingFile(true)
                      setUploadedFileName(file.name)
                      try {
                        const fd = new FormData()
                        fd.append("file", file)
                        const token = localStorage.getItem("token")
                        const res = await fetch(`${API_ORIGIN}/api/courses/resources/upload`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        })
                        if (!res.ok) throw new Error("Upload échoué")
                        const data = await res.json()
                        setResourceForm((p) => ({ ...p, file_url: data.file_url, external_url: "" }))
                        toast.success("Fichier uploadé")
                      } catch {
                        toast.error("Erreur lors de l'upload")
                        setUploadedFileName("")
                      } finally {
                        setUploadingFile(false)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className={`w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors focus:outline-none ${
                      resourceForm.file_url && !resourceForm.file_url.startsWith("http")
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-border hover:border-bordeaux/50 hover:bg-bordeaux/5"
                    }`}
                  >
                    {uploadingFile ? (
                      <div className="flex flex-col items-center gap-1.5 text-bordeaux">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-sm font-medium">Upload en cours…</span>
                      </div>
                    ) : resourceForm.file_url && !resourceForm.file_url.startsWith("http") ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-emerald-700 truncate">
                            {uploadedFileName || resourceForm.file_url.split("/").pop()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setResourceForm((p) => ({ ...p, file_url: "" })); setUploadedFileName("") }}
                          className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="h-6 w-6" />
                        <span className="text-sm font-medium">Cliquer pour sélectionner un fichier</span>
                        <span className="text-xs opacity-60">PDF · MP4 · MOV · WebM — max 200 Mo</span>
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou coller un lien</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <TextField
                    label=""
                    value={resourceForm.external_url}
                    error={resourceErrors.external_url}
                    onChange={(value) => {
                      setResourceForm((p) => ({ ...p, external_url: value, file_url: value ? "" : p.file_url }))
                      if (value) setUploadedFileName("")
                    }}
                    placeholder="https://youtube.com/… ou Google Drive…"
                  />
                  {resourceErrors.file_url && <p className="text-xs text-destructive">{resourceErrors.file_url}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {resourceForm.resource_type === "video_lesson" && (
                    <TextField label="Duration (min)" type="number" value={resourceForm.duration_minutes} error={resourceErrors.duration_minutes} onChange={(value) => setResourceForm((prev) => ({ ...prev, duration_minutes: value }))} />
                  )}
                  <TextField label="Display order" type="number" value={resourceForm.display_order} error={resourceErrors.display_order} onChange={(value) => setResourceForm((prev) => ({ ...prev, display_order: value }))} />
                </div>
                <TextAreaField label="Description" value={resourceForm.description} error={resourceErrors.description} onChange={(value) => setResourceForm((prev) => ({ ...prev, description: value }))} />
                <SelectField label="Status" value={resourceForm.is_published ? "1" : "0"} error={resourceErrors.is_published} onChange={(value) => setResourceForm((prev) => ({ ...prev, is_published: value === "1" }))}>
                  <option value="1">published</option>
                  <option value="0">draft</option>
                </SelectField>
                <ActionButtons isPending={resourceMutation.isPending} onSubmit={saveResource} submitLabel={editingResourceId ? "Save resource" : "Create resource"} onCancel={editingResourceId ? () => { setResourceForm(INITIAL_RESOURCE_FORM); setEditingResourceId(null); } : undefined} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Resource list</CardTitle>
                <CardDescription>All content attached to chapters.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminListControls
                  search={resourceSearch}
                  onSearchChange={setResourceSearch}
                  searchPlaceholder="Search resources by title, chapter, subject, or track"
                  filters={[
                    { label: "Track", value: resourceTrackFilter, onChange: setResourceTrackFilter, options: [{ value: "all", label: "All tracks" }, ...Array.from(new Set(tracks.map((track) => track.title))).map((trackTitle) => ({ value: trackTitle, label: trackTitle }))] },
                    { label: "Type", value: resourceTypeFilter, onChange: setResourceTypeFilter, options: [{ value: "all", label: "All types" }, ...RESOURCE_TYPES.map((type) => ({ value: type, label: type }))] },
                    { label: "Status", value: resourceStatusFilter, onChange: setResourceStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }] },
                  ]}
                  sort={{ label: "Sort", value: resourceSortBy, onChange: setResourceSortBy, options: [{ value: "title-asc", label: "Title A-Z" }, { value: "title-desc", label: "Title Z-A" }, { value: "track-asc", label: "Track A-Z" }, { value: "track-desc", label: "Track Z-A" }, { value: "type-asc", label: "Type A-Z" }, { value: "type-desc", label: "Type Z-A" }, { value: "duration-desc", label: "Longest duration" }, { value: "duration-asc", label: "Shortest duration" }] }}
                />
                <BulkActionBar
                  count={resourceBulkSelection.count}
                  isPending={bulkDeleteResourceMutation.isPending}
                  onClear={resourceBulkSelection.clear}
                  onDelete={() => { if (confirmBulkDelete(resourceBulkSelection.count)) bulkDeleteResourceMutation.mutate(Array.from(resourceBulkSelection.selectedIds)) }}
                />
                <DataTable
                  headers={["Track", "Chapter", "Type", "Title", "Actions"]}
                  items={filteredResources}
                  getId={(resource) => resource.id}
                  selectedIds={resourceBulkSelection.selectedIds}
                  onToggle={resourceBulkSelection.toggle}
                  onToggleAll={() => resourceBulkSelection.toggleAll(filteredResources.map((resource) => resource.id))}
                  rows={filteredResources.map((resource) => [
                    `${resource.track_title} · ${resource.subject_name}`,
                    resource.chapter_title,
                    resource.resource_type,
                    <div key={`resource-${resource.id}`}>
                      <div className="font-medium text-foreground">{resource.title}</div>
                      <div className="text-xs text-muted-foreground">{resource.is_published ? "published" : "draft"}</div>
                    </div>,
                    <div key={`resource-actions-${resource.id}`} className="flex flex-wrap gap-2">
                      {iconButton("Edit", <Pencil className="mr-2 h-4 w-4" />, () => {
                        setEditingResourceId(resource.id)
                        setResourceForm({ chapter_id: String(resource.chapter_id), resource_type: resource.resource_type, title: resource.title, description: resource.description ?? "", file_url: resource.file_url ?? "", external_url: resource.external_url ?? "", duration_minutes: resource.duration_minutes ? String(resource.duration_minutes) : "", display_order: String(resource.display_order ?? 0), is_published: Boolean(resource.is_published) })
                      })}
                      {iconButton("Delete", <Trash2 className="mr-2 h-4 w-4" />, () => deleteResourceMutation.mutate(resource.id), true)}
                    </div>,
                  ])}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Teacher assignments ─────────────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bordeaux/10">
                    <UserCheck className="h-5 w-5 text-bordeaux" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-2xl text-bordeaux">Assigner un enseignant</CardTitle>
                    <CardDescription>Chaque enseignant est responsable d'une seule matière.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <SelectField
                  label="Enseignant"
                  value={assignmentForm.teacher_id}
                  onChange={(v) => setAssignmentForm(p => ({ ...p, teacher_id: v }))}
                >
                  <option value="">Sélectionner un enseignant</option>
                  {unassignedTeachers.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      {t.first_name} {t.last_name} — {t.email}
                    </option>
                  ))}
                </SelectField>
                {unassignedTeachers.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun enseignant disponible.</p>
                )}
                <SelectField
                  label="Matière (filière)"
                  value={assignmentForm.track_subject_id}
                  onChange={(v) => setAssignmentForm(p => ({ ...p, track_subject_id: v }))}
                >
                  <option value="">Sélectionner une matière</option>
                  {trackSubjectsList.map(ts => (
                    <option key={ts.id} value={String(ts.id)}>
                      {ts.track_title} · {ts.subject_name}
                    </option>
                  ))}
                </SelectField>
                <ActionButtons
                  isPending={createAssignmentMutation.isPending}
                  onSubmit={saveAssignment}
                  submitLabel="Assigner"
                />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-white/85">
              <CardHeader>
                <CardTitle className="font-display text-2xl text-bordeaux">Assignations actuelles</CardTitle>
                <CardDescription>{assignments.length} enseignant{assignments.length !== 1 ? "s" : ""} assigné{assignments.length !== 1 ? "s" : ""}</CardDescription>
              </CardHeader>
              <CardContent>
                <BulkActionBar
                  count={assignmentBulkSelection.count}
                  isPending={bulkDeleteAssignmentMutation.isPending}
                  onClear={assignmentBulkSelection.clear}
                  onDelete={() => { if (confirmBulkDelete(assignmentBulkSelection.count)) bulkDeleteAssignmentMutation.mutate(Array.from(assignmentBulkSelection.selectedIds)) }}
                />
                <DataTable
                  headers={["Enseignant", "Matière / Filière", "Actions"]}
                  items={assignments}
                  getId={(a) => a.id}
                  selectedIds={assignmentBulkSelection.selectedIds}
                  onToggle={assignmentBulkSelection.toggle}
                  onToggleAll={() => assignmentBulkSelection.toggleAll(assignments.map((a) => a.id))}
                  rows={assignments.map(a => [
                    <div key={`ta-${a.id}`}>
                      <div className="font-medium">{a.first_name} {a.last_name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </div>,
                    <div key={`ts-${a.id}`}>
                      <div className="font-medium">{a.subject_name}</div>
                      <div className="text-xs text-muted-foreground">{a.track_title}</div>
                    </div>,
                    <div key={`act-${a.id}`}>
                      {iconButton("Retirer", <Trash2 className="mr-2 h-4 w-4" />, () => deleteAssignmentMutation.mutate(a.id), true)}
                    </div>,
                  ])}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function matchesSearch(searchTerm: string, ...values: Array<string | number | null | undefined>) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) {
    return true
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(query))
}

function sortItems<T>(items: T[], selector: (item: T) => string | number | null | undefined, direction: "asc" | "desc") {
  return [...items].sort((left, right) => {
    const a = selector(left)
    const b = selector(right)

    if (typeof a === "number" && typeof b === "number") {
      return direction === "asc" ? a - b : b - a
    }

    const result = String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" })
    return direction === "asc" ? result : -result
  })
}

function validateSubjectForm(form: SubjectForm): FormErrors<keyof SubjectForm & string> {
  const errors: FormErrors<keyof SubjectForm & string> = {}
  if (!hasMinLength(form.name, 2)) errors.name = "Le nom de la matiere est obligatoire"
  if (!isValidSlug(form.slug)) errors.slug = "Utilisez un slug en minuscules avec des tirets"
  if (!isBlank(form.color) && !isValidHexColor(form.color)) errors.color = "La couleur doit etre un code hex valide"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

function validateTrackSubjectForm(form: TrackSubjectForm): FormErrors<keyof TrackSubjectForm & string> {
  const errors: FormErrors<keyof TrackSubjectForm & string> = {}
  if (isBlank(form.academic_track_id)) errors.academic_track_id = "Selectionnez un parcours"
  if (isBlank(form.subject_id)) errors.subject_id = "Selectionnez une matiere"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (!isBlank(form.cover_image) && !isValidUrl(form.cover_image) && !form.cover_image.startsWith("/uploads/")) errors.cover_image = "L'URL de l'image de couverture est invalide"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

function validateChapterForm(form: ChapterForm): FormErrors<keyof ChapterForm & string> {
  const errors: FormErrors<keyof ChapterForm & string> = {}
  if (isBlank(form.track_subject_id)) errors.track_subject_id = "Selectionnez une matiere affectee"
  if (!hasMinLength(form.title, 3)) errors.title = "Le titre du chapitre est obligatoire"
  if (!isValidSlug(form.slug)) errors.slug = "Utilisez un slug en minuscules avec des tirets"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

function validateResourceForm(form: ResourceForm): FormErrors<keyof ResourceForm & string> {
  const errors: FormErrors<keyof ResourceForm & string> = {}
  if (isBlank(form.chapter_id)) errors.chapter_id = "Selectionnez un chapitre"
  if (isBlank(form.resource_type)) errors.resource_type = "Selectionnez un type de ressource"
  if (!hasMinLength(form.title, 3)) errors.title = "Le titre de la ressource est obligatoire"
  if (!isBlank(form.file_url) && !isValidUrl(form.file_url) && !form.file_url.startsWith("/uploads/")) errors.file_url = "L'URL du fichier est invalide"
  if (!isBlank(form.external_url) && !isValidUrl(form.external_url)) errors.external_url = "L'URL externe est invalide"
  if (isBlank(form.file_url) && isBlank(form.external_url)) errors.file_url = "Ajoutez un fichier ou un lien externe"
  if (!isBlank(form.duration_minutes) && !isNonNegativeNumber(form.duration_minutes)) errors.duration_minutes = "La duree doit etre superieure ou egale a 0"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}