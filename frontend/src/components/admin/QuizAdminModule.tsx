import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2, Pencil, Check, X, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { AdminPageIntro } from "@/routes/admin";

type Chapter = { id: number; title: string; track_title: string; subject_name: string };
type Question = {
  id: number;
  chapter_id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  is_active: number;
};
type Draft = { question: string; options: string[]; correct_index: number; explanation: string };

const EMPTY: Draft = { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" };

export function QuizAdminModule() {
  const queryClient = useQueryClient();
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Draft & { id?: number } | null>(null);
  const [search, setSearch] = useState("");

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-quiz-questions", chapterId] });

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
      // Save all generated drafts directly (staff can edit/delete afterward)
      let ok = 0;
      for (const q of data.questions) {
        try { await api.post(`/courses/admin/quiz-questions`, { ...q, chapter_id: chapterId }); ok++; } catch { /* skip bad */ }
      }
      invalidate();
      toast.success(`${ok} questions générées par Khlayel — relis-les avant de publier.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Génération impossible."),
  });

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

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Quiz"
        title="Banque de questions"
        description="Crée les quiz qui débloquent les chapitres. Génère un brouillon avec Khlayel puis valide chaque question."
      />

      {/* Chapter picker */}
      <Card className="border-border/70">
        <CardContent className="p-5">
          <Label htmlFor="quiz-chapter">Chapitre</Label>
          <select
            id="quiz-chapter"
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={chapterId ?? ""}
            onChange={(e) => { setChapterId(e.target.value ? Number(e.target.value) : null); setEditing(null); }}
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
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{questions.length}</span> question{questions.length !== 1 ? "s" : ""} · {chapterLabel}
              {questions.length > 0 && questions.length < 10 && <span className="ml-2 text-amber-600 dark:text-amber-400">(min. 10 recommandé)</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}>
                {generateMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                Générer avec Khlayel
              </Button>
              <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" onClick={() => setEditing({ ...EMPTY })}>
                <Plus className="mr-1.5 h-4 w-4" /> Nouvelle question
              </Button>
            </div>
          </div>

          {/* Editor */}
          {editing && (
            <Card className="border-bordeaux/30">
              <CardContent className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <Label>Question</Label>
                  <Textarea value={editing.question} onChange={e => setEditing({ ...editing, question: e.target.value })} rows={2} placeholder="Énoncé de la question…" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {editing.options.map((opt, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, correct_index: i })}
                          className={`grid h-5 w-5 place-items-center rounded-full border text-xs font-bold ${editing.correct_index === i ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}
                          title="Marquer comme bonne réponse"
                        >
                          {editing.correct_index === i ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                        </button>
                        Option {String.fromCharCode(65 + i)} {editing.correct_index === i && <span className="text-xs text-emerald-600">(correcte)</span>}
                      </Label>
                      <Input value={opt} onChange={e => { const o = [...editing.options]; o[i] = e.target.value; setEditing({ ...editing, options: o }); }} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label>Explication (optionnelle)</Label>
                  <Input value={editing.explanation} onChange={e => setEditing({ ...editing, explanation: e.target.value })} placeholder="Pourquoi cette réponse est correcte…" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)}><X className="mr-1.5 h-4 w-4" /> Annuler</Button>
                  <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(editing)}>
                    {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
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
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-bordeaux" /></div>
          ) : questions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucune question. Génère-en avec Khlayel ou ajoute-les à la main.</p>
          ) : filteredQuestions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucune question ne correspond à « {search} ».</p>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, i) => (
                <Card key={q.id} className="border-border/70">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => setEditing({ id: q.id, question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation ?? "" })}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("Supprimer cette question ?")) deleteMutation.mutate(q.id); }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      {q.options.map((opt, idx) => (
                        <div key={idx} className={`flex items-center gap-1.5 text-xs ${idx === q.correct_index ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {idx === q.correct_index ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <span className="h-3 w-3 shrink-0" />}
                          {String.fromCharCode(65 + idx)}. {opt}
                        </div>
                      ))}
                    </div>
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
