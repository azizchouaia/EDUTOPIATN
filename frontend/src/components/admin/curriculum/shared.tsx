/**
 * Shared types, UI primitives, utilities, and constants for the Curriculum admin sections.
 * Imported by every section component.
 */
import React from "react"
import { Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectCheckbox } from "@/components/admin/BulkSelection"
import { FormErrors, hasErrors, hasMinLength, isBlank, isNonNegativeInteger, isNonNegativeNumber, isValidHexColor, isValidSlug, isValidUrl } from "@/lib/validation"
export type { FormErrors }

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminTrack = {
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

export type AdminSubject = {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  is_active: number
}

export type AdminTrackSubject = {
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

export type AdminChapter = {
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

export type AdminResource = {
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

export type AdminCurriculumResponse = {
  tracks: AdminTrack[]
  subjects: AdminSubject[]
  track_subjects: AdminTrackSubject[]
  chapters: AdminChapter[]
  resources: AdminResource[]
}

export type TeacherAssignment = {
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

export type UnassignedTeacher = { id: number; first_name: string; last_name: string; email: string }
export type TrackSubjectItem  = { id: number; subject_name: string; track_title: string; grade_code: string; section_code: string | null }

export type SubjectForm = {
  name: string
  slug: string
  description: string
  icon: string
  color: string
  is_active: boolean
}

export type TrackSubjectForm = {
  academic_track_id: string
  subject_id: string
  description: string
  cover_image: string
  display_order: string
  is_published: boolean
}

export type ChapterForm = {
  track_subject_id: string
  title: string
  slug: string
  description: string
  display_order: string
  is_published: boolean
}

export type ResourceForm = {
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

// ── Constants ──────────────────────────────────────────────────────────────────

export const INITIAL_SUBJECT_FORM: SubjectForm = { name: "", slug: "", description: "", icon: "", color: "", is_active: true }
export const INITIAL_TRACK_SUBJECT_FORM: TrackSubjectForm = { academic_track_id: "", subject_id: "", description: "", cover_image: "", display_order: "0", is_published: true }
export const INITIAL_CHAPTER_FORM: ChapterForm = { track_subject_id: "", title: "", slug: "", description: "", display_order: "0", is_published: true }
export const INITIAL_RESOURCE_FORM: ResourceForm = { chapter_id: "", resource_type: "pdf_lesson", title: "", description: "", file_url: "", external_url: "", duration_minutes: "", display_order: "0", is_published: true }
export const RESOURCE_TYPES: AdminResource["resource_type"][] = ["pdf_lesson", "video_lesson", "exercise_sheet", "correction_sheet", "extra_resource"]

// ── Utilities ──────────────────────────────────────────────────────────────────

export function payloadError(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
}

export function matchesSearch(searchTerm: string, ...values: Array<string | number | null | undefined>) {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return true
  return values.some((value) => String(value ?? "").toLowerCase().includes(query))
}

export function sortItems<T>(items: T[], selector: (item: T) => string | number | null | undefined, direction: "asc" | "desc") {
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

// ── Validation ─────────────────────────────────────────────────────────────────

export function validateSubjectForm(form: SubjectForm): FormErrors<keyof SubjectForm & string> {
  const errors: FormErrors<keyof SubjectForm & string> = {}
  if (!hasMinLength(form.name, 2)) errors.name = "Le nom de la matiere est obligatoire"
  if (!isValidSlug(form.slug)) errors.slug = "Utilisez un slug en minuscules avec des tirets"
  if (!isBlank(form.color) && !isValidHexColor(form.color)) errors.color = "La couleur doit etre un code hex valide"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

export function validateTrackSubjectForm(form: TrackSubjectForm): FormErrors<keyof TrackSubjectForm & string> {
  const errors: FormErrors<keyof TrackSubjectForm & string> = {}
  if (isBlank(form.academic_track_id)) errors.academic_track_id = "Selectionnez un parcours"
  if (isBlank(form.subject_id)) errors.subject_id = "Selectionnez une matiere"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (!isBlank(form.cover_image) && !isValidUrl(form.cover_image) && !form.cover_image.startsWith("/uploads/")) errors.cover_image = "L'URL de l'image de couverture est invalide"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

export function validateChapterForm(form: ChapterForm): FormErrors<keyof ChapterForm & string> {
  const errors: FormErrors<keyof ChapterForm & string> = {}
  if (isBlank(form.track_subject_id)) errors.track_subject_id = "Selectionnez une matiere affectee"
  if (!hasMinLength(form.title, 3)) errors.title = "Le titre du chapitre est obligatoire"
  if (!isValidSlug(form.slug)) errors.slug = "Utilisez un slug en minuscules avec des tirets"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

export function validateResourceForm(form: ResourceForm): FormErrors<keyof ResourceForm & string> {
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

// ── Shared UI primitives ───────────────────────────────────────────────────────

export function DataTable<T>({ headers, rows, items, getId, selectedIds, onToggle, onToggleAll }: {
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
                <SelectCheckbox checked={allChecked} onChange={() => onToggleAll!()} ariaLabel="Tout sélectionner" />
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
              <td colSpan={headers.length + (selectable ? 1 : 0)} className="px-3 py-8 text-center text-muted-foreground">Aucun enregistrement.</td>
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => {
            const id = selectable ? getId!(items![rowIndex]) : undefined
            return (
              <tr key={rowIndex} className={`border-b border-border/70 align-top ${selectable && id !== undefined && selectedIds!.has(id) ? "bg-destructive/5" : ""}`}>
                {selectable ? (
                  <td className="px-3 py-3">
                    <SelectCheckbox checked={selectedIds!.has(id!)} onChange={() => onToggle!(id!)} ariaLabel={`Sélectionner la ligne ${id}`} />
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

export function TextField({ label, value, onChange, type = "text", placeholder, error }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <Input type={type} value={value} placeholder={placeholder} className={error ? "border-destructive" : undefined} onChange={(event) => onChange(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function SelectField({ label, value, onChange, children, error }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; error?: string }) {
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

export function TextAreaField({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={4} value={value} className={error ? "border-destructive" : undefined} onChange={(event) => onChange(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function ActionButtons({ isPending, onSubmit, submitLabel, onCancel }: { isPending: boolean; onSubmit: () => void; submitLabel: string; onCancel?: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement en cours...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}
      </Button>
      {onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Annuler</Button> : null}
    </div>
  )
}

export function iconButton(label: string, icon: React.ReactNode, onClick: () => void, destructive = false) {
  return (
    <Button size="sm" variant="outline" className={destructive ? "border-red-300 text-red-700" : "border-bordeaux text-bordeaux"} onClick={onClick}>
      {icon}
      {label}
    </Button>
  )
}
