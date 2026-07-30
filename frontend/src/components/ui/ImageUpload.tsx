import { useRef, useState } from "react"
import { Image, Loader2, X } from "lucide-react"
import api, { assetUrl } from "@/lib/api"
import { toast } from "sonner"

interface ImageUploadProps {
  value: string          // current url (http or /uploads/...)
  onChange: (url: string) => void
  label?: string
  placeholder?: string
}

export function ImageUpload({ value, onChange, label = "Image", placeholder }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const displaySrc = preview ?? (value ? assetUrl(value) : null)

  async function handleFile(file: File) {
    setUploading(true)
    setPreview(URL.createObjectURL(file))
    try {
      const fd = new FormData()
      fd.append("image", file)
      const { data } = await api.post<{ image_url: string }>("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      onChange(data.image_url)
      setPreview(null) // let assetUrl handle it from value
      toast.success("Image uploadée.")
    } catch {
      toast.error("Erreur lors de l'upload.")
      setPreview(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function clear() {
    onChange("")
    setPreview(null)
  }

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {displaySrc ? (
        <div className="relative w-full rounded-xl overflow-hidden border border-border group">
          <img src={displaySrc} alt="preview" className="w-full aspect-video object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
            >
              {uploading ? <><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Upload…</> : "Changer"}
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={uploading}
              className="rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-500 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-8 text-sm text-muted-foreground hover:border-bordeaux/50 hover:bg-bordeaux/5 transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <><Loader2 className="h-6 w-6 animate-spin text-bordeaux" /><span>Upload en cours…</span></>
          ) : (
            <><Image className="h-6 w-6" /><span>{placeholder ?? "Cliquer pour uploader une image"}</span><span className="text-xs">JPG, PNG, WebP · max 10 MB</span></>
          )}
        </button>
      )}
    </div>
  )
}
