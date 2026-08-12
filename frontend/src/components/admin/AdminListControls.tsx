import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ControlOption = {
  label: string
  value: string
}

type ControlSelect = {
  label: string
  onChange: (value: string) => void
  options: ControlOption[]
  value: string
}

type AdminListControlsProps = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: ControlSelect[]
  sort?: ControlSelect
}

export function AdminListControls({ search, onSearchChange, searchPlaceholder = "Rechercher...", filters = [], sort }: AdminListControlsProps) {
  return (
    <div className="mb-4 grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1.5 xl:col-span-2">
        <Label>Rechercher</Label>
        <Input value={search} placeholder={searchPlaceholder} onChange={(event) => onSearchChange(event.target.value)} />
      </div>

      {filters.map((filter) => (
        <div key={filter.label} className="space-y-1.5">
          <Label>{filter.label}</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      ))}

      {sort ? (
        <div className="space-y-1.5">
          <Label>{sort.label}</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={sort.value} onChange={(event) => sort.onChange(event.target.value)}>
            {sort.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}