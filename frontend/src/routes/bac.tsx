import { createFileRoute } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { ExternalLink, FileText, Filter, GraduationCap, FlaskConical, Cog, BarChart3, BookOpen, Monitor, Dumbbell } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

export const Route = createFileRoute("/bac")({
  component: BacPage,
})

// ─── Section definitions ──────────────────────────────────────────────────────

const BASE = "http://www.bacweb.tn"

type SectionId = "math" | "sciences_ex" | "technique" | "economie_gestion" | "lettre" | "informatique" | "sport"

interface SectionDef {
  id: SectionId
  label: string
  labelAr: string
  archiveUrl: string
  Icon: React.FC<{ className?: string }>
  color: string   // Tailwind color token suffix used in bg-/text-/border-
  hasControle: boolean
}

const SECTIONS: SectionDef[] = [
  {
    id: "math",
    label: "Mathématiques",
    labelAr: "رياضيات",
    archiveUrl: `${BASE}/mma.htm`,
    Icon: GraduationCap,
    color: "bordeaux",
    hasControle: true,
  },
  {
    id: "sciences_ex",
    label: "Sciences Exp.",
    labelAr: "علوم تجريبية",
    archiveUrl: `${BASE}/sma.htm`,
    Icon: FlaskConical,
    color: "blue",
    hasControle: true,
  },
  {
    id: "technique",
    label: "Technique",
    labelAr: "تقنية",
    archiveUrl: `${BASE}/tma.htm`,
    Icon: Cog,
    color: "slate",
    hasControle: true,
  },
  {
    id: "economie_gestion",
    label: "Éco & Gestion",
    labelAr: "اقتصاد وتصرف",
    archiveUrl: `${BASE}/ema.htm`,
    Icon: BarChart3,
    color: "emerald",
    hasControle: true,
  },
  {
    id: "lettre",
    label: "Lettres",
    labelAr: "آداب",
    archiveUrl: `${BASE}/lma.htm`,
    Icon: BookOpen,
    color: "amber",
    hasControle: false, // Lettre section has no Contrôle for Math
  },
  {
    id: "informatique",
    label: "Informatique",
    labelAr: "إعلامية",
    archiveUrl: `${BASE}/ima.htm`,
    Icon: Monitor,
    color: "violet",
    hasControle: true,
  },
  {
    id: "sport",
    label: "Sport",
    labelAr: "رياضة",
    archiveUrl: `${BASE}/pma.htm`,
    Icon: Dumbbell,
    color: "orange",
    hasControle: true,
  },
]

// ─── Data catalog for Math (fully accurate - scraped from bacweb.tn) ──────────

interface BacSession {
  sujet: string | null
  corrige: string | null
}

interface BacEntry {
  year: number
  principale: BacSession
  controle: BacSession
}

const MATH_DATA: BacEntry[] = [
  { year: 2025, principale: { sujet: `${BASE}/bac/2025/principale/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/2025/controle/math/math.pdf`, corrige: null } },
  { year: 2024, principale: { sujet: `${BASE}/bac/2024/principale/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/2024/controle/math/math.pdf`, corrige: null } },
  { year: 2023, principale: { sujet: `${BASE}/bac/2023/principale/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/2023/controle/math/math.pdf`, corrige: null } },
  { year: 2022, principale: { sujet: `${BASE}/bac/2022/principale/math/math.pdf`, corrige: `${BASE}/bac/2022/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2022/controle/math/math.pdf`, corrige: `${BASE}/bac/2022/controle/math/math_c.pdf` } },
  { year: 2021, principale: { sujet: `${BASE}/bac/2021/principale/math/math.pdf`, corrige: `${BASE}/bac/2021/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2021/controle/math/math.pdf`, corrige: `${BASE}/bac/2021/controle/math/math_c.pdf` } },
  { year: 2020, principale: { sujet: `${BASE}/bac/2020/principale/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/2020/controle/math/math.pdf`, corrige: null } },
  { year: 2019, principale: { sujet: `${BASE}/bac/2019/principale/math/math.pdf`, corrige: `${BASE}/bac/2019/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2019/controle/math/math.pdf`, corrige: `${BASE}/bac/2019/controle/math/math_c.pdf` } },
  { year: 2018, principale: { sujet: `${BASE}/bac/2018/principale/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/2018/controle/math/math.pdf`, corrige: null } },
  { year: 2017, principale: { sujet: `${BASE}/bac/2017/principale/math/math.pdf`, corrige: `${BASE}/bac/2017/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2017/controle/math/math.pdf`, corrige: `${BASE}/bac/2017/controle/math/math_c.pdf` } },
  { year: 2016, principale: { sujet: `${BASE}/bac/2016/principale/math/math.pdf`, corrige: `${BASE}/bac/2016/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2016/controle/math/math.pdf`, corrige: `${BASE}/bac/2016/controle/math/math_c.pdf` } },
  { year: 2015, principale: { sujet: `${BASE}/bac/2015/principale/math/math.pdf`, corrige: `${BASE}/bac/2015/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2015/controle/math/math.pdf`, corrige: `${BASE}/bac/2015/controle/math/math_c.pdf` } },
  { year: 2014, principale: { sujet: `${BASE}/bac/2014/principale/math/math.pdf`, corrige: `${BASE}/bac/2014/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2014/controle/math/math.pdf`, corrige: `${BASE}/bac/2014/controle/math/math_c.pdf` } },
  { year: 2013, principale: { sujet: `${BASE}/bac/2013/principale/math/math.pdf`, corrige: `${BASE}/bac/2013/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2013/controle/math/math.pdf`, corrige: `${BASE}/bac/2013/controle/math/math_c.pdf` } },
  { year: 2012, principale: { sujet: `${BASE}/bac/2012/principale/math/math.pdf`, corrige: `${BASE}/bac/2012/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2012/controle/math/math.pdf`, corrige: `${BASE}/bac/2012/controle/math/math_c.pdf` } },
  { year: 2011, principale: { sujet: `${BASE}/bac/2011/principale/math/math.pdf`, corrige: `${BASE}/bac/2011/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2011/controle/math/math.pdf`, corrige: `${BASE}/bac/2011/controle/math/math_c.pdf` } },
  { year: 2010, principale: { sujet: `${BASE}/bac/2010/principale/math/math.pdf`, corrige: `${BASE}/bac/2010/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2010/controle/math/math.pdf`, corrige: null } },
  { year: 2009, principale: { sujet: `${BASE}/bac/2009/principale/math/math.pdf`, corrige: `${BASE}/bac/2009/principale/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/2009/controle/math/math.pdf`, corrige: `${BASE}/bac/2009/controle/math/math_c.pdf` } },
  { year: 2008, principale: { sujet: `${BASE}/bac/principale2008/NR/math/math.pdf`, corrige: `${BASE}/bac/principale2008/NR/math/math_c.pdf` }, controle: { sujet: `${BASE}/bac/controle2008/NR/math/math.pdf`, corrige: `${BASE}/bac/controle2008/NR/math/math_c.pdf` } },
  { year: 2007, principale: { sujet: `${BASE}/bac/principale2007/math/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/bac/controle2007/math/math.pdf`, corrige: null } },
  { year: 2006, principale: { sujet: `${BASE}/math/mathematiques/2006/principale/enonce/math.pdf`, corrige: `${BASE}/math/mathematiques/2006/principale/corrige/math.pdf` }, controle: { sujet: `${BASE}/math/mathematiques/2006/controle/enonce/math.pdf`, corrige: `${BASE}/math/mathematiques/2006/controle/corrige/math.pdf` } },
  { year: 2005, principale: { sujet: `${BASE}/math/mathematiques/2005/principale/enonce/math.pdf`, corrige: `${BASE}/math/mathematiques/2005/principale/corrige/math_corriges.pdf` }, controle: { sujet: `${BASE}/math/mathematiques/2005/controle/enonce/math.pdf`, corrige: `${BASE}/math/mathematiques/2005/controle/corrige/math.pdf` } },
  { year: 2004, principale: { sujet: `${BASE}/math/mathematiques/2004/principale/enonce/math.pdf`, corrige: null }, controle: { sujet: `${BASE}/math/mathematiques/2004/controle/enonce/math.pdf`, corrige: null } },
  { year: 2003, principale: { sujet: `${BASE}/math/mathematiques/2003/principale/enonce/mma03pe.htm`, corrige: `${BASE}/math/mathematiques/2003/principale/corrige/mma03pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/2003/controle/enonce/mma03ce.htm`, corrige: `${BASE}/math/mathematiques/2003/controle/corrige/mma03cc1.htm` } },
  { year: 2002, principale: { sujet: `${BASE}/math/mathematiques/2002/principale/enonce/mma02pe.htm`, corrige: `${BASE}/math/mathematiques/2002/principale/corrige/mma02pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/2002/controle/enonce/mma02ce.htm`, corrige: `${BASE}/math/mathematiques/2002/controle/corrige/mma02cc1.htm` } },
  { year: 2001, principale: { sujet: `${BASE}/math/mathematiques/2001/principale/enonce/mma01pe.htm`, corrige: `${BASE}/math/mathematiques/2001/principale/corrige/mma01pc2.htm` }, controle: { sujet: `${BASE}/math/mathematiques/2001/controle/enonce/mma01ce.htm`, corrige: `${BASE}/math/mathematiques/2001/controle/corrige/mma01cc1.htm` } },
  { year: 2000, principale: { sujet: `${BASE}/math/mathematiques/2000/principale/enonce/mma00pe.htm`, corrige: null }, controle: { sujet: `${BASE}/math/mathematiques/2000/controle/enonce/mma00ce.htm`, corrige: null } },
  { year: 1999, principale: { sujet: `${BASE}/math/mathematiques/1999/principale/enonce/mma99pe.htm`, corrige: `${BASE}/math/mathematiques/1999/principale/corrige/mma99pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1999/controle/enonce/mma99ce.htm`, corrige: `${BASE}/math/mathematiques/1999/controle/corrige/mma99cc1.htm` } },
  { year: 1998, principale: { sujet: `${BASE}/math/mathematiques/1998/principale/enonce/mma98pe.htm`, corrige: `${BASE}/math/mathematiques/1998/principale/corrige/mma98pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1998/controle/enonce/mma98ce.htm`, corrige: `${BASE}/math/mathematiques/1998/controle/corrige/mma98cc1.htm` } },
  { year: 1997, principale: { sujet: `${BASE}/math/mathematiques/1997/principale/enonce/mma97pe.htm`, corrige: `${BASE}/math/mathematiques/1997/principale/corrige/mma97pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1997/controle/enonce/mma97ce.htm`, corrige: `${BASE}/math/mathematiques/1997/controle/corrige/mma97cc1.htm` } },
  { year: 1996, principale: { sujet: `${BASE}/math/mathematiques/1996/principale/enonce/mma96pe.htm`, corrige: `${BASE}/math/mathematiques/1996/principale/corrige/mma96pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1996/controle/enonce/mma96ce.htm`, corrige: `${BASE}/math/mathematiques/1996/controle/corrige/mma96cc1.htm` } },
  { year: 1995, principale: { sujet: `${BASE}/math/mathematiques/1995/principale/enonce/mma95pe.htm`, corrige: `${BASE}/math/mathematiques/1995/principale/corrige/mma95pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1995/controle/enonce/mma95ce.htm`, corrige: `${BASE}/math/mathematiques/1995/controle/corrige/mma95cc1.htm` } },
  { year: 1994, principale: { sujet: `${BASE}/math/mathematiques/1994/principale/enonce/mma94pe.htm`, corrige: `${BASE}/math/mathematiques/1994/principale/corrige/mma94pc1.htm` }, controle: { sujet: `${BASE}/math/mathematiques/1994/controle/enonce/mma94ce.htm`, corrige: null } },
]

// Years available in the modern (2007+) uniform URL format for non-Math sections
const MODERN_YEARS = Array.from({ length: 2025 - 2007 + 1 }, (_, i) => 2025 - i)

function getModernEntry(year: number, sectionId: SectionId, hasControle: boolean): BacEntry {
  if (year >= 2009) {
    return {
      year,
      principale: {
        sujet:   `${BASE}/bac/${year}/principale/${sectionId}/math.pdf`,
        corrige: `${BASE}/bac/${year}/principale/${sectionId}/math_c.pdf`,
      },
      controle: hasControle
        ? {
            sujet:   `${BASE}/bac/${year}/controle/${sectionId}/math.pdf`,
            corrige: `${BASE}/bac/${year}/controle/${sectionId}/math_c.pdf`,
          }
        : { sujet: null, corrige: null },
    }
  }
  if (year === 2008) {
    return {
      year,
      principale: {
        sujet:   `${BASE}/bac/principale2008/NR/${sectionId}/math.pdf`,
        corrige: `${BASE}/bac/principale2008/NR/${sectionId}/math_c.pdf`,
      },
      controle: hasControle
        ? {
            sujet:   `${BASE}/bac/controle2008/NR/${sectionId}/math.pdf`,
            corrige: `${BASE}/bac/controle2008/NR/${sectionId}/math_c.pdf`,
          }
        : { sujet: null, corrige: null },
    }
  }
  // 2007
  return {
    year,
    principale: {
      sujet:   `${BASE}/bac/principale2007/${sectionId}/math.pdf`,
      corrige: null,
    },
    controle: hasControle
      ? { sujet: `${BASE}/bac/controle2007/${sectionId}/math.pdf`, corrige: null }
      : { sujet: null, corrige: null },
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FileLink({ url, label, tentative }: { url: string; label: string; tentative?: boolean }) {
  const isPdf = url.endsWith(".pdf")
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tentative ? "Ce fichier peut ne pas être disponible pour toutes les années" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all shadow-sm ${
        tentative
          ? "border-muted-foreground/30 bg-muted/40 text-muted-foreground hover:bg-bordeaux/10 hover:border-bordeaux/40 hover:text-bordeaux"
          : "border-bordeaux/25 bg-bordeaux/5 text-bordeaux hover:bg-bordeaux hover:text-white hover:border-bordeaux"
      }`}
    >
      {isPdf ? <FileText className="h-3 w-3 flex-shrink-0" /> : <ExternalLink className="h-3 w-3 flex-shrink-0" />}
      {label}
    </a>
  )
}

type SessionFilter = "both" | "principale" | "controle"
type DecadeFilter  = "all" | "2020s" | "2010s" | "2000s" | "1990s"

// ─── Page component ───────────────────────────────────────────────────────────

function BacPage() {
  const { isRTL } = useLanguage()
  const [sectionId, setSectionId]     = useState<SectionId>("math")
  const [session, setSession]         = useState<SessionFilter>("both")
  const [decade, setDecade]           = useState<DecadeFilter>("all")

  const section = SECTIONS.find(s => s.id === sectionId)!

  // Pick data source: Math uses exact catalog, others use dynamic URL generation
  const allEntries: BacEntry[] = useMemo(() => {
    if (sectionId === "math") return MATH_DATA
    return MODERN_YEARS.map(y => getModernEntry(y, sectionId, section.hasControle))
  }, [sectionId, section.hasControle])

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (decade === "2020s" && e.year < 2020) return false
      if (decade === "2010s" && (e.year < 2010 || e.year >= 2020)) return false
      if (decade === "2000s" && (e.year < 2000 || e.year >= 2010)) return false
      if (decade === "1990s" && e.year >= 2000) return false
      return true
    })
  }, [allEntries, decade])

  // Color classes per section
  const sectionColors: Record<SectionId, { pill: string; active: string }> = {
    math:              { pill: "border-bordeaux/30 text-bordeaux hover:bg-bordeaux/10",             active: "bg-bordeaux text-white border-bordeaux" },
    sciences_ex:       { pill: "border-blue-300 text-blue-700 hover:bg-blue-50",                    active: "bg-blue-600 text-white border-blue-600" },
    technique:         { pill: "border-slate-300 text-slate-700 hover:bg-slate-50",                 active: "bg-slate-600 text-white border-slate-600" },
    economie_gestion:  { pill: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",           active: "bg-emerald-600 text-white border-emerald-600" },
    lettre:            { pill: "border-amber-300 text-amber-700 hover:bg-amber-50",                 active: "bg-amber-600 text-white border-amber-600" },
    informatique:      { pill: "border-violet-300 text-violet-700 hover:bg-violet-50",              active: "bg-violet-600 text-white border-violet-600" },
    sport:             { pill: "border-orange-300 text-orange-700 hover:bg-orange-50",              active: "bg-orange-500 text-white border-orange-500" },
  }

  const isMath = sectionId === "math"

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-b from-amber-50/40 to-background">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-bordeaux via-bordeaux/95 to-[#5a0f1e] py-12 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full border-2 border-gold" />
        </div>
        <div className="relative container mx-auto px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            Baccalauréat Tunisien
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            Épreuves du Bac — <span className="text-gold">Mathématiques</span>
          </h1>
          <p className="text-white/65 text-sm max-w-lg mx-auto">
            Sujets & corrigés · Toutes sections · Session principale & contrôle · 1994–2025
          </p>
        </div>
      </div>

      {/* ── Section picker ────────────────────────────────────────────────────── */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Section</p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => {
              const isActive = sectionId === s.id
              const colors = sectionColors[s.id]
              return (
                <button
                  key={s.id}
                  onClick={() => { setSectionId(s.id); setSession("both"); setDecade("all") }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                    isActive ? colors.active : `bg-background ${colors.pill}`
                  }`}
                >
                  <s.Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.label.split(" ")[0]}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Session */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
            {(["both","principale","controle"] as SessionFilter[])
              .filter(s => s !== "controle" || section.hasControle)
              .map((s) => (
              <button
                key={s}
                onClick={() => setSession(s)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${session === s ? "bg-bordeaux text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s === "both" ? "Toutes" : s === "principale" ? "Principale" : "Contrôle"}
              </button>
            ))}
          </div>

          {/* Decade */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
            {(["all","2020s","2010s","2000s"] as DecadeFilter[])
              .concat(isMath ? ["1990s" as DecadeFilter] : [])
              .map((d) => (
              <button
                key={d}
                onClick={() => setDecade(d)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${decade === d ? "bg-bordeaux text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {d === "all" ? "Toutes" : d}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} année{filtered.length !== 1 ? "s" : ""}</span>

          {/* Archive link */}
          <a
            href={section.archiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-bordeaux transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Archive bacweb.tn
          </a>
        </div>
      </div>

      {/* ── Non-math note ─────────────────────────────────────────────────────── */}
      {!isMath && (
        <div className="container mx-auto px-4 pt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">ⓘ</span>
            <span>
              Les liens <span className="font-semibold">Sujet</span> sont disponibles pour toutes les années listées.
              Les corrigés (<span className="font-semibold italic">grisés</span>) peuvent ne pas exister pour certaines années — consultez{" "}
              <a href={section.archiveUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">bacweb.tn</a> pour vérifier.
            </span>
          </div>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`grid border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-widest text-muted-foreground ${
            session === "both" ? "grid-cols-[80px_1fr_1fr] md:grid-cols-[100px_1fr_1fr]" : "grid-cols-[80px_1fr] md:grid-cols-[100px_1fr]"
          }`}>
            <div className="px-4 py-3">Année</div>
            {(session === "both" || session === "principale") && (
              <div className="px-4 py-3 border-l border-border">Session Principale</div>
            )}
            {(session === "both" || session === "controle") && section.hasControle && (
              <div className="px-4 py-3 border-l border-border">Session Contrôle</div>
            )}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              Aucune épreuve ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <div
                key={entry.year}
                className={`grid border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20 ${
                  session === "both" ? "grid-cols-[80px_1fr_1fr] md:grid-cols-[100px_1fr_1fr]" : "grid-cols-[80px_1fr] md:grid-cols-[100px_1fr]"
                } ${idx % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
              >
                {/* Year */}
                <div className="flex items-center px-4 py-3">
                  <span className="font-display text-lg font-bold text-bordeaux tabular-nums">{entry.year}</span>
                </div>

                {/* Principale */}
                {(session === "both" || session === "principale") && (
                  <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-l border-border/40">
                    {entry.principale.sujet ? (
                      <FileLink url={entry.principale.sujet} label="Sujet" />
                    ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    {entry.principale.corrige && (
                      <FileLink url={entry.principale.corrige} label="Corrigé" tentative={!isMath} />
                    )}
                    {!isMath && entry.principale.sujet && !entry.principale.corrige && (
                      <FileLink
                        url={`${BASE}/bac/${entry.year}/principale/${sectionId}/math_c.pdf`}
                        label="Corrigé"
                        tentative
                      />
                    )}
                  </div>
                )}

                {/* Contrôle */}
                {(session === "both" || session === "controle") && section.hasControle && (
                  <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-l border-border/40">
                    {entry.controle.sujet ? (
                      <FileLink url={entry.controle.sujet} label="Sujet" />
                    ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    {entry.controle.corrige && (
                      <FileLink url={entry.controle.corrige} label="Corrigé" tentative={!isMath} />
                    )}
                    {!isMath && entry.controle.sujet && !entry.controle.corrige && (
                      <FileLink
                        url={`${BASE}/bac/${entry.year}/controle/${sectionId}/math_c.pdf`}
                        label="Corrigé"
                        tentative
                      />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Source note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Documents fournis par{" "}
          <a href="http://www.bacweb.tn" target="_blank" rel="noopener noreferrer" className="font-medium text-bordeaux hover:underline">
            bacweb.tn
          </a>{" "}
          — Centre National des Technologies en Éducation (CNTE)
        </p>
      </div>
    </div>
  )
}
