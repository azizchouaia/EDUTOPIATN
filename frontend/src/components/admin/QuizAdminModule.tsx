import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, CheckCircle2, ChevronDown, ChevronUp, FileUp, Loader2,
  Pencil, Plus, Search, Sparkles, Trash2, X, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { AdminPageIntro } from "@/routes/admin";

// ── Types ────────────────────────────────────────────────────────────────────
type Chapter  = { id: number; title: string; track_title: string; subject_name: string };
type Question = { id: number; chapter_id: number; question: string; options: string[]; correct_index: number; explanation: string | null; is_active: number };
type Draft    = { question: string; options: string[]; correct_index: number; explanation: string };

const EMPTY: Draft = { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" };

// ── Math symbol keyboard ─────────────────────────────────────────────────────
const MATH_CATEGORIES: Record<string, string[]> = {
  "Grec":       ["π", "α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "σ", "τ", "φ", "ω", "Σ", "Δ", "Ω", "Π"],
  "Opérateurs": ["×", "÷", "±", "≠", "≤", "≥", "≈", "∝", "∞", "≡", "∼", "∓"],
  "Puissances": ["²", "³", "⁴", "⁻¹", "√", "∛", "½", "⅓", "¼", "⅔", "¾"],
  "Algèbre":    ["∑", "∏", "∫", "∂", "∇", "∮", "∆", "∀", "∃", "∄"],
  "Ensembles":  ["∈", "∉", "⊂", "⊄", "⊃", "∪", "∩", "∅", "ℝ", "ℕ", "ℤ", "ℚ"],
  "Logique":    ["⟹", "⟺", "¬", "∧", "∨", "→", "↔", "↑", "↓"],
  "Géométrie":  ["°", "∠", "⊥", "∥", "△", "□", "⊙", "∶", "∷"],
};

// LaTeX formula templates — label shown on button, latex inserted at cursor
// Wrap with \( \) for inline or \[ \] for display block
type LatexTemplate = { label: string; latex: string; title: string };

const LATEX_TEMPLATES: LatexTemplate[] = [
  // Intégrales
  { label: "∫",        latex: "\\(\\int_{a}^{b} f(x)\\,dx\\)",          title: "Intégrale définie" },
  { label: "∫∞",       latex: "\\(\\int_{-\\infty}^{+\\infty} f(x)\\,dx\\)", title: "Intégrale impropre" },
  { label: "∮",        latex: "\\(\\oint_{C} f(z)\\,dz\\)",              title: "Intégrale de contour" },
  // Sommes & Produits
  { label: "Σ",        latex: "\\(\\sum_{k=0}^{n} a_k\\)",              title: "Somme" },
  { label: "Σ∞",       latex: "\\(\\sum_{n=0}^{+\\infty} u_n\\)",       title: "Série" },
  { label: "Π",        latex: "\\(\\prod_{k=1}^{n} a_k\\)",             title: "Produit" },
  // Limites
  { label: "lim",      latex: "\\(\\lim_{x \\to a} f(x)\\)",            title: "Limite en a" },
  { label: "lim∞",     latex: "\\(\\lim_{x \\to +\\infty} f(x)\\)",     title: "Limite à +∞" },
  { label: "lim 0⁺",   latex: "\\(\\lim_{x \\to 0^+} f(x)\\)",         title: "Limite à droite en 0" },
  // Fractions & Dérivées
  { label: "a/b",      latex: "\\(\\frac{a}{b}\\)",                      title: "Fraction" },
  { label: "d/dx",     latex: "\\(\\frac{d}{dx} f(x)\\)",               title: "Dérivée" },
  { label: "∂/∂x",     latex: "\\(\\frac{\\partial f}{\\partial x}\\)",  title: "Dérivée partielle" },
  { label: "f''",      latex: "\\(f''(x)\\)",                            title: "Dérivée seconde" },
  // Racines
  { label: "√x",       latex: "\\(\\sqrt{x}\\)",                         title: "Racine carrée" },
  { label: "ⁿ√x",      latex: "\\(\\sqrt[n]{x}\\)",                      title: "Racine n-ième" },
  // Puissances & Exposants
  { label: "eˣ",       latex: "\\(e^{x}\\)",                             title: "Exponentielle" },
  { label: "eⁱˣ",      latex: "\\(e^{i\\theta}\\)",                      title: "Exponentielle complexe" },
  { label: "xⁿ",       latex: "\\(x^{n}\\)",                             title: "Puissance" },
  { label: "aₙ",       latex: "\\(a_{n}\\)",                             title: "Terme général" },
  // Fonctions courantes
  { label: "sin",      latex: "\\(\\sin(x)\\)",                          title: "Sinus" },
  { label: "cos",      latex: "\\(\\cos(x)\\)",                          title: "Cosinus" },
  { label: "tan",      latex: "\\(\\tan(x)\\)",                          title: "Tangente" },
  { label: "ln",       latex: "\\(\\ln(x)\\)",                           title: "Logarithme naturel" },
  { label: "log",      latex: "\\(\\log_{a}(x)\\)",                      title: "Logarithme base a" },
  // Vecteurs
  { label: "v⃗",        latex: "\\(\\vec{v}\\)",                          title: "Vecteur" },
  { label: "AB⃗",       latex: "\\(\\overrightarrow{AB}\\)",              title: "Vecteur AB" },
  { label: "|v|",      latex: "\\(\\|\\vec{v}\\|\\)",                    title: "Norme" },
  // Équations bloc (display)
  { label: "[∫]",      latex: "\\[\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)\\]", title: "Formule Newton-Leibniz (bloc)" },
  { label: "[Σ]",      latex: "\\[\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\\]",  title: "Somme Gauss (bloc)" },
  { label: "[lim]",    latex: "\\[\\lim_{n \\to +\\infty} u_n = L\\]",         title: "Limite (bloc)" },
  { label: "[frac]",   latex: "\\[\\frac{a}{b} + \\frac{c}{d} = \\frac{ad+bc}{bd}\\]", title: "Fraction (bloc)" },
];

function MathKeyboard({ onInsert }: { onInsert: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("Grec");
  const allCats = [...Object.keys(MATH_CATEGORIES), "Formules LaTeX"];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors
          ${open ? "border-bordeaux bg-bordeaux/10 text-bordeaux" : "border-border text-muted-foreground hover:border-bordeaux/40 hover:text-bordeaux"}`}
        title="Clavier mathématique"
      >
        <Calculator className="h-3.5 w-3.5" />
        Symboles math
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[560px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-elegant">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {allCats.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors
                  ${cat === c ? "bg-bordeaux text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {c}
              </button>
            ))}
          </div>

          {cat === "Formules LaTeX" ? (
            /* LaTeX template grid */
            <div className="p-3">
              <p className="mb-2 text-[11px] text-muted-foreground">
                Insère une formule complète — utilise <code className="bg-muted px-1 rounded text-[10px]">\( \)</code> pour inline, <code className="bg-muted px-1 rounded text-[10px]">\[ \]</code> pour bloc centré.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LATEX_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => onInsert(t.latex)}
                    title={t.title}
                    className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground transition-all hover:border-bordeaux hover:bg-bordeaux/10 hover:text-bordeaux active:scale-95"
                  >
                    {t.label}
                    <span className="text-[10px] text-muted-foreground font-sans">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Symbol grid */
            <div className="flex flex-wrap gap-1 p-3">
              {(MATH_CATEGORIES[cat] ?? []).map(sym => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onInsert(sym)}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border bg-background font-mono text-base text-foreground transition-all hover:border-bordeaux hover:bg-bordeaux/10 hover:text-bordeaux active:scale-95"
                  title={sym}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Clique sur un symbole → inséré à la position du curseur dans le champ actif
          </p>
        </div>
      )}
    </div>
  );
}

// ── Insert symbol at cursor in a React-controlled input/textarea ─────────────
function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement, symbol: string) {
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd   ?? el.value.length;
  const newValue = el.value.slice(0, start) + symbol + el.value.slice(end);

  // Use native setter so React synthetic onChange fires
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, newValue);
  el.dispatchEvent(new Event("input", { bubbles: true }));

  // Restore cursor after React re-render
  const newPos = start + symbol.length;
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = newPos;
  });
}

// ── PDF review panel ─────────────────────────────────────────────────────────
function PdfReviewPanel({
  drafts,
  onSave,
  onClose,
  isSaving,
}: {
  drafts: Draft[];
  onSave: (selected: Draft[]) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [selected, setSelected] = useState<boolean[]>(() => drafts.map(() => true));
  const toggle = (i: number) => setSelected(s => s.map((v, j) => (j === i ? !v : v)));
  const toggleAll = () => {
    const allOn = selected.every(Boolean);
    setSelected(drafts.map(() => !allOn));
  };
  const count = selected.filter(Boolean).length;

  return (
    <Card className="border-gold/40 bg-gold/5">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{drafts.length} question{drafts.length !== 1 ? "s" : ""} extraites depuis le PDF</p>
            <p className="text-xs text-muted-foreground mt-0.5">Coche celles que tu veux enregistrer, corrige si nécessaire</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Select all */}
        <button type="button" onClick={toggleAll} className="text-xs text-bordeaux hover:underline">
          {selected.every(Boolean) ? "Tout désélectionner" : "Tout sélectionner"}
        </button>

        {/* Draft list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {drafts.map((d, i) => (
            <div key={i} className={`rounded-xl border p-4 transition-colors ${selected[i] ? "border-bordeaux/40 bg-white dark:bg-card" : "border-border opacity-50"}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border text-white transition-colors
                    ${selected[i] ? "border-bordeaux bg-bordeaux" : "border-border bg-transparent"}`}
                >
                  {selected[i] && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{i + 1}. {d.question}</p>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {d.options.map((opt, idx) => (
                      <p key={idx} className={`text-xs ${idx === d.correct_index ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {idx === d.correct_index ? "✓ " : ""}{String.fromCharCode(65 + idx)}. {opt}
                      </p>
                    ))}
                  </div>
                  {d.explanation && <p className="mt-1.5 text-xs text-muted-foreground italic">{d.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
            disabled={count === 0 || isSaving}
            onClick={() => onSave(drafts.filter((_, i) => selected[i]))}
          >
            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
            Enregistrer {count} question{count !== 1 ? "s" : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main module ───────────────────────────────────────────────────────────────
export function QuizAdminModule() {
  const queryClient   = useQueryClient();
  const [chapterId, setChapterId]   = useState<number | null>(null);
  const [editing, setEditing]       = useState<Draft & { id?: number } | null>(null);
  const [search, setSearch]         = useState("");
  const [pdfDrafts, setPdfDrafts]   = useState<Draft[] | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Ref to the currently focused input/textarea for math keyboard insertion
  const activeElRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: curriculum } = useQuery<{ chapters: Chapter[] }>({
    queryKey: ["admin-curriculum-quiz"],
    queryFn: async () => (await api.get("/courses/admin/curriculum")).data,
  });
  const chapters = curriculum?.chapters ?? [];

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ["admin-quiz-questions", chapterId],
    queryFn: async () => (await api.get<Question[]>(`/courses/admin/quiz-questions?chapter_id=${chapterId}`)).data,
    enabled: chapterId != null,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["admin-quiz-questions", chapterId] }),
    [queryClient, chapterId]
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (d: Draft & { id?: number }) => {
      if (d.id) return api.put(`/courses/admin/quiz-questions/${d.id}`, { ...d, is_active: 1 });
      return api.post(`/courses/admin/quiz-questions`, { ...d, chapter_id: chapterId });
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.success("Question enregistrée."); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Enregistrement impossible."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/admin/quiz-questions/${id}`),
    onSuccess: () => { invalidate(); toast.success("Question supprimée."); },
  });

  const generateMutation = useMutation({
    mutationFn: async () => (await api.post(`/courses/admin/quiz-generate`, { chapter_id: chapterId, count: 10 })).data,
    onSuccess: async (data: { questions: Draft[] }) => {
      let ok = 0;
      for (const q of data.questions) {
        try { await api.post(`/courses/admin/quiz-questions`, { ...q, chapter_id: chapterId }); ok++; } catch { /* skip */ }
      }
      invalidate();
      toast.success(`${ok} questions générées par Khlayel — relis-les avant de publier.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Génération impossible."),
  });

  // ── PDF upload handler ─────────────────────────────────────────────────────
  async function handlePdfUpload(file: File) {
    if (!chapterId) { toast.error("Sélectionne un chapitre d'abord."); return; }
    setPdfLoading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("chapter_id", String(chapterId));
      const { data } = await api.post<{ questions: Draft[] }>("/courses/admin/quiz-from-pdf", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPdfDrafts(data.questions);
      toast.success(`${data.questions.length} questions extraites — révise et enregistre.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Extraction PDF impossible.");
    } finally {
      setPdfLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  async function saveBulkDrafts(selected: Draft[]) {
    setBulkSaving(true);
    let ok = 0;
    for (const q of selected) {
      try { await api.post(`/courses/admin/quiz-questions`, { ...q, chapter_id: chapterId }); ok++; } catch { /* skip */ }
    }
    await invalidate();
    setBulkSaving(false);
    setPdfDrafts(null);
    toast.success(`${ok} question${ok !== 1 ? "s" : ""} enregistrée${ok !== 1 ? "s" : ""}.`);
  }

  // ── Math keyboard insertion ────────────────────────────────────────────────
  function handleMathInsert(symbol: string) {
    if (activeElRef.current) {
      insertAtCursor(activeElRef.current, symbol);
    } else {
      toast.info("Clique d'abord dans un champ (question, option…) puis choisis un symbole.");
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const chapterLabel = useMemo(() => {
    const c = chapters.find(c => c.id === chapterId);
    return c ? `${c.subject_name} · ${c.title}` : "";
  }, [chapters, chapterId]);

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(item =>
      item.question.toLowerCase().includes(q) ||
      item.options.some(o => o.toLowerCase().includes(q)) ||
      (item.explanation ?? "").toLowerCase().includes(q)
    );
  }, [questions, search]);

  // Shared focus handler — keeps track of the active element for math keyboard
  const trackFocus = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    activeElRef.current = e.currentTarget;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Quiz"
        title="Banque de questions"
        description="Crée les quiz qui débloquent les chapitres. Génère avec Khlayel, importe depuis un PDF, ou saisis à la main."
      />

      {/* Chapter picker */}
      <Card className="border-border/70">
        <CardContent className="p-5">
          <Label htmlFor="quiz-chapter">Chapitre</Label>
          <select
            id="quiz-chapter"
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={chapterId ?? ""}
            onChange={(e) => {
              setChapterId(e.target.value ? Number(e.target.value) : null);
              setEditing(null);
              setPdfDrafts(null);
            }}
          >
            <option value="">— Sélectionne un chapitre —</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.track_title} · {c.subject_name} · {c.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {chapterId != null && (
        <>
          {/* Actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{questions.length}</span> question{questions.length !== 1 ? "s" : ""} · {chapterLabel}
              {questions.length > 0 && questions.length < 10 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">(min. 10 recommandé)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* PDF import */}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }}
              />
              <Button
                variant="outline"
                className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"
                disabled={pdfLoading}
                onClick={() => pdfInputRef.current?.click()}
              >
                {pdfLoading
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Extraction…</>
                  : <><FileUp className="mr-1.5 h-4 w-4" /> Importer PDF</>}
              </Button>

              {/* Khlayel generate */}
              <Button
                variant="outline"
                className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Génération…</>
                  : <><Sparkles className="mr-1.5 h-4 w-4" /> Générer avec Khlayel</>}
              </Button>

              {/* New question */}
              <Button
                className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                onClick={() => { setEditing({ ...EMPTY }); setPdfDrafts(null); }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nouvelle question
              </Button>
            </div>
          </div>

          {/* PDF review panel */}
          {pdfDrafts && (
            <PdfReviewPanel
              drafts={pdfDrafts}
              onSave={saveBulkDrafts}
              onClose={() => setPdfDrafts(null)}
              isSaving={bulkSaving}
            />
          )}

          {/* Question editor */}
          {editing && (
            <Card className="border-bordeaux/30">
              <CardContent className="space-y-4 p-5">
                {/* Math keyboard toolbar */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {editing.id ? "Modifier la question" : "Nouvelle question"}
                  </p>
                  <MathKeyboard onInsert={handleMathInsert} />
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Clique dans un champ, puis un symbole du clavier pour l'insérer au curseur.
                </p>

                <div className="space-y-1.5">
                  <Label>Question</Label>
                  <Textarea
                    value={editing.question}
                    onFocus={trackFocus}
                    onChange={e => setEditing({ ...editing, question: e.target.value })}
                    rows={2}
                    placeholder="Énoncé de la question…"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {editing.options.map((opt, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, correct_index: i })}
                          className={`grid h-5 w-5 place-items-center rounded-full border text-xs font-bold transition-colors
                            ${editing.correct_index === i
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border hover:border-emerald-400"}`}
                          title="Marquer comme bonne réponse"
                        >
                          {editing.correct_index === i ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                        </button>
                        Option {String.fromCharCode(65 + i)}
                        {editing.correct_index === i && <span className="text-xs text-emerald-600">(correcte)</span>}
                      </Label>
                      <Input
                        value={opt}
                        onFocus={trackFocus}
                        onChange={e => {
                          const o = [...editing.options];
                          o[i] = e.target.value;
                          setEditing({ ...editing, options: o });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>Explication <span className="text-muted-foreground font-normal">(optionnelle)</span></Label>
                  <Input
                    value={editing.explanation}
                    onFocus={trackFocus}
                    onChange={e => setEditing({ ...editing, explanation: e.target.value })}
                    placeholder="Pourquoi cette réponse est correcte…"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    <X className="mr-1.5 h-4 w-4" /> Annuler
                  </Button>
                  <Button
                    className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(editing)}
                  >
                    {saveMutation.isPending
                      ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      : <Check className="mr-1.5 h-4 w-4" />}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          {questions.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans les questions…"
                className="pl-9"
              />
            </div>
          )}

          {/* Question list */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-bordeaux" />
            </div>
          ) : questions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune question. Génère avec Khlayel, importe un PDF, ou ajoute-les à la main.
            </p>
          ) : filteredQuestions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucune question ne correspond à « {search} ».
            </p>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, i) => (
                <Card key={q.id} className="border-border/70">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => setEditing({ id: q.id, question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation ?? "" })}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Supprimer cette question ?")) deleteMutation.mutate(q.id); }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-1.5 text-xs
                            ${idx === q.correct_index
                              ? "font-semibold text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"}`}
                        >
                          {idx === q.correct_index
                            ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                            : <span className="h-3 w-3 shrink-0" />}
                          {String.fromCharCode(65 + idx)}. {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-2 text-xs text-muted-foreground italic border-t border-border/60 pt-2">
                        💡 {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
