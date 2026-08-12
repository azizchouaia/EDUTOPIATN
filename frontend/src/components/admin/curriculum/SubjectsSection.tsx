import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api from "@/lib/api"
import { hasErrors } from "@/lib/validation"
// FormErrors is re-exported from shared
import {
  ActionButtons, AdminSubject, DataTable, FormErrors, INITIAL_SUBJECT_FORM,
  SelectField, SubjectForm, TextAreaField, TextField,
  iconButton, matchesSearch, payloadError, sortItems, validateSubjectForm,
} from "./shared"

type Props = { subjects: AdminSubject[] }

export function SubjectsSection({ subjects }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const [subjectForm, setSubjectForm] = useState<SubjectForm>(INITIAL_SUBJECT_FORM)
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null)
  const [subjectErrors, setSubjectErrors] = useState<FormErrors<keyof SubjectForm & string>>({})
  const [subjectSearch, setSubjectSearch] = useState("")
  const [subjectStatusFilter, setSubjectStatusFilter] = useState("all")
  const [subjectSortBy, setSubjectSortBy] = useState("name-asc")

  const filteredSubjects = sortItems(
    subjects.filter((subject) => {
      const matchesText = matchesSearch(subjectSearch, subject.name, subject.slug, subject.description ?? "", subject.icon ?? "")
      const matchesStatus = subjectStatusFilter === "all" || (subjectStatusFilter === "active" ? Boolean(subject.is_active) : !subject.is_active)
      return matchesText && matchesStatus
    }),
    (subject) => (subjectSortBy.startsWith("slug") ? subject.slug : subject.name),
    subjectSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const subjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) =>
      id ? api.put(`/courses/admin/subjects/${id}`, payload) : api.post("/courses/admin/subjects", payload),
    onSuccess: () => {
      toast.success(editingSubjectId ? "Matiere mise a jour." : "Matiere creee.")
      setSubjectForm(INITIAL_SUBJECT_FORM)
      setEditingSubjectId(null)
      invalidate()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de la matiere impossible.")),
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/subjects/${id}`),
    onSuccess: () => { toast.success("Matiere supprimee."); invalidate() },
    onError: (error) => toast.error(payloadError(error, "Suppression de la matiere impossible.")),
  })

  const toggleSubjectMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/courses/admin/subjects/${id}/toggle`),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(payloadError(error, "Changement de statut impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/subjects/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} matiere(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
    },
  })

  const saveSubject = () => {
    const nextErrors = validateSubjectForm(subjectForm)
    setSubjectErrors(nextErrors)
    if (hasErrors(nextErrors)) { toast.error("Corrigez le formulaire matiere avant enregistrement"); return }
    subjectMutation.mutate({
      id: editingSubjectId ?? undefined,
      payload: { name: subjectForm.name, slug: subjectForm.slug, description: subjectForm.description || null, icon: subjectForm.icon || null, color: subjectForm.color || null, is_active: subjectForm.is_active ? 1 : 0 },
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Form */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">
            {editingSubjectId ? "Modifier la matière" : "Nouvelle matière"}
          </CardTitle>
          <CardDescription>Créez ou mettez à jour des matières réutilisables.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextField label="Nom" value={subjectForm.name} error={subjectErrors.name} onChange={(value) => setSubjectForm((prev) => ({ ...prev, name: value }))} />
          <TextField label="Slug" value={subjectForm.slug} error={subjectErrors.slug} onChange={(value) => setSubjectForm((prev) => ({ ...prev, slug: value }))} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Icône" value={subjectForm.icon} error={subjectErrors.icon} onChange={(value) => setSubjectForm((prev) => ({ ...prev, icon: value }))} placeholder="book-open" />
            <TextField label="Couleur" value={subjectForm.color} error={subjectErrors.color} onChange={(value) => setSubjectForm((prev) => ({ ...prev, color: value }))} placeholder="#7d1022" />
          </div>
          <TextAreaField label="Description" value={subjectForm.description} error={subjectErrors.description} onChange={(value) => setSubjectForm((prev) => ({ ...prev, description: value }))} />
          <SelectField label="Statut" value={subjectForm.is_active ? "1" : "0"} error={subjectErrors.is_active} onChange={(value) => setSubjectForm((prev) => ({ ...prev, is_active: value === "1" }))}>
            <option value="1">Actif</option>
            <option value="0">Inactif</option>
          </SelectField>
          <ActionButtons isPending={subjectMutation.isPending} onSubmit={saveSubject} submitLabel={editingSubjectId ? "Enregistrer la matière" : "Créer la matière"} onCancel={editingSubjectId ? () => { setSubjectForm(INITIAL_SUBJECT_FORM); setEditingSubjectId(null) } : undefined} />
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Liste des matières</CardTitle>
          <CardDescription>Matières disponibles pour l'affectation.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminListControls
            search={subjectSearch}
            onSearchChange={setSubjectSearch}
            searchPlaceholder="Rechercher par nom ou slug"
            filters={[{ label: "Statut", value: subjectStatusFilter, onChange: setSubjectStatusFilter, options: [{ value: "all", label: "Tous les statuts" }, { value: "active", label: "Actif" }, { value: "inactive", label: "Inactif" }] }]}
            sort={{ label: "Trier", value: subjectSortBy, onChange: setSubjectSortBy, options: [{ value: "name-asc", label: "Nom A-Z" }, { value: "name-desc", label: "Nom Z-A" }, { value: "slug-asc", label: "Slug A-Z" }, { value: "slug-desc", label: "Slug Z-A" }] }}
          />
          <BulkActionBar count={bulkSelection.count} isPending={bulkDeleteMutation.isPending} onClear={bulkSelection.clear} onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }} />
          <DataTable
            headers={["Matière", "Slug", "Statut", "Actions"]}
            items={filteredSubjects}
            getId={(subject) => subject.id}
            selectedIds={bulkSelection.selectedIds}
            onToggle={bulkSelection.toggle}
            onToggleAll={() => bulkSelection.toggleAll(filteredSubjects.map((s) => s.id))}
            rows={filteredSubjects.map((subject) => [
              <div key={`subject-${subject.id}`}>
                <div className="font-medium text-foreground">{subject.name}</div>
                <div className="text-xs text-muted-foreground">{subject.description ?? "Aucune description"}</div>
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
                {iconButton("Modifier", <Pencil className="mr-2 h-4 w-4" />, () => {
                  setEditingSubjectId(subject.id)
                  setSubjectForm({ name: subject.name, slug: subject.slug, description: subject.description ?? "", icon: subject.icon ?? "", color: subject.color ?? "", is_active: Boolean(subject.is_active) })
                })}
                {iconButton("Supprimer", <Trash2 className="mr-2 h-4 w-4" />, () => { if (confirm(`Supprimer "${subject.name}" ?`)) deleteSubjectMutation.mutate(subject.id) }, true)}
              </div>,
            ])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
