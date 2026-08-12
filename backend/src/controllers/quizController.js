/**
 * Chapter Quizzes — gate the next chapter behind a passing score.
 *
 * Flow: student finishes a chapter → takes its quiz → passing (default 7/10)
 * unlocks the next chapter's content. Questions are a curated bank (optionally
 * drafted by Khlayel, validated by staff).
 */

const db   = require('../config/db');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const QUIZ_SIZE  = Number(process.env.QUIZ_SIZE || 10);   // questions served per attempt
const PASS_RATIO = Number(process.env.QUIZ_PASS_RATIO || 0.7); // 70% → 7/10

// ── Gating helper (shared with courseController) ────────────────
// Returns { [chapterId]: { has_quiz, quiz_passed, locked } } for a track subject.
// A chapter is locked when the PREVIOUS published chapter has an active quiz the
// student hasn't passed yet. Chapters without a quiz never block the next one.
async function getChapterQuizMeta(userId, trackSubjectId) {
  const [rows] = await db.query(
    `SELECT ch.id, ch.display_order,
       (SELECT COUNT(*) FROM quiz_questions q WHERE q.chapter_id = ch.id AND q.is_active = 1) AS q_count,
       (SELECT COUNT(*) FROM quiz_attempts a WHERE a.chapter_id = ch.id AND a.user_id = ? AND a.passed = 1) AS passed_count
     FROM chapters ch
     WHERE ch.track_subject_id = ? AND ch.is_published = 1
     ORDER BY ch.display_order ASC, ch.title ASC`,
    [userId, trackSubjectId]
  );

  const map = {};
  let prevBlocks = false;
  for (const c of rows) {
    const hasQuiz = c.q_count > 0;
    const passed  = c.passed_count > 0;
    map[c.id] = { has_quiz: hasQuiz, quiz_passed: passed, locked: prevBlocks };
    prevBlocks = hasQuiz && !passed; // this chapter gates the next one
  }
  return map;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Verify a chapter belongs to the student's academic track (defence in depth)
async function chapterInStudentTrack(userId, chapterId) {
  const [[row]] = await db.query(
    `SELECT ch.id
     FROM chapters ch
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN users u ON u.id = ?
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     WHERE ch.id = ? AND ch.is_published = 1
     LIMIT 1`,
    [userId, chapterId]
  ).catch(() => [[]]);
  return Boolean(row);
}

// ── STUDENT: GET /api/courses/chapters/:chapterId/quiz ──────────
async function getChapterQuiz(req, res) {
  const chapterId = Number(req.params.chapterId);
  const [questions] = await db.query(
    `SELECT id, question, options FROM quiz_questions
     WHERE chapter_id = ? AND is_active = 1`,
    [chapterId]
  );
  if (questions.length === 0) {
    return res.status(404).json({ code: 'NO_QUIZ', message: 'Aucun quiz n\'est disponible pour ce chapitre.' });
  }

  const picked = shuffle(questions).slice(0, QUIZ_SIZE).map(q => ({
    id: q.id,
    question: q.question,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
  }));

  res.json({
    chapter_id: chapterId,
    pass_ratio: PASS_RATIO,
    total: picked.length,
    pass_mark: Math.ceil(picked.length * PASS_RATIO),
    questions: picked,
  });
}

// ── STUDENT: POST /api/courses/chapters/:chapterId/quiz/submit ──
async function submitChapterQuiz(req, res) {
  const chapterId = Number(req.params.chapterId);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  if (answers.length === 0) return res.status(400).json({ message: 'Aucune réponse soumise.' });

  const ids = answers.map(a => Number(a.question_id)).filter(Boolean);
  if (ids.length === 0) return res.status(400).json({ message: 'Réponses invalides.' });

  const [rows] = await db.query(
    `SELECT id, correct_index, explanation FROM quiz_questions
     WHERE chapter_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    [chapterId, ...ids]
  );
  const keyed = new Map(rows.map(r => [r.id, r]));

  let score = 0;
  const results = answers.map(a => {
    const q = keyed.get(Number(a.question_id));
    if (!q) return null;
    const correct = q.correct_index === Number(a.selected_index);
    if (correct) score++;
    return {
      question_id: q.id,
      selected_index: Number(a.selected_index),
      correct_index: q.correct_index,
      correct,
      explanation: q.explanation ?? null,
    };
  }).filter(Boolean);

  const total  = results.length;
  const passed = total > 0 && score / total >= PASS_RATIO;

  await db.query(
    `INSERT INTO quiz_attempts (user_id, chapter_id, score, total, passed) VALUES (?,?,?,?,?)`,
    [req.user.id, chapterId, score, total, passed ? 1 : 0]
  );

  res.json({ score, total, passed, pass_mark: Math.ceil(total * PASS_RATIO), results });
}

// ── ADMIN: list full questions for a chapter ────────────────────
async function adminListQuestions(req, res) {
  const chapterId = Number(req.query.chapter_id);
  if (!chapterId) return res.status(400).json({ message: 'chapter_id requis.' });
  const [rows] = await db.query(
    `SELECT id, chapter_id, question, options, correct_index, explanation, is_active, created_at
     FROM quiz_questions WHERE chapter_id = ? ORDER BY id ASC`,
    [chapterId]
  );
  res.json(rows.map(r => ({ ...r, options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options })));
}

function validateQuestionBody(body) {
  const { question, options, correct_index } = body;
  if (!question || typeof question !== 'string' || question.trim().length < 5) return 'Question trop courte.';
  if (!Array.isArray(options) || options.length !== 4 || options.some(o => !String(o).trim())) return 'Il faut exactement 4 options non vides.';
  if (![0, 1, 2, 3].includes(Number(correct_index))) return 'La bonne réponse doit être 0, 1, 2 ou 3.';
  return null;
}

async function adminCreateQuestion(req, res) {
  const err = validateQuestionBody(req.body);
  if (err) return res.status(400).json({ message: err });
  const { chapter_id, question, options, correct_index, explanation = null } = req.body;
  const [r] = await db.query(
    `INSERT INTO quiz_questions (chapter_id, question, options, correct_index, explanation) VALUES (?,?,?,?,?)`,
    [chapter_id, question.trim(), JSON.stringify(options.map(o => String(o).trim())), Number(correct_index), explanation]
  );
  res.status(201).json({ id: r.insertId });
}

async function adminUpdateQuestion(req, res) {
  const err = validateQuestionBody(req.body);
  if (err) return res.status(400).json({ message: err });
  const { question, options, correct_index, explanation = null, is_active = 1 } = req.body;
  const [r] = await db.query(
    `UPDATE quiz_questions SET question=?, options=?, correct_index=?, explanation=?, is_active=? WHERE id=?`,
    [question.trim(), JSON.stringify(options.map(o => String(o).trim())), Number(correct_index), explanation, is_active ? 1 : 0, req.params.id]
  );
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Question introuvable.' });
  res.json({ ok: true });
}

async function adminDeleteQuestion(req, res) {
  const [r] = await db.query(`DELETE FROM quiz_questions WHERE id = ?`, [req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Question introuvable.' });
  res.json({ ok: true });
}

// ── ADMIN: draft a quiz with Khlayel (NOT saved — staff validates) ──
async function adminGenerateQuiz(req, res) {
  const chapterId = Number(req.body.chapter_id);
  const count = Math.min(Number(req.body.count) || 10, 15);
  if (!chapterId) return res.status(400).json({ message: 'chapter_id requis.' });

  const [[chapter]] = await db.query(
    `SELECT ch.title, ch.description, s.name AS subject, at.year_of_study AS level
     FROM chapters ch
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     WHERE ch.id = ? LIMIT 1`,
    [chapterId]
  ).catch(() => [[]]);
  if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable.' });

  const prompt = `Tu es un professeur de ${chapter.subject || 'mathématiques'} pour le programme tunisien (niveau ${chapter.level || 'lycée'}).
Génère ${count} questions à choix multiple (QCM) pour évaluer la maîtrise du chapitre "${chapter.title}"${chapter.description ? ` (${chapter.description})` : ''}.
Règles :
- Chaque question a EXACTEMENT 4 options.
- Une seule bonne réponse.
- Difficulté progressive, alignée au programme tunisien.
- Ajoute une explication courte de la bonne réponse.
Réponds UNIQUEMENT avec un JSON valide, sans texte autour, au format :
{"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const questions = (parsed.questions || [])
      .filter(q => q && Array.isArray(q.options) && q.options.length === 4 && [0, 1, 2, 3].includes(Number(q.correct_index)))
      .map(q => ({
        question: String(q.question).trim(),
        options: q.options.map(o => String(o).trim()),
        correct_index: Number(q.correct_index),
        explanation: q.explanation ? String(q.explanation).trim() : '',
      }));
    if (questions.length === 0) return res.status(502).json({ message: 'Génération vide — réessaie.' });
    res.json({ questions });
  } catch (err) {
    console.error('[quiz] generation failed:', err.message);
    res.status(502).json({ message: 'La génération du quiz a échoué. Réessaie.' });
  }
}

// ── ADMIN: extract QCM from a PDF with Khlayel ─────────────────────────────
// (multer is applied as route middleware in courses.js — req.file already set here)
async function adminExtractFromPdf(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Fichier PDF requis.' });

  const chapterId = Number(req.body.chapter_id);
  if (!chapterId) return res.status(400).json({ message: 'chapter_id requis.' });

  // Simple query — no academic_tracks join (year_of_study column varies by schema)
  const [[chapter]] = await db.query(
    `SELECT ch.title,
            COALESCE(s.name, 'Mathématiques') AS subject
     FROM chapters ch
     LEFT JOIN track_subjects ts ON ts.id = ch.track_subject_id
     LEFT JOIN subjects s        ON s.id  = ts.subject_id
     WHERE ch.id = ? LIMIT 1`,
    [chapterId]
  ).catch((err) => { console.error('[quiz-pdf] chapter query error:', err.message); return [[]]; });
  if (!chapter) return res.status(422).json({ message: 'Chapitre introuvable.' });

  const llm = require('../utils/llm');
  const base64 = req.file.buffer.toString('base64');

  const systemPrompt = `Tu es un professeur expert en ${chapter.subject || 'mathématiques'} pour le programme tunisien (lycée).
Ton rôle est d'extraire ou de générer des QCM à partir du document fourni pour le chapitre "${chapter.title}".`;

  const userText = `Analyse ce document PDF et extrais toutes les questions QCM présentes.
Si le document ne contient pas de QCM explicites, génère des questions pertinentes basées sur son contenu.
Règles strictes :
- Chaque question a EXACTEMENT 4 options (A, B, C, D).
- Une seule bonne réponse par question (correct_index : 0=A 1=B 2=C 3=D).
- Ajoute une courte explication de la bonne réponse.
- Les formules mathématiques s'écrivent en texte simple (ex: x^2, sqrt(x), sum(i=1..n)).
Réponds UNIQUEMENT avec ce JSON, sans texte autour :
{"questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"..."}]}`;

  try {
    let raw;
    if (llm.supportsNativeFiles()) {
      // Anthropic — native PDF support
      const result = await llm.chatOnce({
        system: systemPrompt,
        history: [],
        userText,
        attachments: [{ kind: 'document', mime: 'application/pdf', base64 }],
        model: llm.modelFor('light'),
        maxTokens: 4096,
        temperature: 0.3,
      });
      raw = result.text;
    } else {
      // Groq — fallback: generate from chapter context (can't read PDF natively)
      const result = await llm.chatOnce({
        system: systemPrompt,
        history: [],
        userText: `${userText}\n\n[PDF fourni mais non lisible directement — génère des questions cohérentes avec le chapitre.]`,
        model: llm.modelFor('light'),
        maxTokens: 4096,
        temperature: 0.3,
      });
      raw = result.text;
    }

    // Extract all balanced {...} blocks, pick the one with real questions
    const text = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    const blocks = [];
    let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (text[i] === '}') { depth--; if (depth === 0 && start !== -1) { blocks.push(text.slice(start, i + 1)); start = -1; } }
    }

    // Try each block (last one first — model outputs example first, real JSON last)
    let parsed = null;
    for (const block of [...blocks].reverse()) {
      try {
        const candidate = JSON.parse(block.replace(/,\s*([}\]])/g, '$1'));
        if (
          candidate.questions &&
          Array.isArray(candidate.questions) &&
          candidate.questions.length > 0 &&
          candidate.questions[0].question !== '...' // skip the template example
        ) { parsed = candidate; break; }
      } catch { /* try next */ }
    }

    if (!parsed) {
      console.error('[quiz-pdf] could not find valid questions JSON. Raw:', raw.slice(0, 600));
      throw new Error('Aucun JSON valide dans la réponse IA.');
    }

    const questions = (parsed.questions || [])
      .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && [0, 1, 2, 3].includes(Number(q.correct_index)))
      .map(q => ({
        question: String(q.question).trim(),
        options: q.options.map(o => String(o).trim()),
        correct_index: Number(q.correct_index),
        explanation: q.explanation ? String(q.explanation).trim() : '',
      }));

    if (questions.length === 0) return res.status(502).json({ message: 'Aucune question extraite. Vérifie que le PDF contient du texte lisible.' });
    res.json({ questions });
  } catch (err) {
    console.error('[quiz] PDF extraction failed:', err.message);
    res.status(502).json({ message: 'Extraction impossible. Réessaie ou utilise la génération automatique.' });
  }
}

module.exports = {
  getChapterQuizMeta,
  getChapterQuiz,
  submitChapterQuiz,
  adminListQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGenerateQuiz,
  adminExtractFromPdf,
};
