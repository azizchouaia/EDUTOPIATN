import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2, UserCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api from "@/lib/api"
import {
  ActionButtons, DataTable, SelectField, TeacherAssignment,
  TrackSubjectItem, UnassignedTeacher, iconButton, payloadError,
} from "./shared"

type AssignmentForm = { teacher_id: string; track_subject_id: string }

export function TeacherAssignmentsSection() {
  const queryClient = useQueryClient()

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-teacher-assignments"] })
    queryClient.invalidateQueries({ queryKey: ["admin-unassigned-teachers"] })
  }

  const createAssignmentMutation = useMutation({
    mutationFn: (payload: { teacher_id: number; track_subject_id: number }) =>
      api.post("/courses/admin/teacher-assignments", payload),
    onSuccess: () => {
      toast.success("Enseignant assigné avec succès.")
      setAssignmentForm({ teacher_id: "", track_subject_id: "" })
      invalidate()
    },
    onError: (error) => toast.error(payloadError(error, "Assignation impossible.")),
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/teacher-assignments/${id}`),
    onSuccess: () => { toast.success("Assignation supprimée."); invalidate() },
    onError: (error) => toast.error(payloadError(error, "Suppression impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/teacher-assignments/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} assignation(s) supprimée(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Form */}
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
          <SelectField label="Enseignant" value={assignmentForm.teacher_id} onChange={(v) => setAssignmentForm(p => ({ ...p, teacher_id: v }))}>
            <option value="">Sélectionner un enseignant</option>
            {unassignedTeachers.map(t => (
              <option key={t.id} value={String(t.id)}>{t.first_name} {t.last_name} — {t.email}</option>
            ))}
          </SelectField>
          {unassignedTeachers.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun enseignant disponible.</p>
          )}
          <SelectField label="Matière (filière)" value={assignmentForm.track_subject_id} onChange={(v) => setAssignmentForm(p => ({ ...p, track_subject_id: v }))}>
            <option value="">Sélectionner une matière</option>
            {trackSubjectsList.map(ts => (
              <option key={ts.id} value={String(ts.id)}>{ts.track_title} · {ts.subject_name}</option>
            ))}
          </SelectField>
          <ActionButtons isPending={createAssignmentMutation.isPending} onSubmit={saveAssignment} submitLabel="Assigner" />
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Assignations actuelles</CardTitle>
          <CardDescription>{assignments.length} enseignant{assignments.length !== 1 ? "s" : ""} assigné{assignments.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          <BulkActionBar count={bulkSelection.count} isPending={bulkDeleteMutation.isPending} onClear={bulkSelection.clear} onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }} />
          <DataTable
            headers={["Enseignant", "Matière / Filière", "Actions"]}
            items={assignments}
            getId={(a) => a.id}
            selectedIds={bulkSelection.selectedIds}
            onToggle={bulkSelection.toggle}
            onToggleAll={() => bulkSelection.toggleAll(assignments.map((a) => a.id))}
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
  )
}
