import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}
interface QuizData {
  chapter_id: number;
  total: number;
  pass_mark: number;
  questions: QuizQuestion[];
}
interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  pass_mark: number;
  results: { question_id: number; selected_index: number; correct_index: number; correct: boolean; explanation: string | null }[];
}

export function QuizModal({
  chapterId, chapterTitle, onClose, onPassed,
}: {
  chapterId: number;
  chapterTitle: string;
  onClose: () => void;
  onPassed: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0); // bump to refetch a fresh question set

  const { data, isLoading, isError } = useQuery<QuizData>({
    queryKey: ["chapter-quiz", chapterId, attempt],
    queryFn: async () => (await api.get<QuizData>(`/courses/chapters/${chapterId}/quiz`)).data,
    refetchOnWindowFocus: false,
  });

  const allAnswered = data && Object.keys(answers).length === data.questions.length;

  const submit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: data.questions.map(q => ({ question_id: q.id, selected_index: answers[q.id] ?? -1 })),
      };
      const { data: res } = await api.post<QuizResult>(`/courses/chapters/${chapterId}/quiz/submit`, payload);
      setResult(res);
      if (res.passed) onPassed();
    } catch { /* surfaced by the button staying enabled */ }
    finally { setSubmitting(false); }
  };

  const retry = () => { setAnswers({}); setResult(null); setAttempt(a => a + 1); };

  const resultFor = (qid: number) => result?.results.find(r => r.question_id === qid);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-elegant my-auto">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-bordeaux/10 text-bordeaux">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-foreground truncate">Quiz — {chapterTitle}</h2>
            {data && !result && (
              <p className="text-xs text-muted-foreground">{data.total} questions · réussite à {data.pass_mark}/{data.total}</p>
            )}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-bordeaux" /></div>
          ) : isError ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Aucun quiz disponible pour ce chapitre.</p>
          ) : result ? (
            /* ── Result screen ── */
            <div className="space-y-5">
              <div className={`rounded-2xl border p-6 text-center ${result.passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30" : "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30"}`}>
                {result.passed ? <Trophy className="mx-auto h-10 w-10 text-emerald-500" /> : <RotateCcw className="mx-auto h-10 w-10 text-amber-500" />}
                <p className="mt-3 font-display text-3xl font-bold text-foreground tabular-nums">{result.score}/{result.total}</p>
                <p className={`mt-1 font-semibold ${result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {result.passed ? "Bravo ! Chapitre suivant débloqué 🎉" : `Il faut ${result.pass_mark}/${result.total} pour réussir. Réessaie !`}
                </p>
              </div>
              {/* Review */}
              <div className="space-y-3">
                {data!.questions.map((q, i) => {
                  const r = resultFor(q.id);
                  return (
                    <div key={q.id} className="rounded-xl border border-border p-4">
                      <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((opt, idx) => {
                          const isCorrect = r?.correct_index === idx;
                          const isChosen = r?.selected_index === idx;
                          return (
                            <div key={idx} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                              isCorrect ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : isChosen ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "text-muted-foreground"}`}>
                              {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : isChosen ? <XCircle className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0" />}
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {r?.explanation && <p className="mt-2 text-xs text-muted-foreground italic">💡 {r.explanation}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Questions ── */
            <div className="space-y-6">
              {data!.questions.map((q, i) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
                  <div className="mt-2.5 grid gap-2">
                    {q.options.map((opt, idx) => {
                      const selected = answers[q.id] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: idx }))}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                            selected ? "border-bordeaux bg-bordeaux/5 text-foreground font-medium" : "border-border hover:border-bordeaux/40 text-muted-foreground"}`}
                        >
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs font-bold ${selected ? "border-bordeaux bg-bordeaux text-white" : "border-border"}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !isError && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
            {result ? (
              <>
                <Button variant="outline" className="border-bordeaux/30 text-bordeaux hover:bg-bordeaux/5" onClick={retry}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Refaire
                </Button>
                <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" onClick={onClose}>Fermer</Button>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">
                  {Object.keys(answers).length}/{data?.total ?? 0} répondues
                </span>
                <Button className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={!allAnswered || submitting} onClick={submit}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Correction…</> : "Valider le quiz"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
