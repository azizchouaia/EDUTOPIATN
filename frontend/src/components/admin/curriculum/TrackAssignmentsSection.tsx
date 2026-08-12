import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api from "@/lib/api"
import { hasErrors } from "@/lib/validation"
import { ImageUpload } from "@/components/ui/ImageUpload"
import {
  ActionButtons, AdminSubject, AdminTrack, AdminTrackSubject, DataTable, FormErrors,
  INITIAL_TRACK_SUBJECT_FORM, SelectField, TextAreaField, TextField,
  TrackSubjectForm, iconButton, matchesSearch, payloadError, sortItems, validateTrackSubjectForm,
} from "./shared"

type Props = { tracks: AdminTrack[]; subjects: AdminSubject[]; trackSubjects: AdminTrackSubject[] }

export function TrackAssignmentsSection({ tracks, subjects, trackSubjects }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const [trackSubjectForm, setTrackSubjectForm] = useState<TrackSubjectForm>(INITIAL_TRACK_SUBJECT_FORM)
  const [editingTrackSubjectId, setEditingTrackSubjectId] = useState<number | null>(null)
  const [trackSubjectErrors, setTrackSubjectErrors] = useState<FormErrors<keyof TrackSubjectForm & string>>({})
  const [assignmentSearch, setAssignmentSearch] = useState("")
  const [assignmentTrackFilter, setAssignmentTrackFilter] = useState("all")
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("all")
  const [assignmentSortBy, setAssignmentSortBy] = useState("track-asc")

  const filteredTrackSubjects = sortItems(
    trackSubjects.filter((item) => {
      const matchesText = matchesSearch(assignmentSearch, item.track_title, item.subject_name, item.description ?? "", item.track_slug, item.subject_slug)
      const matchesTrack = assignmentTrackFilter === "all" || String(item.academic_track_id) === assignmentTrackFilter
      const matchesStatus = assignmentStatusFilter === "all" || (assignmentStatusFilter === "published" ? Boolean(item.is_published) : !item.is_published)
      return matchesText && matchesTrack && matchesStatus
    }),
    (item) => {
      switch (assignmentSortBy) {
        case "subject-asc": case "subject-desc": return item.subject_name
        case "chapters-desc": case "chapters-asc": return item.chapter_count
        case "resources-desc": case "resources-asc": return item.resource_count
        default: return `${item.track_title} ${item.subject_name}`
      }
    },
    assignmentSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const trackSubjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) =>
      id ? api.put(`/courses/admin/track-subjects/${id}`, payload) : api.post("/courses/admin/track-subjects", payload),
    onSuccess: () => {
      toast.success(editingTrackSubjectId ? "Affectation mise a jour." : "Affectation creee.")
      setTrackSubjectForm(INITIAL_TRACK_SUBJECT_FORM)
      setEditingTrackSubjectId(null)
      invalidate()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de l'affectation impossible.")),
  })

  const deleteTrackSubjectMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/track-subjects/${id}`),
    onSuccess: () => { toast.success("Affectation supprimee."); invalidate() },
    onError: (error) => toast.error(payloadError(error, "Suppression de l'affectation impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/track-subjects/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} affectation(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
    },
  })

  const saveTrackSubject = () => {
    const nextErrors = validateTrackSubjectForm(trackSubjectForm)
    setTrackSubjectErrors(nextErrors)
    if (hasErrors(nextErrors)) { toast.error("Corrigez le formulaire d'affectation avant enregistrement"); return }
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Form */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">
            {editingTrackSubjectId ? "Modifier l'affectation" : "Affecter une matière"}
          </CardTitle>
          <CardDescription>Attachez une matière à une filière académique.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SelectField label="Filière" value={trackSubjectForm.academic_track_id} error={trackSubjectErrors.academic_track_id} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, academic_track_id: value }))}>
            <option value="">Sélectionner une filière</option>
            {tracks.map((track) => <option key={track.id} value={String(track.id)}>{track.title}</option>)}
          </SelectField>
          <SelectField label="Matière" value={trackSubjectForm.subject_id} error={trackSubjectErrors.subject_id} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, subject_id: value }))}>
            <option value="">Sélectionner une matière</option>
            {subjects.map((subject) => <option key={subject.id} value={String(subject.id)}>{subject.name}</option>)}
          </SelectField>
          <TextField label="Ordre d'affichage" type="number" value={trackSubjectForm.display_order} error={trackSubjectErrors.display_order} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, display_order: value }))} />
          <ImageUpload label="Image de couverture" value={trackSubjectForm.cover_image} onChange={(url) => setTrackSubjectForm((prev) => ({ ...prev, cover_image: url }))} />
          <TextAreaField label="Description" value={trackSubjectForm.description} error={trackSubjectErrors.description} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, description: value }))} />
          <SelectField label="Statut" value={trackSubjectForm.is_published ? "1" : "0"} error={trackSubjectErrors.is_published} onChange={(value) => setTrackSubjectForm((prev) => ({ ...prev, is_published: value === "1" }))}>
            <option value="1">Publié</option>
            <option value="0">Brouillon</option>
          </SelectField>
          <ActionButtons isPending={trackSubjectMutation.isPending} onSubmit={saveTrackSubject} submitLabel={editingTrackSubjectId ? "Enregistrer l'affectation" : "Affecter la matière"} onCancel={editingTrackSubjectId ? () => { setTrackSubjectForm(INITIAL_TRACK_SUBJECT_FORM); setEditingTrackSubjectId(null) } : undefined} />
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Matières affectées</CardTitle>
          <CardDescription>Matières actuellement visibles dans chaque filière.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminListControls
            search={assignmentSearch}
            onSearchChange={setAssignmentSearch}
            searchPlaceholder="Rechercher des affectations"
            filters={[
              { label: "Filière", value: assignmentTrackFilter, onChange: setAssignmentTrackFilter, options: [{ value: "all", label: "Toutes les filières" }, ...tracks.map((t) => ({ value: String(t.id), label: t.title }))] },
              { label: "Statut", value: assignmentStatusFilter, onChange: setAssignmentStatusFilter, options: [{ value: "all", label: "Tous les statuts" }, { value: "published", label: "Publié" }, { value: "draft", label: "Brouillon" }] },
            ]}
            sort={{ label: "Trier", value: assignmentSortBy, onChange: setAssignmentSortBy, options: [{ value: "track-asc", label: "Filière A-Z" }, { value: "track-desc", label: "Filière Z-A" }, { value: "subject-asc", label: "Matière A-Z" }, { value: "subject-desc", label: "Matière Z-A" }, { value: "chapters-desc", label: "Plus de chapitres" }, { value: "chapters-asc", label: "Moins de chapitres" }, { value: "resources-desc", label: "Plus de ressources" }, { value: "resources-asc", label: "Moins de ressources" }] }}
          />
          <BulkActionBar count={bulkSelection.count} isPending={bulkDeleteMutation.isPending} onClear={bulkSelection.clear} onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }} />
          <DataTable
            headers={["Filière", "Matière", "Stats", "Statut", "Actions"]}
            items={filteredTrackSubjects}
            getId={(item) => item.id}
            selectedIds={bulkSelection.selectedIds}
            onToggle={bulkSelection.toggle}
            onToggleAll={() => bulkSelection.toggleAll(filteredTrackSubjects.map((item) => item.id))}
            rows={filteredTrackSubjects.map((item) => [
              item.track_title,
              item.subject_name,
              `${item.chapter_count} chapitres · ${item.resource_count} ressources`,
              item.is_published ? "Publié" : "Brouillon",
              <div key={`assignment-actions-${item.id}`} className="flex flex-wrap gap-2">
                {iconButton("Modifier", <Pencil className="mr-2 h-4 w-4" />, () => {
                  setEditingTrackSubjectId(item.id)
                  setTrackSubjectForm({ academic_track_id: String(item.academic_track_id), subject_id: String(item.subject_id), description: item.description ?? "", cover_image: item.cover_image ?? "", display_order: String(item.display_order ?? 0), is_published: Boolean(item.is_published) })
                })}
                {iconButton("Supprimer", <Trash2 className="mr-2 h-4 w-4" />, () => deleteTrackSubjectMutation.mutate(item.id), true)}
              </div>,
            ])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
