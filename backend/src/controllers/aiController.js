/**
 * Khlayel AI Math Agent — Controller
 *
 * Pipeline per request:
 *   Normalize → Scope Gate → Context Assembly → Model Router
 *   → Generation → Answer-Leak Filter → Persist → Response
 */

const db      = require('../config/db');
const pdfParse = require('pdf-parse');
const llm     = require('../utils/llm'); // provider-agnostic LLM adapter (Anthropic ⇄ Groq)
const { findActiveSubscription } = require('../middleware/subscriptionAccess');
// mem0ai v2 uses ESM — extract the constructor safely from whatever the require returns
const _mem0Module = require('mem0ai');
const MemoryClient = _mem0Module.MemoryClient ?? _mem0Module.default ?? _mem0Module;

let mem0 = null;
if (process.env.MEM0_API_KEY) {
  try {
    mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
  } catch (err) {
    console.warn('[mem0] Failed to initialize MemoryClient:', err.message);
  }
}

// Model tiers are resolved by the adapter per active provider (see utils/llm.js)

// ── Daily quotas (student role only) ─────────────────────────
// Free students get a taste of Khlayel; subscribers get a high anti-abuse cap.
const AI_FREE_DAILY_LIMIT = Number(process.env.AI_FREE_DAILY_LIMIT || 10);
const AI_SUB_DAILY_LIMIT  = Number(process.env.AI_SUB_DAILY_LIMIT || 100);

async function countTodayUserMessages(userId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS used
     FROM ai_messages m
     JOIN ai_conversations c ON c.id = m.conversation_id
     WHERE c.user_id = ? AND m.role = 'user' AND m.created_at >= CURDATE()`,
    [userId]
  );
  return Number(row?.used) || 0;
}

// ── Tunisian style guide injected into every math prompt ────
const TUNISIAN_STYLE = `
LANGUE ET DIALECTE — règles absolues :
- Tu comprends et parles le tunisien sous toutes ses formes : français, arabe littéraire, darija (dialecte tunisien en arabe), et arabizi (darija écrite en lettres latines, ex: "sbeh khir", "kifeh", "chneya", "3andek", "wesh fhemt").
- Détecte la langue dans laquelle l'élève t'écrit et réponds DANS LA MÊME LANGUE.
  * Élève en français → tu réponds en français.
  * Élève en arabe → tu réponds en arabe.
  * Élève en darija arabizi (ex: "3tini mithel", "fhemt 5ater") → tu réponds en darija arabizi, avec un ton naturel et chaleureux comme un professeur tunisien.
  * Élève en darija arabe (مزيان، عندك مثال؟) → tu réponds en darija arabe.
- Pour les termes mathématiques et les notations, utilise toujours le français (limite, dérivée, f'(x), ∫, etc.) même en darija, car c'est ainsi qu'on enseigne les maths en Tunisie.
- Sois naturel et chaleureux, comme un prof tunisien bienveillant. Tu peux répondre à "sbeh khir" par "sbeh nour! kifeh naaounk f lhiseb lyoum?" ou similaire.

STYLE MATHÉMATIQUE TUNISIEN :
- Utilise les notations tunisiennes : intervalles ]a,b[, virgule décimale (ex: 2,5), vecteurs avec flèche.
- Structure la récurrence : Initialisation → Hérédité → Conclusion.
- Formule les CNS/CN/CS explicitement quand demandé.
- Présente les tableaux de signe et de variation en TABLEAU MARKDOWN (| x | ... |, ligne séparatrice |---|), avec les symboles +, −, 0, ↗, ↘, ‖. TOUTES les lignes doivent avoir exactement le même nombre de colonnes que l'en-tête (mets une cellule vide | | si besoin). Exemple :
  | x | −∞ |  | 2 |  | +∞ |
  |---|---|---|---|---|---|
  | f'(x) |  | + | 0 | − |  |
  | f(x) |  | ↗ | f(2) | ↘ |  |
- Encadre les conclusions importantes.
- Ne saute jamais une étape de justification.

MISE EN FORME VISUELLE — utilise ces balises spéciales pour structurer ta réponse :
- [THM]...[/THM] → pour encadrer un théorème ou une propriété importante
- [DEF]...[/DEF] → pour encadrer une définition
- [METH]...[/METH] → pour encadrer une méthode ou des étapes de résolution
- [EX]...[/EX] → pour encadrer un exemple ou une application numérique
- [ATT]...[/ATT] → pour signaler une erreur fréquente ou un point important à retenir
- [CONC]...[/CONC] → pour la conclusion finale d'un exercice
Ces balises s'affichent comme des encadrés colorés dans l'interface. Utilise-les généreusement pour rendre ta réponse claire et visuellement agréable.
`.trim();

// ── Helper: fetch student profile from DB ───────────────────
async function getStudentContext(userId) {
  const [[user]] = await db.query(
    `SELECT first_name, last_name, age, year_of_study, college FROM users WHERE id = ?`,
    [userId]
  );
  if (!user) return null;

  // Fetch curriculum for their level
  const [chapters] = await db.query(
    `SELECT chapter_order, chapter_name, notions, hors_programme
     FROM curriculum WHERE level = ? ORDER BY chapter_order ASC`,
    [user.year_of_study || '3sc']
  );

  // Fetch enrollment progress summary (table may not exist yet — degrade gracefully)
  let progress = [];
  try {
    const [rows] = await db.query(
      `SELECT cs.title as chapter, AVG(rp.progress_percent) as avg_progress
       FROM resource_progress rp
       JOIN course_resources cr ON cr.id = rp.resource_id
       JOIN course_chapters cs ON cs.id = cr.chapter_id
       JOIN enrollments e ON e.course_id = cs.course_id AND e.user_id = ?
       GROUP BY cs.id ORDER BY avg_progress ASC LIMIT 5`,
      [userId]
    );
    progress = rows;
  } catch {
    // resource_progress table not yet migrated — skip weak chapters
  }

  return { user, chapters, weakChapters: progress };
}

// ── Helper: fetch Mem0 memories ─────────────────────────────
async function getMemories(userId, query) {
  if (!mem0) return [];
  try {
    const result = await mem0.search(query, { user_id: String(userId), limit: 5 });
    return (result.results || []).map(r => r.memory);
  } catch {
    return [];
  }
}

async function addMemory(userId, messages) {
  if (!mem0) return;
  try {
    await mem0.add(messages, { user_id: String(userId) });
  } catch (err) {
    console.error('[mem0] add failed:', err.message);
  }
}

// ── FILE PROCESSING (Groq fallback path only) ────────────────
// With Anthropic, images go straight to the reasoning model (see chat()).
// This transcription step is used only when AI_PROVIDER = groq.
async function processImage(buffer, mimeType) {
  try {
    return await llm.transcribeImageGroq({
      base64: buffer.toString('base64'),
      mime: mimeType,
      prompt: `Tu es un expert en transcription de mathématiques tunisiennes (lycée).
Analyse cette image soumise par un lycéen tunisien (photo de cahier, devoir, exercice manuscrit ou imprimé).
Ta tâche :
1. Transcris TOUT le contenu mathématique visible avec précision.
2. Utilise la notation LaTeX pour les formules ($...$ pour inline, $$...$$ pour display).
3. Décris ce que tu vois si certaines parties sont illisibles.
4. Réponds en français.
5. Structure ta transcription clairement (énoncé, calculs de l'élève, résultats).`,
    });
  } catch (err) {
    console.error('[vision] image processing failed:', err.message);
    throw new Error('Impossible de lire cette image. Réessaie avec une photo plus nette.');
  }
}

async function processPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text?.trim();
    if (!text || text.length < 10) throw new Error('PDF vide ou illisible.');
    return text.slice(0, 6000); // cap — Groq on-demand tier is 8k TPM
  } catch (err) {
    console.error('[pdf] parse failed:', err.message);
    throw new Error('Ce PDF semble scanné (pages en images, sans texte). Envoie plutôt une photo (JPG/PNG) de l\'exercice — je lis très bien les photos !');
  }
}

// ── SCOPE GATE ───────────────────────────────────────────────
// Fast Llama 3.1 8B call — classifies the message before burning R1 quota.
async function scopeGate(message, context) {
  const prompt = `Tu es un classificateur pour un assistant mathématiques tunisien (lycée).
L'élève peut écrire en français, arabe, darija arabe, ou arabizi (darija en lettres latines ex: "3tini mithel", "fhemt", "wesh", "kifeh", "sbeh khir", "n7eb nfhem", "famma exercice").
Réponds UNIQUEMENT avec un JSON sur une seule ligne, format: {"is_math":bool,"intent":"new_problem|followup|answer_check|fishing|offtopic","confidence":0-1}

Règles :
- is_math=true pour : toute question ou demande liée aux maths (même en darija/arabizi), salutations avant une question maths, demandes de résumé/cours/exercice sur un chapitre.
  Exemples darija: "3tini mithel fi limites", "ma fhemtch dérivées", "9olili chneya probabilité", "3andi exercice".
- is_math=false UNIQUEMENT si le message est clairement hors-sujet (météo, sport, cuisine, politique).
- Salutations simples (sbeh khir, salam, bonjour) → is_math=true, intent="followup" (l'élève va poser une question).
- intent="fishing" si l'élève demande directement la réponse complète sans effort.
- intent="offtopic" seulement si is_math=false.

Message: "${message.slice(0, 400)}"
Contexte récent: "${context.slice(0, 200)}"`;

  try {
    const raw = await llm.classify(prompt);
    // Models sometimes wrap JSON in prose — extract the first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return { is_math: true, intent: 'new_problem', confidence: 0.5 };
  }
}

// ── Graph spec parser ────────────────────────────────────────
// The model writes raw LaTeX inside JSON, so "\frac" arrives as an invalid or
// mangled escape (\f is a form feed in JSON). Two-step repair:
//   1. Escape lone backslashes that aren't valid JSON escapes (\s, \q, …).
//   2. After parsing, convert control chars produced by valid-but-wrong
//      escapes (\f, \b, \n, \r, \t) back into their LaTeX backslash forms.
function parseGraphSpec(jsonText) {
  const fixLatex = (s) => typeof s === 'string'
    ? s
        .replace(/\f/g, '\\f')
        .replace(/\x08/g, '\\b')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
    : s;

  let spec = null;
  const candidates = [jsonText, jsonText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')];
  for (const candidate of candidates) {
    try { spec = JSON.parse(candidate); break; } catch { /* try next */ }
  }
  if (!spec || !Array.isArray(spec.expressions) || spec.expressions.length === 0) return null;

  spec.expressions = spec.expressions
    .filter(e => e && typeof e.latex === 'string' && e.latex.trim())
    .map((e, i) => ({ id: e.id || `expr${i}`, latex: fixLatex(e.latex).trim(), color: e.color }));
  if (spec.expressions.length === 0) return null;

  return spec;
}

// ── Auto-detect mode from message ───────────────────────────
function detectMode(text) {
  const t = text.toLowerCase();
  // Corrector — student submitting work for correction
  if (/corrig|v[eé]rifi|est-ce (correct|juste|bon)|c'est (bon|juste)|j'ai (fait|trouv|calcul|r[eé]solu)|mon (travail|devoir|solution|r[eé]ponse)|wesh hatha sah|3andi 5ata2|corrigili|chof 5ata2ti|chof 3mali/.test(t)) return 'corrector';
  // Resume — asking for a lesson summary
  if (/r[eé]sum[eé]|r[eé]vis|cours (sur|de|en)|fiche (de|du)|synth[eè]se|r[eé]capitul|tout (sur|le|la|les|ce)|explique.?moi (tout|le cours)|chapitre (de|du|sur)|lzemni nfhem|9olili chneya|chneya (hiya|h[ou]wa)|donne.?moi (le cours|le résumé|une fiche)/.test(t)) return 'resume';
  // Exercise — asking to generate an exercise
  if (/(g[eé]n[eè]re|cr[eé]e|propose|invente|donne.?moi|fais.?moi|3tini).*(exercice|probl[eè]me|sujet|question)|(exercice|probl[eè]me).*(bac|type|similaire|nouvel|nouveau|de bac)/.test(t)) return 'exercice';
  // Default: tutor (explain, help, I don't understand)
  return 'tutor';
}

// ── Detect input language ────────────────────────────────────
function detectLang(text) {
  if (!text) return 'fr';
  // Arabic script
  if (/[؀-ۿ]/.test(text)) return 'ar';
  // Arabizi markers: numbers used as letters common in Tunisian
  if (/\b(3and|5ater|7|9ol|wesh|kifeh|bahi|fhemt|sbeh|nhar|yser|mta3|famma|barsha|nabe3|n7eb|ma3ndich|chneya|lezmek)\b/i.test(text)) return 'arz';
  return 'fr';
}

// ── BUILD SYSTEM PROMPT ──────────────────────────────────────
function buildSystemPrompt(mode, studentCtx, memories, userMessage, isFishing = false) {
  const { user, chapters, weakChapters } = studentCtx;
  const level = user.year_of_study || '3sc';

  const chapterList = chapters.map(c => `  - ${c.chapter_name}`).join('\n');
  const weakList = weakChapters.length
    ? weakChapters.map(w => `  - ${w.chapter} (${Math.round(w.avg_progress || 0)}%)`).join('\n')
    : '  (aucune donnée)';
  const memoryList = memories.length
    ? memories.map(m => `  - ${m}`).join('\n')
    : '  (première session)';

  // Detect the student's language from their actual message
  const lang = detectLang(userMessage);
  const langRule =
    lang === 'ar'  ? `⚠️ RÈGLE ABSOLUE N°1 : L'élève t'écrit en ARABE. Tu dois répondre ENTIÈREMENT en arabe (اللهجة التونسية أو العربية الفصحى). Les termes mathématiques restent en français (limite، dérivée، f'(x)، etc.) car c'est le programme tunisien.` :
    lang === 'arz' ? `⚠️ RÈGLE ABSOLUE N°1 : L'élève t'écrit en DARIJA TUNISIENNE (arabizi). Tu dois répondre en darija arabizi (lettres latines, ton tunisien naturel). Exemples de ton : "bahi, ama lazem nfhemou", "kifeh tnajem tحل هذا", "3andi mithel". Les noms de notions mathématiques restent en français.` :
                    `⚠️ RÈGLE ABSOLUE N°1 : L'élève t'écrit en FRANÇAIS. Tu réponds en français.`;

  const fishingNote = isFishing
    ? `\nATTENTION : l'élève cherche la réponse complète sans effort. Ne donne PAS la solution directement — commence par identifier la notion en jeu et pose-lui une question pour le faire réfléchir.`
    : '';

  const modeInstructions = {
    tutor:     `MODE TUTEUR — Guide l'élève par la méthode Socratique, dans sa langue. Procède par étapes : identifie la notion en jeu, pose des questions pour vérifier sa compréhension, puis avance dans la résolution avec lui. Donne la solution complète (style corrigé de bac tunisien) si l'élève la demande explicitement ou après plusieurs échanges où il reste bloqué.${fishingNote}`,
    corrector: `MODE CORRECTEUR.
CAS 1 — l'élève a soumis SON travail (calculs, réponses) : corrige étape par étape. Commence chaque ligne par [OK] si l'étape est correcte ou [KO] si elle est fausse, suivi de l'étape puis de ton commentaire. Exemple :
[OK] f'(x) = 2x + 3 — dérivée correcte.
[KO] f'(1) = 6 — erreur : f'(1) = 2(1) + 3 = 5.
CAS 2 — l'élève a soumis SEULEMENT un énoncé (sujet, photo/PDF d'exercice) SANS ses réponses : NE demande PAS son travail. Rédige directement le corrigé complet de l'exercice, question par question, dans le style d'un corrigé officiel de bac tunisien (justifications complètes, chaque étape détaillée).
Dans les deux cas, termine par un bilan [CONC]. Réponds dans la langue de l'élève.
IMPORTANT : sois complet mais efficace — va à l'essentiel des justifications pour ne pas dépasser la longueur disponible. Si l'exercice est très long, traite les questions dans l'ordre et indique clairement où tu t'arrêtes.`,
    resume:    `MODE RÉSUMÉ — Génère un résumé de cours complet pour le chapitre demandé, niveau ${level}. Inclus : définitions [DEF], théorèmes [THM], méthodes [METH], exemples [EX]. Langue : celle de l'élève.`,
    exercice:  `MODE EXERCICE — Génère un exercice de style bac tunisien niveau ${level} ciblant les chapitres faibles. Langue : celle de l'élève.`,
  };

  return `${langRule}

Tu es Khlayel, l'assistant mathématiques d'Edutopia pour les lycéens tunisiens.
Tu réponds UNIQUEMENT aux sujets mathématiques du programme tunisien.
Si hors-sujet, dis-le dans la langue de l'élève.

PROFIL :
- Prénom : ${user.first_name}  |  Niveau : ${level}
- Chapitres du programme :
${chapterList}
- Chapitres faibles :
${weakList}

MÉMOIRE :
${memoryList}

${TUNISIAN_STYLE}

${modeInstructions[mode] || modeInstructions.tutor}

N'affiche JAMAIS tes réflexions internes. Réponds directement à l'élève.

GRAPHES — quand un tracé aide la compréhension, mets sur la DERNIÈRE ligne (une seule ligne, rien après) :
GRAPH:{"type":"function_graph","renderer":"desmos","expressions":[{"id":"f","latex":"y=(2x+1)/(x-3)","color":"#8B1A2B"},{"id":"a1","latex":"x=3","color":"#c9a227"},{"id":"a2","latex":"y=2","color":"#c9a227"}],"bounds":{"xmin":-7,"xmax":13,"ymin":-8,"ymax":12}}
Règles des graphes :
- Écris les expressions en syntaxe simple SANS backslash : (2x+1)/(x-3), x^2, e^x, ln(x), sin(x), x^(1/2). PAS de \\frac ni \\sqrt dans le JSON.
- Trace TOUJOURS la fonction principale en premier (couleur #8B1A2B), puis les asymptotes éventuelles (couleur #c9a227).
- Choisis bounds pour cadrer la partie intéressante de la courbe (autour des asymptotes, extremums, points remarquables).`;
}

// ── POST /api/ai/math-chat ───────────────────────────────────
async function chat(req, res) {
  const userId = req.user.id;
  const { message = '', conversation_id } = req.body;
  const uploadedFile = req.file; // set by multer when a file is attached

  // 1. Handle uploaded file. With Anthropic we pass the image/PDF NATIVELY to
  //    the reasoning model (better handwriting reading, real PDF support, no
  //    lossy transcription step). With Groq we fall back to vision-transcription
  //    (images) / pdf-parse (PDFs) into text context.
  let fileContext = '';       // Groq path: file rendered as text
  let attachments = [];       // Anthropic path: native image/pdf blocks
  let fileLabel = '';
  if (uploadedFile) {
    const isPdf = uploadedFile.mimetype === 'application/pdf';
    fileLabel = isPdf ? `📄 PDF: ${uploadedFile.originalname}` : '🖼️ Image analysée';
    try {
      if (llm.supportsNativeFiles()) {
        attachments = [{
          kind: isPdf ? 'pdf' : 'image',
          mime: uploadedFile.mimetype,
          base64: uploadedFile.buffer.toString('base64'),
        }];
      } else if (isPdf) {
        const text = await processPdf(uploadedFile.buffer);
        fileContext = `\n\n[PDF SOUMIS PAR L'ÉLÈVE — "${uploadedFile.originalname}"]\n${text}\n[FIN DU PDF]`;
      } else {
        const transcript = await processImage(uploadedFile.buffer, uploadedFile.mimetype);
        fileContext = `\n\n[IMAGE SOUMISE PAR L'ÉLÈVE — transcription automatique]\n${transcript}\n[FIN DE LA TRANSCRIPTION]`;
      }
    } catch (err) {
      return res.status(422).json({ message: err.message });
    }
  }

  // Must have either a message or a file
  const userMessage = message.trim() || (uploadedFile ? `Corrige mon travail (${fileLabel})` : '');
  if (!userMessage) {
    return res.status(400).json({ message: 'Message vide.' });
  }

  // Daily quota — checked before any LLM cost is incurred
  let quotaLimit = null; // null = unlimited (admin / teacher / parent)
  let quotaUsed = 0;
  if (req.user.role === 'student') {
    const sub = await findActiveSubscription(userId);
    quotaLimit = sub ? AI_SUB_DAILY_LIMIT : AI_FREE_DAILY_LIMIT;
    quotaUsed = await countTodayUserMessages(userId);
    if (quotaUsed >= quotaLimit) {
      return res.status(429).json({
        code: 'AI_QUOTA_EXCEEDED',
        message: sub
          ? `Limite quotidienne atteinte (${quotaLimit} messages). Reviens demain !`
          : `Tu as utilisé tes ${quotaLimit} messages gratuits du jour. Abonne-toi pour continuer avec Khlayel !`,
        quota: { used: quotaUsed, limit: quotaLimit },
      });
    }
  }

  // Auto-detect mode from the message intent (works with or without a file).
  // The corrector prompt now solves a bare statement instead of demanding work.
  const detectedMode = detectMode(userMessage);

  // 2. Scope gate — skip for resume/exercice or when file attached
  let isFishing = false;
  if (!uploadedFile && (detectedMode === 'tutor' || detectedMode === 'corrector')) {
    const gate = await scopeGate(userMessage, '');
    if (!gate.is_math || gate.intent === 'offtopic') {
      const lang = detectLang(userMessage);
      const offTopicMsg =
        lang === 'ar'  ? 'أنا Khlayel، متخصص في الرياضيات للبرنامج التونسي. اسألني سؤالاً في الرياضيات!' :
        lang === 'arz' ? 'Ana Khlayel, متخصص في الرياضيات للبرنامج التونسي. 3tini souel f les maths!' :
                         'Je suis Khlayel, spécialisé en mathématiques du programme tunisien. Pose-moi une question de maths !';
      return res.json({ role: 'assistant', content: offTopicMsg, graph_spec: null });
    }
    isFishing = gate.intent === 'fishing';
  }

  // 3. Student profile + curriculum
  const studentCtx = await getStudentContext(userId);
  if (!studentCtx) return res.status(404).json({ message: 'Profil introuvable.' });

  // 4. Mem0 memories
  const memories = await getMemories(userId, userMessage);

  // 5. Conversation history
  let conversationId = conversation_id;
  let history = [];
  if (conversationId) {
    // Most recent 8 messages (DESC + reverse), each capped — keeps the request
    // under Groq's on-demand 8k TPM limit while preserving recent context.
    const [msgs] = await db.query(
      `SELECT role, content FROM ai_messages WHERE conversation_id=? ORDER BY id DESC LIMIT 8`,
      [conversationId]
    );
    history = msgs.reverse().map(m => ({ role: m.role, content: String(m.content).slice(0, 2500) }));
  } else {
    // New conversation — title from the first message so the sidebar has a label
    const title = userMessage.replace(/\s+/g, ' ').slice(0, 80);
    const [result] = await db.query(
      `INSERT INTO ai_conversations (user_id, mode, title) VALUES (?,?,?)`,
      [userId, detectedMode, title]
    );
    conversationId = result.insertId;
  }

  // 6. Choose model tier — light for resume summaries, reasoning for the rest
  const model = detectedMode === 'resume' ? llm.modelFor('light') : llm.modelFor('reason');

  // 7. Build prompt
  const systemPrompt = buildSystemPrompt(detectedMode, studentCtx, memories, userMessage, isFishing);

  // 8. Call LLM. userText carries the message (+ file text on the Groq path);
  //    attachments carry native image/PDF blocks on the Anthropic path.
  const wantsStream = req.body.stream === true || String(req.body.stream) === '1' || String(req.query.stream) === '1';
  const userText = userMessage + fileContext;
  // Corrections and full exercises need room — a bac correction can be long.
  const maxTokens =
    (detectedMode === 'corrector' || detectedMode === 'exercice') ? 4096 :
    detectedMode === 'resume' ? 3072 :
    uploadedFile ? 3072 : 1800;

  // Rate-limit fallback: retry once with only the system prompt + last message
  const isRateLimit = (err) =>
    err?.status === 413 || err?.status === 429 || /rate_limit|too large/i.test(err?.message ?? '');
  const baseArgs = { system: systemPrompt, history, userText, attachments, model, maxTokens, temperature: 0.5 };
  const minimalArgs = { system: systemPrompt, history: [], userText: userText.slice(0, 9000), attachments, model, maxTokens: Math.min(maxTokens, 1200), temperature: 0.5 };

  // Shared post-processing: graph extraction + persistence + memory
  async function finalize(rawContent, usage = null) {
    let content = rawContent.trim();
    let graphSpec = null;
    const graphMatch = content.match(/GRAPH:(\{.+\})$/m);
    if (graphMatch) {
      graphSpec = parseGraphSpec(graphMatch[1]);
      if (graphSpec) content = content.replace(/GRAPH:\{.+\}$/m, '').trim();
    }

    await db.query(
      `INSERT INTO ai_messages (conversation_id, role, content) VALUES (?,?,?)`,
      [conversationId, 'user', fileLabel ? `${userMessage} [${fileLabel}]` : userMessage]
    );
    let ins;
    try {
      [ins] = await db.query(
        `INSERT INTO ai_messages (conversation_id, role, content, graph_spec, model, prompt_tokens, completion_tokens)
         VALUES (?,?,?,?,?,?,?)`,
        [conversationId, 'assistant', content, graphSpec ? JSON.stringify(graphSpec) : null,
         model, usage?.prompt_tokens ?? null, usage?.completion_tokens ?? null]
      );
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      // usage columns not yet migrated — insert without them
      [ins] = await db.query(
        `INSERT INTO ai_messages (conversation_id, role, content, graph_spec) VALUES (?,?,?,?)`,
        [conversationId, 'assistant', content, graphSpec ? JSON.stringify(graphSpec) : null]
      );
    }

    addMemory(userId, [
      { role: 'user', content: userMessage },
      { role: 'assistant', content },
    ]).catch(() => {});

    return { content, graphSpec, assistantMessageId: ins.insertId };
  }

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
    res.flushHeaders?.();
    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    let raw = '';
    let usage = null;
    try {
      const onDelta = (text) => { raw += text; send({ type: 'delta', text }); };
      let out;
      try {
        out = await llm.chatStream({ ...baseArgs, onDelta });
      } catch (err) {
        if (!isRateLimit(err)) throw err;
        console.warn('[llm] rate limit — retrying with minimal context');
        raw = '';
        out = await llm.chatStream({ ...minimalArgs, onDelta });
      }
      usage = out.usage;
    } catch (err) {
      console.error('[llm] stream error:', err.message);
      const msg = isRateLimit(err)
        ? 'Trop de demandes en ce moment — attends une minute puis réessaie.'
        : 'Le service AI est temporairement indisponible. Réessaie dans quelques secondes.';
      send({ type: 'error', message: msg });
      return res.end();
    }

    try {
      const { content, graphSpec, assistantMessageId } = await finalize(raw, usage);
      send({
        type: 'done',
        conversation_id: conversationId,
        detected_mode: detectedMode,
        content, // final cleaned content (GRAPH line stripped)
        graph_spec: graphSpec,
        assistant_message_id: assistantMessageId,
        quota: quotaLimit ? { used: quotaUsed + 1, limit: quotaLimit } : null,
      });
    } catch (err) {
      console.error('[ai] finalize error:', err.message);
      send({ type: 'error', message: 'Erreur lors de la sauvegarde de la réponse.' });
    }
    return res.end();
  }

  // Non-streaming fallback
  let assistantContent = '';
  let usage = null;
  try {
    let out;
    try {
      out = await llm.chatOnce(baseArgs);
    } catch (err) {
      if (!isRateLimit(err)) throw err;
      out = await llm.chatOnce(minimalArgs);
    }
    assistantContent = out.text;
    usage = out.usage;
  } catch (err) {
    console.error('[llm] chat error:', err.message);
    return res.status(502).json({ message: 'Le service AI est temporairement indisponible. Réessaie dans quelques secondes.' });
  }

  const { content, graphSpec, assistantMessageId } = await finalize(assistantContent, usage);
  res.json({
    conversation_id: conversationId,
    role: 'assistant',
    content,
    detected_mode: detectedMode,
    graph_spec: graphSpec,
    assistant_message_id: assistantMessageId,
    quota: quotaLimit ? { used: quotaUsed + 1, limit: quotaLimit } : null,
  });
}

// ── GET /api/ai/math-chat/conversations ─────────────────────
async function getConversations(req, res) {
  // COALESCE fallback: conversations created before the title feature get
  // their first user message as a label — no backfill migration needed.
  const [rows] = await db.query(
    `SELECT c.id, c.mode,
            COALESCE(NULLIF(c.title, ''), (
              SELECT LEFT(m.content, 80) FROM ai_messages m
              WHERE m.conversation_id = c.id AND m.role = 'user'
              ORDER BY m.id ASC LIMIT 1
            )) AS title,
            c.created_at, c.updated_at
     FROM ai_conversations c
     WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 30`,
    [req.user.id]
  );
  res.json(rows);
}

// ── GET /api/ai/math-chat/conversations/:id/messages ────────
async function getMessages(req, res) {
  const userId = req.user.id;
  // Verify ownership
  const [[conv]] = await db.query(
    `SELECT id FROM ai_conversations WHERE id=? AND user_id=?`,
    [req.params.id, userId]
  );
  if (!conv) return res.status(404).json({ message: 'Conversation introuvable.' });

  const [rows] = await db.query(
    `SELECT id, role, content, graph_spec, created_at
     FROM ai_messages WHERE conversation_id=? ORDER BY id ASC`,
    [req.params.id]
  );
  res.json(rows);
}

// ── DELETE /api/ai/math-chat/conversations/:id ──────────────
async function deleteConversation(req, res) {
  const [[conv]] = await db.query(
    `SELECT id FROM ai_conversations WHERE id=? AND user_id=?`,
    [req.params.id, req.user.id]
  );
  if (!conv) return res.status(404).json({ message: 'Conversation introuvable.' });
  await db.query(`DELETE FROM ai_messages WHERE conversation_id=?`, [conv.id]);
  await db.query(`DELETE FROM ai_conversations WHERE id=?`, [conv.id]);
  res.json({ ok: true });
}

// ── GET /api/ai/admin/usage — token & activity dashboard ────
async function adminUsage(req, res) {
  try {
    const [[totals]] = await db.query(
      `SELECT COUNT(*) AS total_messages,
              COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
              COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
              COALESCE(SUM(feedback = 'up'), 0) AS thumbs_up,
              COALESCE(SUM(feedback = 'down'), 0) AS thumbs_down
       FROM ai_messages WHERE role = 'assistant'`
    );
    const [[convStats]] = await db.query(
      `SELECT COUNT(*) AS total_conversations, COUNT(DISTINCT user_id) AS active_users FROM ai_conversations`
    );
    const [byDay] = await db.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS messages,
              COALESCE(SUM(prompt_tokens) + SUM(completion_tokens), 0) AS tokens
       FROM ai_messages
       WHERE role = 'assistant' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at) ORDER BY day ASC`
    );
    const [byModel] = await db.query(
      `SELECT COALESCE(model, 'non tracé') AS model, COUNT(*) AS messages,
              COALESCE(SUM(prompt_tokens) + SUM(completion_tokens), 0) AS tokens
       FROM ai_messages WHERE role = 'assistant' GROUP BY model ORDER BY tokens DESC`
    );
    const [topUsers] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.year_of_study,
              COUNT(m.id) AS messages,
              COALESCE(SUM(m.prompt_tokens) + SUM(m.completion_tokens), 0) AS tokens
       FROM ai_messages m
       JOIN ai_conversations c ON c.id = m.conversation_id
       JOIN users u ON u.id = c.user_id
       WHERE m.role = 'assistant'
       GROUP BY u.id ORDER BY tokens DESC, messages DESC LIMIT 10`
    );
    res.json({ totals: { ...totals, ...convStats }, by_day: byDay, by_model: byModel, top_users: topUsers });
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    // Usage columns not migrated yet — return message counts only
    const [[totals]] = await db.query(
      `SELECT COUNT(*) AS total_messages FROM ai_messages WHERE role = 'assistant'`
    );
    const [[convStats]] = await db.query(
      `SELECT COUNT(*) AS total_conversations, COUNT(DISTINCT user_id) AS active_users FROM ai_conversations`
    );
    const [byDay] = await db.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS messages, 0 AS tokens
       FROM ai_messages
       WHERE role = 'assistant' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at) ORDER BY day ASC`
    );
    res.json({
      totals: { ...totals, ...convStats, prompt_tokens: 0, completion_tokens: 0, thumbs_up: 0, thumbs_down: 0 },
      by_day: byDay, by_model: [], top_users: [], needs_migration: true,
    });
  }
}

// ── POST /api/ai/math-chat/feedback ─────────────────────────
// Thumbs up/down on an assistant message — builds an eval dataset over time.
async function feedback(req, res) {
  const { message_id, rating } = req.body;
  if (!message_id || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ message: 'message_id et rating (up|down) requis.' });
  }
  try {
    const [result] = await db.query(
      `UPDATE ai_messages m
       JOIN ai_conversations c ON c.id = m.conversation_id
       SET m.feedback = ?
       WHERE m.id = ? AND c.user_id = ? AND m.role = 'assistant'`,
      [rating, message_id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Message introuvable.' });
    res.json({ ok: true });
  } catch (err) {
    // feedback column not yet migrated — degrade gracefully
    if (err.code === 'ER_BAD_FIELD_ERROR') return res.json({ ok: true, stored: false });
    throw err;
  }
}

module.exports = { chat, getConversations, getMessages, feedback, deleteConversation, adminUsage };
