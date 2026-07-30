# Khlayel AI — Architecture & Roadmap

Assistant mathématiques pour lycéens tunisiens (FR / arabe / darija arabizi).

## Composition (pipeline backend)

```
Message élève (+ image/PDF)
  → Quota journalier (10 gratuit / 100 abonné, avant tout coût LLM)
  → Fichier : image → vision (transcription) · PDF → extraction texte
  → Scope Gate (filtre hors-sujet + détection "fishing")     [gpt-oss-20b]
  → Détection mode (tutor/corrector/resume/exercice) — regex
  → Détection langue (fr / ar / arabizi) — regex
  → Contexte : profil élève + curriculum (DB) + mémoire (mem0) + 8 derniers messages
  → System prompt personnalisé (style tunisien, balises, règles graphes)
  → Génération streaming SSE          [resume → qwen3.6-27b · reste → gpt-oss-120b]
  → Retry contexte minimal si rate-limit (tier Groq 8k TPM)
  → Post-traitement : extraction GRAPH (parser réparateur JSON/LaTeX)
  → Persistance (messages + tokens + modèle) + mémoire mem0
```

## Emplacements

| Rôle | Fichier |
|---|---|
| Contrôleur complet (pipeline, quotas, admin usage) | `backend/src/controllers/aiController.js` |
| Routes + rate-limit + multer (10 MB, img/PDF) | `backend/src/routes/ai.js` |
| Migrations feedback & tokens | `backend/migrations/2026-07-14-ai-*.sql` |
| UI chat (streaming, KaTeX, callouts, Desmos, historique) | `frontend/src/routes/khlayel.tsx` |
| Styles `.kh-*` (tableaux, [OK]/[KO], RTL, sidebar) | `frontend/src/styles.css` |
| Dashboard admin tokens | `frontend/src/components/admin/KhlayelUsageModule.tsx` |
| Tables DB | `ai_conversations`, `ai_messages`, `curriculum` |

## Rendu frontend

Markdown maison + KaTeX (4 formats) → sanitizé DOMPurify. Callouts repliables
(`[THM] [DEF] [METH] [EX] [ATT] [CONC]`), lignes correction `[OK]/[KO]`,
tableaux markdown (variation/signe), graphes Desmos, RTL arabe, actions
copier / 👍👎 / régénérer, PDF scanné → converti en image via pdfjs.

## Points à améliorer (par priorité)

1. **Migration Anthropic** (Sonnet + Haiku) : meilleur raisonnement, vision et
   PDF natifs (supprime transcription + pdf-parse), prompt caching, fin du
   goulot 8k TPM. *Le levier n°1.*
2. **Classificateur unifié** : un appel Haiku JSON `{mode, langue, scope}`
   remplace gate + 2 regex fragiles.
3. **Exercices ancrés sur annales bac** (DB d'énoncés réels taggés par notion)
   + RAG sur `course_resources` — citer le cours officiel de l'élève.
4. **Maîtrise par notion** : table `user_notion_mastery` alimentée par les
   `[KO]` du correcteur → vrais "chapitres faibles" + révision espacée.
5. **Boucle qualité** : revue des 👎 (déjà en DB) dans le dashboard admin.
6. **Quick wins** : cache des résumés par chapitre/niveau, export PDF d'une
   conversation, entrée vocale (Whisper), graphes via tool-use (fin du regex).
