import { Loader2, Trash2, X } from "lucide-react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"

// ── Generic multi-select state for admin list/table bulk actions ──────────────
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id))
      return allSelected ? new Set() : new Set(ids)
    })
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  return { selectedIds, toggle, toggleAll, clear, count: selectedIds.size }
}

// ── Floating bar shown once at least one row is selected ──────────────────────
export function BulkActionBar({
  count,
  onDelete,
  onClear,
  isPending,
  label = "sélectionné(s)",
  deleteLabel = "Supprimer la selection",
}: {
  count: number
  onDelete: () => void
  onClear: () => void
  isPending: boolean
  label?: string
  deleteLabel?: string
}) {
  if (count === 0) return null

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5">
      <span className="text-sm font-medium text-destructive">
        {count} {label}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="mr-1 h-3.5 w-3.5" /> Annuler
        </Button>
        <Button size="sm" variant="outline" className="border-destructive text-destructive" disabled={isPending} onClick={onDelete}>
          {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
          {deleteLabel} ({count})
        </Button>
      </div>
    </div>
  )
}

// ── Small checkbox used for header "select all" / row selection ───────────────
export function SelectCheckbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-4 w-4 cursor-pointer rounded border-input accent-bordeaux"
      onClick={(e) => e.stopPropagation()}
    />
  )
}

// ── Helper to build a confirm + bulk-delete handler from a list of ids ─────────
export function confirmBulkDelete(count: number, message = `Supprimer ${count} élément(s) sélectionné(s) ?`) {
  return window.confirm(message)
}
