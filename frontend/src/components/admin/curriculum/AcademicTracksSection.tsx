import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Pencil, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminListControls } from "@/components/admin/AdminListControls"
import { BulkActionBar, confirmBulkDelete, useBulkSelection } from "@/components/admin/BulkSelection"
import api from "@/lib/api"
import { AdminTrack, DataTable, matchesSearch, payloadError, sortItems } from "./shared"

type Props = { tracks: AdminTrack[] }

export function AcademicTracksSection({ tracks }: Props) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-curriculum"] })

  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [trackEditForm, setTrackEditForm] = useState({ title: "", description: "", display_order: "0", is_active: true })
  const [trackSearch, setTrackSearch] = useState("")
  const [trackCycleFilter, setTrackCycleFilter] = useState("all")
  const [trackStatusFilter, setTrackStatusFilter] = useState("all")
  const [trackSortBy, setTrackSortBy] = useState("title-asc")

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
        default:
          return track.title
      }
    },
    trackSortBy.endsWith("desc") ? "desc" : "asc"
  )

  const updateTrackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      api.put(`/courses/admin/tracks/${id}`, payload),
    onSuccess: () => { toast.success("Filière mise à jour."); setEditingTrackId(null); invalidate() },
    onError: (e) => toast.error(payloadError(e, "Mise à jour impossible.")),
  })

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/tracks/${id}`),
    onSuccess: () => { toast.success("Filière supprimée."); invalidate() },
    onError: (e) => toast.error(payloadError(e, "Suppression impossible.")),
  })

  const toggleTrackMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/courses/admin/tracks/${id}/toggle`),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(payloadError(e, "Changement de statut impossible.")),
  })

  const bulkSelection = useBulkSelection()
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/courses/admin/tracks/${id}`)))
      return results.filter((r) => r.status === "rejected").length
    },
    onSuccess: (failedCount, ids) => {
      const okCount = ids.length - failedCount
      if (okCount > 0) toast.success(`${okCount} filière(s) supprimée(s).`)
      if (failedCount > 0) toast.error(`${failedCount} suppression(s) ont échoué.`)
      bulkSelection.clear()
      invalidate()
    },
  })

  return (
    <div className="space-y-4">
      <AdminListControls
        search={trackSearch}
        onSearchChange={setTrackSearch}
        searchPlaceholder="Rechercher filières, niveaux ou sections"
        filters={[
          { label: "Cycle", value: trackCycleFilter, onChange: setTrackCycleFilter, options: [{ value: "all", label: "Tous les cycles" }, { value: "college", label: "Collège" }, { value: "lycee", label: "Lycée" }] },
          { label: "Statut", value: trackStatusFilter, onChange: setTrackStatusFilter, options: [{ value: "all", label: "Tous les statuts" }, { value: "active", label: "Actif" }, { value: "inactive", label: "Inactif" }] },
        ]}
        sort={{ label: "Trier", value: trackSortBy, onChange: setTrackSortBy, options: [{ value: "title-asc", label: "Filière A-Z" }, { value: "title-desc", label: "Filière Z-A" }, { value: "order-asc", label: "Ordre asc" }, { value: "order-desc", label: "Ordre desc" }] }}
      />
      <BulkActionBar
        count={bulkSelection.count}
        isPending={bulkDeleteMutation.isPending}
        onClear={bulkSelection.clear}
        onDelete={() => { if (confirmBulkDelete(bulkSelection.count)) bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds)) }}
      />
      <DataTable
        headers={["Filière", "Cycle", "Niveau", "Section", "Statut", "Actions"]}
        items={filteredTracks}
        getId={(track) => track.id}
        selectedIds={bulkSelection.selectedIds}
        onToggle={bulkSelection.toggle}
        onToggleAll={() => bulkSelection.toggleAll(filteredTracks.map((t) => t.id))}
        rows={filteredTracks.map((track) => [
          editingTrackId === track.id ? (
            <div key={`edit-${track.id}`} className="space-y-2 py-1">
              <Input value={trackEditForm.title} onChange={e => setTrackEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre" className="h-8 text-sm" />
              <Input value={trackEditForm.description} onChange={e => setTrackEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="h-8 text-sm" />
              <Input type="number" value={trackEditForm.display_order} onChange={e => setTrackEditForm(p => ({ ...p, display_order: e.target.value }))} placeholder="Ordre" className="h-8 text-sm w-24" />
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
    </div>
  )
}
