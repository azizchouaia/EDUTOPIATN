import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Loader2, Pencil, Trash2, Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api, { API_ORIGIN } from "@/lib/api"
import { hasErrors } from "@/lib/validation"
import {
  ActionButtons, AdminChapter, AdminResource, AdminTrack, DataTable, FormErrors,
  INITIAL_RESOURCE_FORM, RESOURCE_TYPES, ResourceForm, SelectField,
  TextAreaField, TextField, iconButton, matchesSearch, payloadError, sortItems, validateResourceForm,
} from "./shared"

type Props = { tracks: AdminTrack[]; chapters: AdminChapter[]; resources: AdminResource[] }

export function ResourcesSection({ tracks, chapters, resources }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const [resourceForm, setResourceForm] = useState<ResourceForm>(INITIAL_RESOURCE_FORM)
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null)
  const [resourceErrors, setResourceErrors] = useState<FormErrors<keyof ResourceForm & string>>({})
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resourceSearch, setResourceSearch] = useState("")
  const [resourceTrackFilter, setResourceTrackFilter] = useState("all")
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all")
  const [resourceStatusFilter, setResourceStatusFilter] = useState("all")
  const [resourceSortBy, setResourceSortBy] = useState("title-asc")

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
        case "duration-desc": case "duration-asc": return resource.duration_minutes ?? -1
        case "track-desc": case "track-asc": return `${resource.track_title} ${resource.subject_name} ${resource.chapter_title} ${resource.title}`
        case "type-asc": case "type-desc": return resource.resource_type
        default: return resource.title
      }
    },
    resourceSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const resourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Record<string, unknown> }) =>
      id ? api.put(`/courses/admin/resources/${id}`, payload) : api.post("/courses/admin/resources", payload),
    onSuccess: () => {
      toast.success(editingResourceId ? "Ressource mise a jour." : "Ressource creee.")
      setResourceForm(INITIAL_RESOURCE_FORM)
      setEditingResourceId(null)
      invalidate()
    },
    onError: (error) => toast.error(payloadError(error, "Enregistrement de la ressource impossible.")),
  })

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/resources/${id}`),
    onSuccess: () => { toast.success("Ressource supprimee."); invalidate() },
    onError: (error) => toast.error(payloadError(error, "Suppression de la ressource impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/resources/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} ressource(s) supprimee(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
    },
  })

  const saveResource = () => {
    const nextErrors = validateResourceForm(resourceForm)
    setResourceErrors(nextErrors)
    if (hasErrors(nextErrors)) { toast.error("Corrigez le formulaire ressource avant enregistrement"); return }
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
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Form */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">
            {editingResourceId ? "Modifier la ressource" : "Nouvelle ressource"}
          </CardTitle>
          <CardDescription>Attachez des PDFs, vidéos, exercices et corrections à un chapitre.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SelectField label="Chapitre" value={resourceForm.chapter_id} error={resourceErrors.chapter_id} onChange={(value) => setResourceForm((prev) => ({ ...prev, chapter_id: value }))}>
            <option value="">Sélectionner un chapitre</option>
            {chapters.map((chapter) => <option key={chapter.id} value={String(chapter.id)}>{chapter.track_title} · {chapter.subject_name} · {chapter.title}</option>)}
          </SelectField>
          <SelectField label="Type de ressource" value={resourceForm.resource_type} error={resourceErrors.resource_type} onChange={(value) => setResourceForm((prev) => ({ ...prev, resource_type: value as AdminResource["resource_type"] }))}>
            {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </SelectField>
          <TextField label="Titre" value={resourceForm.title} error={resourceErrors.title} onChange={(value) => setResourceForm((prev) => ({ ...prev, title: value }))} />

          {/* File upload */}
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
                  <button type="button" onClick={(e) => { e.stopPropagation(); setResourceForm((p) => ({ ...p, file_url: "" })); setUploadedFileName("") }} className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
              <TextField label="Durée (min)" type="number" value={resourceForm.duration_minutes} error={resourceErrors.duration_minutes} onChange={(value) => setResourceForm((prev) => ({ ...prev, duration_minutes: value }))} />
            )}
            <TextField label="Ordre d'affichage" type="number" value={resourceForm.display_order} error={resourceErrors.display_order} onChange={(value) => setResourceForm((prev) => ({ ...prev, display_order: value }))} />
          </div>
          <TextAreaField label="Description" value={resourceForm.description} error={resourceErrors.description} onChange={(value) => setResourceForm((prev) => ({ ...prev, description: value }))} />
          <SelectField label="Statut" value={resourceForm.is_published ? "1" : "0"} error={resourceErrors.is_published} onChange={(value) => setResourceForm((prev) => ({ ...prev, is_published: value === "1" }))}>
            <option value="1">Publié</option>
            <option value="0">Brouillon</option>
          </SelectField>
          <ActionButtons isPending={resourceMutation.isPending} onSubmit={saveResource} submitLabel={editingResourceId ? "Enregistrer la ressource" : "Créer la ressource"} onCancel={editingResourceId ? () => { setResourceForm(INITIAL_RESOURCE_FORM); setEditingResourceId(null) } : undefined} />
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-border/70 bg-white/85">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-bordeaux">Liste des ressources</CardTitle>
          <CardDescription>Tous les contenus attachés aux chapitres.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminListControls
            search={resourceSearch}
            onSearchChange={setResourceSearch}
            searchPlaceholder="Rechercher par titre, chapitre, matière ou filière"
            filters={[
              { label: "Filière", value: resourceTrackFilter, onChange: setResourceTrackFilter, options: [{ value: "all", label: "Toutes les filières" }, ...Array.from(new Set(tracks.map((t) => t.title))).map((title) => ({ value: title, label: title }))] },
              { label: "Type", value: resourceTypeFilter, onChange: setResourceTypeFilter, options: [{ value: "all", label: "Tous les types" }, ...RESOURCE_TYPES.map((type) => ({ value: type, label: type }))] },
              { label: "Statut", value: resourceStatusFilter, onChange: setResourceStatusFilter, options: [{ value: "all", label: "Tous les statuts" }, { value: "published", label: "Publié" }, { value: "draft", label: "Brouillon" }] },
            ]}
            sort={{ label: "Trier", value: resourceSortBy, onChange: setResourceSortBy, options: [{ value: "title-asc", label: "Titre A-Z" }, { value: "title-desc", label: "Titre Z-A" }, { value: "track-asc", label: "Filière A-Z" }, { value: "track-desc", label: "Filière Z-A" }, { value: "type-asc", label: "Type A-Z" }, { value: "type-desc", label: "Type Z-A" }, { value: "duration-desc", label: "Plus longue durée" }, { value: "duration-asc", label: "Plus courte durée" }] }}
          />
          <BulkActionBar count={bulkSelection.count} isPending={bulkDeleteMutation.isPending} onClear={bulkSelection.clear} onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }} />
          <DataTable
            headers={["Filière", "Chapitre", "Type", "Titre", "Actions"]}
            items={filteredResources}
            getId={(resource) => resource.id}
            selectedIds={bulkSelection.selectedIds}
            onToggle={bulkSelection.toggle}
            onToggleAll={() => bulkSelection.toggleAll(filteredResources.map((r) => r.id))}
            rows={filteredResources.map((resource) => [
              `${resource.track_title} · ${resource.subject_name}`,
              resource.chapter_title,
              resource.resource_type,
              <div key={`resource-${resource.id}`}>
                <div className="font-medium text-foreground">{resource.title}</div>
                <div className="text-xs text-muted-foreground">{resource.is_published ? "Publié" : "Brouillon"}</div>
              </div>,
              <div key={`resource-actions-${resource.id}`} className="flex flex-wrap gap-2">
                {iconButton("Modifier", <Pencil className="mr-2 h-4 w-4" />, () => {
                  setEditingResourceId(resource.id)
                  setResourceForm({ chapter_id: String(resource.chapter_id), resource_type: resource.resource_type, title: resource.title, description: resource.description ?? "", file_url: resource.file_url ?? "", external_url: resource.external_url ?? "", duration_minutes: resource.duration_minutes ? String(resource.duration_minutes) : "", display_order: String(resource.display_order ?? 0), is_published: Boolean(resource.is_published) })
                })}
                {iconButton("Supprimer", <Trash2 className="mr-2 h-4 w-4" />, () => deleteResourceMutation.mutate(resource.id), true)}
              </div>,
            ])}
          />
        </CardContent>
      </Card>
    </div>
  )
}
