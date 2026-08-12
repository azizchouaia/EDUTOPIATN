import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api from "@/lib/api"
import { hasErrors } from "@/lib/validation"
import {
  ActionButtons, AdminChapter, AdminTrack, AdminTrackSubject, ChapterForm, DataTable, FormErrors,
  INITIAL_CHAPTER_FORM, SelectField, TextAreaField, TextField,
  iconButton, matchesSearch, payloadError, sortItems, validateChapterForm,
} from "./shared"

type Props = { tracks: AdminTrack[]; trackSubjects: AdminTrackSubject[]; chapters: AdminChapter[] }

export function ChaptersSection({ tracks, trackSubjects, chapters }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const [chapterForm, setChapterForm] = useState<ChapterForm>(INITIAL_CHAPTER_FORM)
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null)
  const [chapterErrors, setChapterErrors] = useState<FormErrors<keyof ChapterForm & string>>({})
  const [chapterSearch, setChapterSearch] = useState("")
  const [chapterTrackFilter, setChapterTrackFilter] = useState("all")
  const [chapterStatusFilter, setChapterStatusFilter] = useState("all")
  const [chapterSortBy, setChapterSortBy] = useState("title-asc")

  const filteredChapters = sortItems(
    chapters.filter((chapter) => {
      const matchesText = matchesSearch(chapterSearch, chapter.track_title, chapter.subject_name, chapter.title, chapter.slug, chapter.description ?? "")
      const matchesTrack = chapterTrackFilter === "all" || String(chapter.academic_track_id) === chapterTrackFilter
      const matchesStatus = chapterStatusFilter === "all" || (chapterStatusFilter === "published" ? Boolean(chapter.is_published) : !chapter.is_published)
      return matchesText && matchesTrack && matchesStatus
    }),
    (chapter) => {
      switch (chapterSortBy) {
        case "resources-desc": case "resources-asc": return chapter.resource_count
        case "track-desc": case "track-asc": return `${chapter.track_title} ${chapter.subject_name} ${chapter.title}`
        default: return chapter.title
      }
    },
    chapterSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const chapterMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) =>
      id ? api.put(`/courses/admin/chapters/${id}`, payload) : api.post("/courses/admin/chapters", payload),
    onSuccess: () => {
      toast.success(editingChapterId ? "Chapitre mis a jour." : "Chapitre cree.")
      setChapterForm(INITIAL_CHAPTER_FORM)
      setEditingChapterId(null)
      invalidate()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement du chapitre impossible.")),
  })

  const deleteChapterMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/chapters/${id}`),
    onSuccess: () => { toast.success("Chapitre supprime."); invalidate() },
    onError: (error) => toast.error(payloadError(error, "Suppression du chapitre impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/chapters/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} chapitre(s) supprime(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
    },
  })

  const saveChapter = () => {
    const nextErrors = validateChapterForm(chapterForm)
    setChapterErrors(nextErrors)
    if (hasErrors(nextErrors)) { toast.error("Corrigez le formulaire chapitre avant enregistrement"); return }
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Form */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">
            {editingChapterId ? "Modifier le chapitre" : "Nouveau chapitre"}
          </CardTitle>
          <CardDescription>Créez des chapitres dans une matière affectée.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SelectField label="Matière affectée" value={chapterForm.track_subject_id} error={chapterErrors.track_subject_id} onChange={(value) => setChapterForm((prev) => ({ ...prev, track_subject_id: value }))}>
            <option value="">Sélectionner une matière affectée</option>
            {trackSubjects.map((item) => <option key={item.id} value={String(item.id)}>{item.track_title} · {item.subject_name}</option>)}
          </SelectField>
          <TextField label="Titre" value={chapterForm.title} error={chapterErrors.title} onChange={(value) => setChapterForm((prev) => ({ ...prev, title: value }))} />
          <TextField label="Slug" value={chapterForm.slug} error={chapterErrors.slug} onChange={(value) => setChapterForm((prev) => ({ ...prev, slug: value }))} />
          <TextField label="Ordre d'affichage" type="number" value={chapterForm.display_order} error={chapterErrors.display_order} onChange={(value) => setChapterForm((prev) => ({ ...prev, display_order: value }))} />
          <TextAreaField label="Description" value={chapterForm.description} error={chapterErrors.description} onChange={(value) => setChapterForm((prev) => ({ ...prev, description: value }))} />
          <SelectField label="Statut" value={chapterForm.is_published ? "1" : "0"} error={chapterErrors.is_published} onChange={(value) => setChapterForm((prev) => ({ ...prev, is_published: value === "1" }))}>
            <option value="1">Publié</option>
            <option value="0">Brouillon</option>
          </SelectField>
          <ActionButtons isPending={chapterMutation.isPending} onSubmit={saveChapter} submitLabel={editingChapterId ? "Enregistrer le chapitre" : "Créer le chapitre"} onCancel={editingChapterId ? () => { setChapterForm(INITIAL_CHAPTER_FORM); setEditingChapterId(null) } : undefined} />
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Liste des chapitres</CardTitle>
          <CardDescription>Chapitres publiés et brouillons dans toutes les filières.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminListControls
            search={chapterSearch}
            onSearchChange={setChapterSearch}
            searchPlaceholder="Rechercher par titre, slug, filière ou matière"
            filters={[
              { label: "Filière", value: chapterTrackFilter, onChange: setChapterTrackFilter, options: [{ value: "all", label: "Toutes les filières" }, ...tracks.map((t) => ({ value: String(t.id), label: t.title }))] },
              { label: "Statut", value: chapterStatusFilter, onChange: setChapterStatusFilter, options: [{ value: "all", label: "Tous les statuts" }, { value: "published", label: "Publié" }, { value: "draft", label: "Brouillon" }] },
            ]}
            sort={{ label: "Trier", value: chapterSortBy, onChange: setChapterSortBy, options: [{ value: "title-asc", label: "Titre A-Z" }, { value: "title-desc", label: "Titre Z-A" }, { value: "track-asc", label: "Filière A-Z" }, { value: "track-desc", label: "Filière Z-A" }, { value: "resources-desc", label: "Plus de ressources" }, { value: "resources-asc", label: "Moins de ressources" }] }}
          />
          <BulkActionBar count={bulkSelection.count} isPending={bulkDeleteMutation.isPending} onClear={bulkSelection.clear} onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }} />
          <DataTable
            headers={["Filière", "Matière", "Chapitre", "Ressources", "Actions"]}
            items={filteredChapters}
            getId={(chapter) => chapter.id}
            selectedIds={bulkSelection.selectedIds}
            onToggle={bulkSelection.toggle}
            onToggleAll={() => bulkSelection.toggleAll(filteredChapters.map((c) => c.id))}
            rows={filteredChapters.map((chapter) => [
              chapter.track_title,
              chapter.subject_name,
              <div key={`chapter-${chapter.id}`}>
                <div className="font-medium text-foreground">{chapter.title}</div>
                <div className="text-xs text-muted-foreground">{chapter.slug}</div>
              </div>,
              `${chapter.resource_count} ressources · ${chapter.is_published ? "Publié" : "Brouillon"}`,
              <div key={`chapter-actions-${chapter.id}`} className="flex flex-wrap gap-2">
                {iconButton("Modifier", <Pencil className="mr-2 h-4 w-4" />, () => {
                  setEditingChapterId(chapter.id)
                  setChapterForm({ track_subject_id: String(chapter.track_subject_id), title: chapter.title, slug: chapter.slug, description: chapter.description ?? "", display_order: String(chapter.display_order ?? 0), is_published: Boolean(chapter.is_published) })
                })}
                {iconButton("Supprimer", <Trash2 className="mr-2 h-4 w-4" />, () => deleteChapterMutation.mutate(chapter.id), true)}
              </div>,
            ])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
