const db = require('../config/db');
const { SECTION_REQUIRED_GRADES, inferSchoolCycle } = require('../utils/academic');
const { handleValidationErrors } = require('../utils/validation');
const { getChapterQuizMeta } = require('./quizController');

async function loadStudentTrackContext(userId) {
  const [userRows] = await db.query(
    'SELECT id, school_cycle, grade_code, section_code, year_of_study FROM users WHERE id = ?',
    [userId]
  );
  const user = userRows[0];

  if (!user) {
    const error = new Error('Utilisateur introuvable.');
    error.status = 404;
    throw error;
  }

  const needsSection = SECTION_REQUIRED_GRADES.has(user.grade_code);
  if (!user.grade_code || (needsSection && !user.section_code)) {
    return {
      missingTrack: true,
      track: null,
    };
  }

  const schoolCycle = user.school_cycle || inferSchoolCycle(user.grade_code);
  const sectionCode = user.section_code || null;
  const [trackRows] = await db.query(
    `SELECT id, slug, title, school_cycle, grade_code, section_code
     FROM academic_tracks
     WHERE school_cycle = ?
       AND grade_code = ?
       AND ((section_code IS NULL AND ? IS NULL) OR section_code = ?)
       AND is_active = 1
     LIMIT 1`,
    [schoolCycle, user.grade_code, sectionCode, sectionCode]
  );

  return {
    missingTrack: false,
    track: trackRows[0] || {
      id: null,
      slug: null,
      title: user.year_of_study || user.grade_code,
      school_cycle: schoolCycle,
      grade_code: user.grade_code,
      section_code: sectionCode,
    },
  };
}

function academicTrackRequired(res) {
  return res.status(400).json({
    code: 'ACADEMIC_TRACK_REQUIRED',
    message: 'Completez votre classe et votre section dans le profil pour acceder aux cours scolaires.',
  });
}

async function loadOwnedCourse(courseId, user, res) {
  const [rows] = await db.query('SELECT * FROM courses WHERE id = ?', [courseId]);
  const course = rows[0];

  if (!course) {
    res.status(404).json({ message: 'Cours introuvable.' });
    return null;
  }

  if (user.role !== 'admin' && course.teacher_id !== user.id) {
    res.status(403).json({ message: 'Acces refuse.' });
    return null;
  }

  return course;
}

async function loadOwnedCourseChapter(chapterId, user, res) {
  const [rows] = await db.query(
    `SELECT cc.*, c.teacher_id
     FROM course_chapters cc
     JOIN courses c ON c.id = cc.course_id
     WHERE cc.id = ?`,
    [chapterId]
  );
  const chapter = rows[0];

  if (!chapter) {
    res.status(404).json({ message: 'Chapitre introuvable.' });
    return null;
  }

  if (user.role !== 'admin' && chapter.teacher_id !== user.id) {
    res.status(403).json({ message: 'Acces refuse.' });
    return null;
  }

  return chapter;
}

async function loadOwnedCourseResource(resourceId, user, res) {
  const [rows] = await db.query(
    `SELECT cr.*, cc.course_id, c.teacher_id
     FROM course_resources cr
     JOIN course_chapters cc ON cc.id = cr.chapter_id
     JOIN courses c ON c.id = cc.course_id
     WHERE cr.id = ?`,
    [resourceId]
  );
  const resource = rows[0];

  if (!resource) {
    res.status(404).json({ message: 'Ressource introuvable.' });
    return null;
  }

  if (user.role !== 'admin' && resource.teacher_id !== user.id) {
    res.status(403).json({ message: 'Acces refuse.' });
    return null;
  }

  return resource;
}

async function adminGetCurriculum(_req, res) {
  const [tracks] = await db.query(
    `SELECT id, school_cycle, grade_code, section_code, slug, title, description, is_active, display_order
     FROM academic_tracks
     ORDER BY display_order ASC, title ASC`
  );

  const [subjects] = await db.query(
    `SELECT id, name, slug, description, icon, color, is_active, created_at, updated_at
     FROM subjects
     ORDER BY is_active DESC, name ASC`
  );

  const [trackSubjects] = await db.query(
    `SELECT
       ts.id,
       ts.academic_track_id,
       ts.subject_id,
       ts.description,
       ts.cover_image,
       ts.display_order,
       ts.is_published,
       at.title AS track_title,
       at.slug AS track_slug,
       s.name AS subject_name,
       s.slug AS subject_slug,
       COUNT(DISTINCT ch.id) AS chapter_count,
       COUNT(DISTINCT cr.id) AS resource_count
     FROM track_subjects ts
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     JOIN subjects s ON s.id = ts.subject_id
     LEFT JOIN chapters ch ON ch.track_subject_id = ts.id
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id
     GROUP BY ts.id, ts.academic_track_id, ts.subject_id, ts.description, ts.cover_image, ts.display_order, ts.is_published, at.title, at.slug, s.name, s.slug
     ORDER BY at.display_order ASC, ts.display_order ASC, s.name ASC`
  );

  const [chapters] = await db.query(
    `SELECT
       ch.id,
       ch.track_subject_id,
       ch.title,
       ch.slug,
       ch.description,
       ch.display_order,
       ch.is_published,
       ts.academic_track_id,
       ts.subject_id,
       at.title AS track_title,
       s.name AS subject_name,
       COUNT(cr.id) AS resource_count
     FROM chapters ch
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     JOIN subjects s ON s.id = ts.subject_id
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id
     GROUP BY ch.id, ch.track_subject_id, ch.title, ch.slug, ch.description, ch.display_order, ch.is_published, ts.academic_track_id, ts.subject_id, at.title, s.name
      ORDER BY at.display_order ASC, ts.display_order ASC, ch.display_order ASC, ch.title ASC`
  );

  const [resources] = await db.query(
    `SELECT
       cr.id,
       cr.chapter_id,
       cr.resource_type,
       cr.title,
       cr.description,
       cr.file_url,
       cr.external_url,
       cr.duration_minutes,
       cr.display_order,
       cr.is_published,
       ch.title AS chapter_title,
       ch.track_subject_id,
       s.name AS subject_name,
       at.title AS track_title
     FROM chapter_resources cr
     JOIN chapters ch ON ch.id = cr.chapter_id
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     ORDER BY at.display_order ASC, ts.display_order ASC, ch.display_order ASC, cr.display_order ASC, cr.title ASC`
  );

  res.json({
    tracks,
    subjects,
    track_subjects: trackSubjects,
    chapters,
    resources,
  });
}

// PUT /api/courses/admin/tracks/:id
async function adminUpdateTrack(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });

  const { title, description, display_order, is_active } = req.body;
  const updates = [];
  const params  = [];
  if (title         !== undefined) { updates.push('title = ?');         params.push(title); }
  if (description   !== undefined) { updates.push('description = ?');   params.push(description || null); }
  if (display_order !== undefined) { updates.push('display_order = ?'); params.push(Number(display_order)); }
  if (is_active     !== undefined) { updates.push('is_active = ?');     params.push(is_active ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ message: 'Aucun champ à modifier.' });

  params.push(id);
  await db.query(`UPDATE academic_tracks SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Filière mise à jour.' });
}

// DELETE /api/courses/admin/tracks/:id
async function adminDeleteTrack(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });
  await db.query('DELETE FROM academic_tracks WHERE id = ?', [id]);
  res.json({ message: 'Filière supprimée.' });
}

// PATCH /api/courses/admin/tracks/:id/toggle
async function adminToggleTrack(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });
  await db.query('UPDATE academic_tracks SET is_active = NOT is_active WHERE id = ?', [id]);
  const [[row]] = await db.query('SELECT is_active FROM academic_tracks WHERE id = ?', [id]);
  res.json({ is_active: row.is_active });
}

async function adminCreateSubject(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { name, slug, description, icon, color, is_active } = req.body;
  const [result] = await db.query(
    `INSERT INTO subjects (name, slug, description, icon, color, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, slug, description || null, icon || null, color || null, is_active === undefined ? 1 : is_active]
  );
  res.status(201).json({ message: 'Subject created', id: result.insertId });
}

async function adminUpdateSubject(req, res) {
  if (handleValidationErrors(req, res)) return;

  const allowed = ['name', 'slug', 'description', 'icon', 'color', 'is_active'];
  const updates = [];
  const params = [];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

  params.push(req.params.id);
  const [result] = await db.query(`UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`, params);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Subject not found' });
  res.json({ message: 'Subject updated' });
}

async function adminToggleSubject(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'ID invalide.' });
  await db.query('UPDATE subjects SET is_active = NOT is_active WHERE id = ?', [id]);
  const [[row]] = await db.query('SELECT is_active FROM subjects WHERE id = ?', [id]);
  res.json({ is_active: row.is_active });
}

async function adminDeleteSubject(req, res) {
  const [result] = await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Subject not found' });
  res.json({ message: 'Subject deleted' });
}

async function adminCreateTrackSubject(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { academic_track_id, subject_id, description, cover_image, display_order, is_published } = req.body;
  const [result] = await db.query(
    `INSERT INTO track_subjects (academic_track_id, subject_id, description, cover_image, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [academic_track_id, subject_id, description || null, cover_image || null, display_order || 0, is_published === undefined ? 1 : is_published]
  );
  res.status(201).json({ message: 'Track subject created', id: result.insertId });
}

async function adminUpdateTrackSubject(req, res) {
  if (handleValidationErrors(req, res)) return;

  const allowed = ['academic_track_id', 'subject_id', 'description', 'cover_image', 'display_order', 'is_published'];
  const updates = [];
  const params = [];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

  params.push(req.params.id);
  const [result] = await db.query(`UPDATE track_subjects SET ${updates.join(', ')} WHERE id = ?`, params);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Track subject not found' });
  res.json({ message: 'Track subject updated' });
}

async function adminDeleteTrackSubject(req, res) {
  const [result] = await db.query('DELETE FROM track_subjects WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Track subject not found' });
  res.json({ message: 'Track subject deleted' });
}

async function adminCreateChapter(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { track_subject_id, title, slug, description, display_order, is_published } = req.body;
  const [result] = await db.query(
    `INSERT INTO chapters (track_subject_id, title, slug, description, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [track_subject_id, title, slug, description || null, display_order || 0, is_published === undefined ? 1 : is_published]
  );
  res.status(201).json({ message: 'Chapter created', id: result.insertId });
}

async function adminUpdateChapter(req, res) {
  if (handleValidationErrors(req, res)) return;

  const allowed = ['track_subject_id', 'title', 'slug', 'description', 'display_order', 'is_published'];
  const updates = [];
  const params = [];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

  params.push(req.params.id);
  const [result] = await db.query(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ?`, params);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Chapter not found' });
  res.json({ message: 'Chapter updated' });
}

async function adminDeleteChapter(req, res) {
  const [result] = await db.query('DELETE FROM chapters WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Chapter not found' });
  res.json({ message: 'Chapter deleted' });
}

async function adminCreateResource(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published } = req.body;
  const [result] = await db.query(
    `INSERT INTO chapter_resources (chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [chapter_id, resource_type, title, description || null, file_url || null, external_url || null, duration_minutes || null, display_order || 0, is_published === undefined ? 1 : is_published]
  );
  res.status(201).json({ message: 'Resource created', id: result.insertId });
}

async function adminUpdateResource(req, res) {
  if (handleValidationErrors(req, res)) return;

  const allowed = ['chapter_id', 'resource_type', 'title', 'description', 'file_url', 'external_url', 'duration_minutes', 'display_order', 'is_published'];
  const updates = [];
  const params = [];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

  params.push(req.params.id);
  const [result] = await db.query(`UPDATE chapter_resources SET ${updates.join(', ')} WHERE id = ?`, params);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Resource not found' });
  res.json({ message: 'Resource updated' });
}

async function adminDeleteResource(req, res) {
  const [result] = await db.query('DELETE FROM chapter_resources WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Resource not found' });
  res.json({ message: 'Resource deleted' });
}

// GET /api/courses/subjects/me
async function getMySubjects(req, res) {
  const context = await loadStudentTrackContext(req.user.id);
  if (context.missingTrack) return academicTrackRequired(res);

  if (!context.track?.id) {
    return res.json({ track: context.track, subjects: [] });
  }

  const [rows] = await db.query(
    `SELECT
       s.id,
       ts.id AS track_subject_id,
       s.name,
       s.slug,
       COALESCE(ts.description, s.description) AS description,
       ts.cover_image,
       s.icon,
       s.color,
       COUNT(DISTINCT ch.id) AS chapter_count,
       COUNT(DISTINCT cr.id) AS resource_count
     FROM track_subjects ts
     JOIN subjects s ON s.id = ts.subject_id
     LEFT JOIN chapters ch ON ch.track_subject_id = ts.id AND ch.is_published = 1
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.is_published = 1
     WHERE ts.academic_track_id = ?
       AND ts.is_published = 1
       AND s.is_active = 1
     GROUP BY s.id, ts.id, s.name, s.slug, description, ts.cover_image, s.icon, s.color
     ORDER BY ts.display_order ASC, s.name ASC`,
    [context.track.id]
  );

  res.json({ track: context.track, subjects: rows });
}

// GET /api/courses/subjects/:subjectSlug/chapters
async function getSubjectChapters(req, res) {
  const context = await loadStudentTrackContext(req.user.id);
  if (context.missingTrack) return academicTrackRequired(res);
  if (!context.track?.id) return res.status(404).json({ message: 'Aucun programme n\'est encore configure pour cette classe.' });

  const [subjectRows] = await db.query(
    `SELECT
       s.id,
       ts.id AS track_subject_id,
       s.name,
       s.slug,
       COALESCE(ts.description, s.description) AS description,
       ts.cover_image,
       s.icon,
       s.color
     FROM track_subjects ts
     JOIN subjects s ON s.id = ts.subject_id
     WHERE ts.academic_track_id = ?
       AND s.slug = ?
       AND ts.is_published = 1
       AND s.is_active = 1
     LIMIT 1`,
    [context.track.id, req.params.subjectSlug]
  );
  const subject = subjectRows[0];
  if (!subject) return res.status(404).json({ message: 'Matiere introuvable pour cette classe.' });

  const [chapters] = await db.query(
    `SELECT
       ch.id,
       ch.title,
       ch.slug,
       ch.description,
       ch.display_order,
       COUNT(cr.id) AS resource_count,
       SUM(CASE WHEN cr.resource_type = 'video_lesson' THEN 1 ELSE 0 END) AS video_count,
       SUM(CASE WHEN cr.resource_type = 'pdf_lesson' THEN 1 ELSE 0 END) AS pdf_count,
       SUM(CASE WHEN cr.resource_type = 'exercise_sheet' THEN 1 ELSE 0 END) AS exercise_count,
       SUM(CASE WHEN cr.resource_type = 'correction_sheet' THEN 1 ELSE 0 END) AS correction_count,
       COUNT(srp.id) AS completed_count
     FROM chapters ch
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.is_published = 1
     LEFT JOIN student_resource_progress srp ON srp.resource_id = cr.id AND srp.student_id = ?
     WHERE ch.track_subject_id = ?
       AND ch.is_published = 1
     GROUP BY ch.id, ch.title, ch.slug, ch.description, ch.display_order
     ORDER BY ch.display_order ASC, ch.title ASC`,
    [req.user.id, subject.track_subject_id]
  );

  // Attach quiz gating: has_quiz, quiz_passed, locked (previous chapter's quiz)
  let meta = {};
  try { meta = await getChapterQuizMeta(req.user.id, subject.track_subject_id); }
  catch { /* quiz tables not migrated yet — treat everything as unlocked */ }
  const chaptersWithGate = chapters.map(ch => ({
    ...ch,
    has_quiz: meta[ch.id]?.has_quiz ?? false,
    quiz_passed: meta[ch.id]?.quiz_passed ?? false,
    locked: meta[ch.id]?.locked ?? false,
  }));

  res.json({ track: context.track, subject, chapters: chaptersWithGate });
}

// GET /api/courses/subjects/:subjectSlug/chapters/:chapterSlug
async function getChapterDetail(req, res) {
  const context = await loadStudentTrackContext(req.user.id);
  if (context.missingTrack) return academicTrackRequired(res);
  if (!context.track?.id) return res.status(404).json({ message: 'Aucun programme n\'est encore configure pour cette classe.' });

  const [chapterRows] = await db.query(
    `SELECT
       ch.id,
       ch.title,
       ch.slug,
       ch.description,
       ch.display_order,
       ch.track_subject_id,
       s.id AS subject_id,
       s.name AS subject_name,
       s.slug AS subject_slug,
       COALESCE(ts.description, s.description) AS subject_description,
       ts.cover_image,
       s.icon,
       s.color
     FROM chapters ch
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     WHERE ts.academic_track_id = ?
       AND s.slug = ?
       AND ch.slug = ?
       AND ts.is_published = 1
       AND ch.is_published = 1
       AND s.is_active = 1
     LIMIT 1`,
    [context.track.id, req.params.subjectSlug, req.params.chapterSlug]
  );
  const chapter = chapterRows[0];
  if (!chapter) return res.status(404).json({ message: 'Chapitre introuvable pour cette classe.' });

  // Gate: block content if the previous chapter's quiz hasn't been passed
  try {
    const meta = await getChapterQuizMeta(req.user.id, chapter.track_subject_id);
    if (meta[chapter.id]?.locked) {
      return res.status(403).json({
        code: 'QUIZ_LOCKED',
        message: 'Réussis le quiz du chapitre précédent pour débloquer ce chapitre.',
      });
    }
  } catch { /* quiz tables not migrated — no gating */ }

  const [resources] = await db.query(
    `SELECT
       cr.id, cr.chapter_id, cr.resource_type, cr.title, cr.description,
       cr.file_url, cr.external_url, cr.duration_minutes, cr.display_order,
       IF(srp.id IS NOT NULL, 1, 0) AS is_completed
     FROM chapter_resources cr
     LEFT JOIN student_resource_progress srp
       ON srp.resource_id = cr.id AND srp.student_id = ?
     WHERE cr.chapter_id = ?
       AND cr.is_published = 1
     ORDER BY cr.display_order ASC, cr.title ASC`,
    [req.user.id, chapter.id]
  );

  res.json({
    track: context.track,
    subject: {
      id: chapter.subject_id,
      name: chapter.subject_name,
      slug: chapter.subject_slug,
      description: chapter.subject_description,
      cover_image: chapter.cover_image,
      icon: chapter.icon,
      color: chapter.color,
    },
    chapter: {
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      description: chapter.description,
      display_order: chapter.display_order,
    },
    resources,
  });
}

// GET /api/courses
async function getAll(req, res) {
  const { category, search } = req.query;
  const includeAll = req.user.role === 'admin' && req.query.include_all === 'true';
  const ownOnly = req.query.mine === 'true' && (req.user.role === 'teacher' || req.user.role === 'admin');
  let sql = `
    SELECT c.*, u.first_name, u.last_name
    FROM courses c
    JOIN users u ON u.id = c.teacher_id
    WHERE 1 = 1
  `;
  const params = [];

  if (ownOnly) {
    sql += ' AND c.teacher_id = ?';
    params.push(req.user.id);
  } else if (!includeAll) {
    sql += ' AND c.is_published = 1';
  }

  if (category) { sql += ' AND c.category = ?'; params.push(category); }
  if (search)   { sql += ' AND c.title LIKE ?';  params.push(`%${search}%`); }

  sql += ' ORDER BY c.created_at DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}

// GET /api/courses/:id
async function getOne(req, res) {
  const [rows] = await db.query(
    `SELECT c.*, u.first_name, u.last_name, u.avatar_url
     FROM courses c
     JOIN users u ON u.id = c.teacher_id
     WHERE c.id = ?`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Cours introuvable.' });
  res.json(rows[0]);
}

// GET /api/courses/:id/outline  (owner teacher or admin)
async function getTeacherOutline(req, res) {
  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  const [chapterRows] = await db.query(
    `SELECT id, course_id, title, slug, description, display_order, is_published, created_at, updated_at
     FROM course_chapters
     WHERE course_id = ?
     ORDER BY display_order ASC, title ASC`,
    [course.id]
  );

  const [resourceRows] = await db.query(
    `SELECT id, chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published, created_at, updated_at
     FROM course_resources
     WHERE chapter_id IN (
       SELECT id FROM course_chapters WHERE course_id = ?
     )
     ORDER BY display_order ASC, title ASC`,
    [course.id]
  );

  const resourcesByChapter = resourceRows.reduce((acc, resource) => {
    if (!acc[resource.chapter_id]) acc[resource.chapter_id] = [];
    acc[resource.chapter_id].push(resource);
    return acc;
  }, {});

  const chapters = chapterRows.map((chapter) => ({
    ...chapter,
    resources: resourcesByChapter[chapter.id] || [],
  }));

  res.json({ course, chapters });
}

// GET /api/courses/:id/students  (owner teacher or admin)
async function getTeacherStudents(req, res) {
  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  const [students] = await db.query(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       u.avatar_url,
       u.college,
       u.school_cycle,
       u.grade_code,
       u.section_code,
       e.progress,
       e.completed,
       e.enrolled_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.course_id = ?
     ORDER BY e.enrolled_at DESC, u.last_name ASC, u.first_name ASC`,
    [course.id]
  );

  const totalStudents = students.length;
  const completedStudents = students.filter((student) => Boolean(student.completed)).length;
  const avgProgress = totalStudents
    ? Math.round(students.reduce((sum, student) => sum + Number(student.progress || 0), 0) / totalStudents)
    : 0;

  res.json({
    course,
    stats: {
      total_students: totalStudents,
      completed_students: completedStudents,
      avg_progress: avgProgress,
    },
    students,
  });
}

// POST /api/courses  (teacher or admin only)
async function create(req, res) {
  if (handleValidationErrors(req, res)) return;

  const { title, description, category, price, duration_hours, lessons_count, cover_image } = req.body;
  const [result] = await db.query(
    `INSERT INTO courses (title, description, teacher_id, category, price, duration_hours, lessons_count, cover_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, req.user.id, category || null, price || 0, duration_hours || 0, lessons_count || 0, cover_image || null]
  );
  res.status(201).json({ message: 'Cours cree.', id: result.insertId });
}

// POST /api/courses/:id/chapters  (owner teacher or admin)
async function createCourseChapter(req, res) {
  if (handleValidationErrors(req, res)) return;

  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  const { title, slug, description, display_order, is_published } = req.body;
  const [result] = await db.query(
    `INSERT INTO course_chapters (course_id, title, slug, description, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [course.id, title, slug, description || null, display_order || 0, is_published === undefined ? 0 : is_published]
  );

  res.status(201).json({ message: 'Chapitre cree.', id: result.insertId });
}

// PUT /api/courses/:id  (owner teacher or admin)
async function update(req, res) {
  if (handleValidationErrors(req, res)) return;

  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  const fields = ['title','description','category','price','duration_hours','lessons_count','cover_image','is_published'];
  const updates = [];
  const params  = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  });
  if (updates.length === 0) return res.status(400).json({ message: 'Aucune modification a enregistrer.' });

  params.push(req.params.id);
  await db.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Cours mis a jour.' });
}

// PUT /api/courses/chapters/:chapterId  (owner teacher or admin)
async function updateCourseChapter(req, res) {
  if (handleValidationErrors(req, res)) return;

  const chapter = await loadOwnedCourseChapter(req.params.chapterId, req.user, res);
  if (!chapter) return;

  const fields = ['title', 'slug', 'description', 'display_order', 'is_published'];
  const updates = [];
  const params = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Aucune modification a enregistrer.' });
  }

  params.push(chapter.id);
  await db.query(`UPDATE course_chapters SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Chapitre mis a jour.' });
}

// DELETE /api/courses/:id  (owner teacher or admin)
async function remove(req, res) {
  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
  res.json({ message: 'Cours supprime.' });
}

// DELETE /api/courses/chapters/:chapterId  (owner teacher or admin)
async function deleteCourseChapter(req, res) {
  const chapter = await loadOwnedCourseChapter(req.params.chapterId, req.user, res);
  if (!chapter) return;

  await db.query('DELETE FROM course_chapters WHERE id = ?', [chapter.id]);
  res.json({ message: 'Chapitre supprime.' });
}

// POST /api/courses/:id/resources  (owner teacher or admin)
async function createCourseResource(req, res) {
  if (handleValidationErrors(req, res)) return;

  const course = await loadOwnedCourse(req.params.id, req.user, res);
  if (!course) return;

  const [chapterRows] = await db.query(
    'SELECT id FROM course_chapters WHERE id = ? AND course_id = ?',
    [req.body.chapter_id, course.id]
  );
  if (!chapterRows[0]) {
    return res.status(400).json({ message: 'Le chapitre choisi est invalide pour ce cours.' });
  }

  const { chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published } = req.body;
  const [result] = await db.query(
    `INSERT INTO course_resources (chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [chapter_id, resource_type, title, description || null, file_url || null, external_url || null, duration_minutes || null, display_order || 0, is_published === undefined ? 0 : is_published]
  );

  res.status(201).json({ message: 'Ressource creee.', id: result.insertId });
}

// PUT /api/courses/resources/:resourceId  (owner teacher or admin)
async function updateCourseResource(req, res) {
  if (handleValidationErrors(req, res)) return;

  const resource = await loadOwnedCourseResource(req.params.resourceId, req.user, res);
  if (!resource) return;

  if (req.body.chapter_id !== undefined) {
    const [chapterRows] = await db.query(
      'SELECT id FROM course_chapters WHERE id = ? AND course_id = ?',
      [req.body.chapter_id, resource.course_id]
    );
    if (!chapterRows[0]) {
      return res.status(400).json({ message: 'Le chapitre choisi est invalide pour ce cours.' });
    }
  }

  const fields = ['chapter_id', 'resource_type', 'title', 'description', 'file_url', 'external_url', 'duration_minutes', 'display_order', 'is_published'];
  const updates = [];
  const params = [];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Aucune modification a enregistrer.' });
  }

  params.push(resource.id);
  await db.query(`UPDATE course_resources SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Ressource mise a jour.' });
}

// DELETE /api/courses/resources/:resourceId  (owner teacher or admin)
async function deleteCourseResource(req, res) {
  const resource = await loadOwnedCourseResource(req.params.resourceId, req.user, res);
  if (!resource) return;

  await db.query('DELETE FROM course_resources WHERE id = ?', [resource.id]);
  res.json({ message: 'Ressource supprimee.' });
}

// GET /api/courses/stats/me  (student only)
async function getMyStats(req, res) {
  const studentId = req.user.id;

  // Overview
  const [enrollRows] = await db.query(
    `SELECT
       COUNT(*)                                        AS total_enrollments,
       COALESCE(SUM(e.completed), 0)                  AS completed_courses,
       COALESCE(ROUND(AVG(e.progress)), 0)            AS avg_progress,
       COALESCE(SUM(CASE WHEN e.completed = 0 THEN 1 ELSE 0 END), 0) AS in_progress
     FROM enrollments e
     WHERE e.student_id = ?`,
    [studentId]
  );

  // Per-course progress (for bar chart) — last 10 enrolled
  const [courseRows] = await db.query(
    `SELECT
       c.id,
       c.title,
       COALESCE(c.category, 'General') AS category,
       e.progress,
       e.completed,
       e.enrolled_at
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = ?
     ORDER BY e.enrolled_at DESC
     LIMIT 10`,
    [studentId]
  );

  // Monthly enrollment timeline (last 6 months)
  const [timelineRows] = await db.query(
    `SELECT
       DATE_FORMAT(e.enrolled_at, '%Y-%m') AS month,
       COUNT(*)                             AS count
     FROM enrollments e
     WHERE e.student_id = ?
       AND e.enrolled_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(e.enrolled_at, '%Y-%m')
     ORDER BY month ASC`,
    [studentId]
  );

  // Category distribution
  const [categoryRows] = await db.query(
    `SELECT
       COALESCE(c.category, 'General') AS category,
       COUNT(*)                         AS count,
       ROUND(AVG(e.progress))           AS avg_progress
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = ?
     GROUP BY COALESCE(c.category, 'General')
     ORDER BY count DESC`,
    [studentId]
  );

  res.json({
    overview:   enrollRows[0],
    courses:    courseRows,
    timeline:   timelineRows,
    categories: categoryRows,
  });
}

// GET /api/courses/progress/me  (curriculum-based progress dashboard)
async function getMyProgress(req, res) {
  const studentId = req.user.id;
  const context = await loadStudentTrackContext(studentId);
  if (context.missingTrack) return academicTrackRequired(res);
  if (!context.track?.id) {
    return res.json({ track: null, subjects: [], totals: { chapters_completed: 0, chapters_total: 0, resources_completed: 0, resources_total: 0, quizzes_passed: 0, khlayel_sessions: 0, overall_pct: 0 }, weak_chapters: [], recent: [] });
  }
  const trackId = context.track.id;

  // Per-subject progress
  const [subjects] = await db.query(
    `SELECT s.id, s.name, s.slug, s.icon, s.color,
       COUNT(DISTINCT cr.id) AS total_resources,
       COUNT(DISTINCT srp.resource_id) AS completed_resources
     FROM track_subjects ts
     JOIN subjects s ON s.id = ts.subject_id
     LEFT JOIN chapters ch ON ch.track_subject_id = ts.id AND ch.is_published = 1
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.is_published = 1
     LEFT JOIN student_resource_progress srp ON srp.resource_id = cr.id AND srp.student_id = ?
     WHERE ts.academic_track_id = ? AND ts.is_published = 1 AND s.is_active = 1
     GROUP BY s.id, s.name, s.slug, s.icon, s.color
     ORDER BY s.name ASC`,
    [studentId, trackId]
  );
  const subjectsOut = subjects.map(s => ({
    ...s,
    pct: s.total_resources > 0 ? Math.round((s.completed_resources / s.total_resources) * 100) : 0,
  }));

  // Per-chapter completion (for chapters_completed + weak list)
  const [chapters] = await db.query(
    `SELECT ch.id, ch.title, s.name AS subject,
       COUNT(cr.id) AS total,
       COUNT(srp.resource_id) AS done
     FROM chapters ch
     JOIN track_subjects ts ON ts.id = ch.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.is_published = 1
     LEFT JOIN student_resource_progress srp ON srp.resource_id = cr.id AND srp.student_id = ?
     WHERE ts.academic_track_id = ? AND ch.is_published = 1
     GROUP BY ch.id, ch.title, s.name`,
    [studentId, trackId]
  );
  const chaptersTotal = chapters.length;
  const chaptersCompleted = chapters.filter(c => c.total > 0 && c.done >= c.total).length;
  const resourcesTotal = subjects.reduce((n, s) => n + Number(s.total_resources), 0);
  const resourcesCompleted = subjects.reduce((n, s) => n + Number(s.completed_resources), 0);

  // Quizzes passed + weak chapters (failed, none passed) — degrade if not migrated
  let quizzesPassed = 0;
  let weakChapters = [];
  try {
    const [[qp]] = await db.query(
      `SELECT COUNT(DISTINCT chapter_id) AS c FROM quiz_attempts WHERE user_id = ? AND passed = 1`,
      [studentId]
    );
    quizzesPassed = Number(qp?.c) || 0;
    const [weak] = await db.query(
      `SELECT ch.id, ch.title, s.name AS subject
       FROM quiz_attempts qa
       JOIN chapters ch ON ch.id = qa.chapter_id
       JOIN track_subjects ts ON ts.id = ch.track_subject_id
       JOIN subjects s ON s.id = ts.subject_id
       WHERE qa.user_id = ? AND ts.academic_track_id = ?
       GROUP BY ch.id, ch.title, s.name
       HAVING MAX(qa.passed) = 0
       LIMIT 6`,
      [studentId, trackId]
    );
    weakChapters = weak;
  } catch { /* quiz tables not migrated */ }

  // If no failed quizzes, surface least-progressed started chapters as "à revoir"
  if (weakChapters.length === 0) {
    weakChapters = chapters
      .filter(c => c.total > 0 && c.done > 0 && c.done < c.total)
      .sort((a, b) => (a.done / a.total) - (b.done / b.total))
      .slice(0, 4)
      .map(c => ({ id: c.id, title: c.title, subject: c.subject }));
  }

  // Khlayel sessions
  let khlayelSessions = 0;
  try {
    const [[ks]] = await db.query(`SELECT COUNT(*) AS c FROM ai_conversations WHERE user_id = ?`, [studentId]);
    khlayelSessions = Number(ks?.c) || 0;
  } catch { /* table absent */ }

  const overallPct = resourcesTotal > 0 ? Math.round((resourcesCompleted / resourcesTotal) * 100) : 0;

  res.json({
    track: context.track,
    subjects: subjectsOut,
    totals: {
      chapters_completed: chaptersCompleted,
      chapters_total: chaptersTotal,
      resources_completed: resourcesCompleted,
      resources_total: resourcesTotal,
      quizzes_passed: quizzesPassed,
      khlayel_sessions: khlayelSessions,
      overall_pct: overallPct,
    },
    weak_chapters: weakChapters,
  });
}

// GET /api/courses/:id/content  (enrolled student)
async function getCourseContent(req, res) {
  const courseId = req.params.id;

  const [enrollRows] = await db.query(
    'SELECT id, progress, completed FROM enrollments WHERE student_id = ? AND course_id = ?',
    [req.user.id, courseId]
  );
  if (!enrollRows[0]) {
    return res.status(403).json({ message: 'Vous n\'etes pas inscrit a ce cours.' });
  }

  const [courseRows] = await db.query(
    `SELECT c.*, u.first_name, u.last_name
     FROM courses c
     JOIN users u ON u.id = c.teacher_id
     WHERE c.id = ?`,
    [courseId]
  );
  if (!courseRows[0]) return res.status(404).json({ message: 'Cours introuvable.' });

  const [chapterRows] = await db.query(
    `SELECT id, title, slug, description, display_order
     FROM course_chapters
     WHERE course_id = ? AND is_published = 1
     ORDER BY display_order ASC, title ASC`,
    [courseId]
  );

  const [resourceRows] = await db.query(
    `SELECT id, chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order
     FROM course_resources
     WHERE chapter_id IN (
       SELECT id FROM course_chapters WHERE course_id = ? AND is_published = 1
     )
     AND is_published = 1
     ORDER BY display_order ASC, title ASC`,
    [courseId]
  );

  const resourcesByChapter = resourceRows.reduce((acc, r) => {
    if (!acc[r.chapter_id]) acc[r.chapter_id] = [];
    acc[r.chapter_id].push(r);
    return acc;
  }, {});

  const chapters = chapterRows.map((chapter) => ({
    ...chapter,
    resources: resourcesByChapter[chapter.id] || [],
  }));

  res.json({
    course: courseRows[0],
    enrollment: enrollRows[0],
    chapters,
  });
}

// PATCH /api/courses/:id/progress  (enrolled student)
async function updateProgress(req, res) {
  const courseId = req.params.id;

  const [enrollRows] = await db.query(
    'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
    [req.user.id, courseId]
  );
  if (!enrollRows[0]) {
    return res.status(403).json({ message: 'Vous n\'etes pas inscrit a ce cours.' });
  }

  const { progress, completed } = req.body;
  const updates = [];
  const params  = [];

  if (progress !== undefined) {
    updates.push('progress = ?');
    params.push(Math.min(100, Math.max(0, Number(progress))));
  }
  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0);
  }
  if (updates.length === 0) {
    return res.status(400).json({ message: 'Rien a mettre a jour.' });
  }

  params.push(req.user.id, courseId);
  await db.query(
    `UPDATE enrollments SET ${updates.join(', ')} WHERE student_id = ? AND course_id = ?`,
    params
  );
  res.json({ message: 'Progression mise a jour.' });
}

// POST /api/courses/:id/enroll  (student only)
async function enroll(req, res) {
  const courseId = req.params.id;
  const [existing] = await db.query(
    'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
    [req.user.id, courseId]
  );
  if (existing.length > 0) return res.status(409).json({ message: 'Vous etes deja inscrit a ce cours.' });

  await db.query(
    'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
    [req.user.id, courseId]
  );
  res.status(201).json({ message: 'Inscription au cours enregistree.' });
}

// GET /api/courses/my-enrollments  (student)
async function myEnrollments(req, res) {
  const [rows] = await db.query(
    `SELECT c.*, e.progress, e.completed, e.enrolled_at
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = ?
     ORDER BY e.enrolled_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

// ─── Teacher subject assignment (admin manages) ───────────────────────────────

// GET /api/courses/admin/teacher-assignments
async function adminGetTeacherAssignments(req, res) {
  const [rows] = await db.query(
    `SELECT tsa.id, tsa.assigned_at,
            u.id AS teacher_id, u.first_name, u.last_name, u.email,
            ts.id AS track_subject_id,
            s.name AS subject_name, s.slug AS subject_slug,
            at.title AS track_title, at.grade_code, at.section_code
     FROM teacher_subject_assignments tsa
     JOIN users u ON u.id = tsa.teacher_id
     JOIN track_subjects ts ON ts.id = tsa.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     ORDER BY u.first_name, at.title, s.name`
  );
  res.json(rows);
}

// POST /api/courses/admin/teacher-assignments
async function adminCreateTeacherAssignment(req, res) {
  const { teacher_id, track_subject_id } = req.body;
  // Check teacher exists and has role teacher
  const [teachers] = await db.query(
    "SELECT id FROM users WHERE id = ? AND role = 'teacher'",
    [teacher_id]
  );
  if (!teachers[0]) return res.status(404).json({ message: 'Enseignant introuvable.' });

  // Check track_subject exists
  const [subjects] = await db.query(
    'SELECT id FROM track_subjects WHERE id = ?',
    [track_subject_id]
  );
  if (!subjects[0]) return res.status(404).json({ message: 'Matière introuvable.' });

  try {
    const [result] = await db.query(
      'INSERT INTO teacher_subject_assignments (teacher_id, track_subject_id, assigned_by) VALUES (?, ?, ?)',
      [teacher_id, track_subject_id, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Enseignant assigné avec succès.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cet enseignant est déjà assigné à une matière.' });
    }
    throw err;
  }
}

// DELETE /api/courses/admin/teacher-assignments/:id
async function adminDeleteTeacherAssignment(req, res) {
  const id = parseInt(req.params.id, 10);
  await db.query('DELETE FROM teacher_subject_assignments WHERE id = ?', [id]);
  res.json({ message: 'Assignation supprimée.' });
}

// ─── Teacher curriculum routes ────────────────────────────────────────────────

// Helper: load all teacher's assigned track_subject_ids
async function loadTeacherSubjectIds(teacherId) {
  const [rows] = await db.query(
    'SELECT track_subject_id FROM teacher_subject_assignments WHERE teacher_id = ?',
    [teacherId]
  );
  return rows.map(r => r.track_subject_id);
}

// GET /api/courses/teacher/my-subject  → returns all assigned subjects + their chapters
async function teacherGetMySubject(req, res) {
  const [assignments] = await db.query(
    `SELECT tsa.id AS assignment_id, tsa.track_subject_id,
            s.id AS subject_id, s.name AS subject_name, s.slug AS subject_slug,
            s.description AS subject_description, s.color AS subject_color,
            at.id AS track_id, at.title AS track_title,
            at.grade_code, at.section_code, at.school_cycle
     FROM teacher_subject_assignments tsa
     JOIN track_subjects ts ON ts.id = tsa.track_subject_id
     JOIN subjects s ON s.id = ts.subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     WHERE tsa.teacher_id = ?
     ORDER BY at.title, s.name`,
    [req.user.id]
  );

  if (!assignments.length) {
    return res.status(404).json({ code: 'NO_ASSIGNMENT', message: 'Aucune matière ne vous est assignée.' });
  }

  // For each assignment, get its chapters
  const result = await Promise.all(assignments.map(async (a) => {
    const [chapters] = await db.query(
      `SELECT ch.id, ch.title, ch.slug, ch.description, ch.display_order, ch.is_published,
              COUNT(cr.id) AS resource_count
       FROM chapters ch
       LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id
       WHERE ch.track_subject_id = ?
       GROUP BY ch.id
       ORDER BY ch.display_order ASC, ch.title ASC`,
      [a.track_subject_id]
    );
    return { ...a, chapters };
  }));

  res.json(result);
}

// POST /api/courses/teacher/chapters
async function teacherCreateChapter(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const { track_subject_id, title, slug, description, display_order, is_published } = req.body;
  if (!ids.includes(Number(track_subject_id))) return res.status(403).json({ message: 'Matière non assignée.' });

  const [result] = await db.query(
    `INSERT INTO chapters (track_subject_id, title, slug, description, display_order, is_published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [track_subject_id, title,
     slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
     description || null, display_order || 0, is_published ?? 1, req.user.id]
  );
  res.status(201).json({ id: result.insertId, message: 'Chapitre créé.' });
}

// PUT /api/courses/teacher/chapters/:id
async function teacherUpdateChapter(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const chapterId = parseInt(req.params.id, 10);
  const [rows] = await db.query(
    `SELECT id FROM chapters WHERE id = ? AND track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [chapterId, ...ids]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Chapitre introuvable.' });

  const { title, slug, description, display_order, is_published } = req.body;
  const updates = [];
  const params  = [];
  if (title         !== undefined) { updates.push('title = ?');         params.push(title); }
  if (slug          !== undefined) { updates.push('slug = ?');          params.push(slug); }
  if (description   !== undefined) { updates.push('description = ?');   params.push(description); }
  if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }
  if (is_published  !== undefined) { updates.push('is_published = ?');  params.push(is_published ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ message: 'Aucun champ à modifier.' });

  params.push(chapterId);
  await db.query(`UPDATE chapters SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Chapitre mis à jour.' });
}

// DELETE /api/courses/teacher/chapters/:id
async function teacherDeleteChapter(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const chapterId = parseInt(req.params.id, 10);
  const [rows] = await db.query(
    `SELECT id FROM chapters WHERE id = ? AND track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [chapterId, ...ids]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Chapitre introuvable.' });

  await db.query('DELETE FROM chapters WHERE id = ?', [chapterId]);
  res.json({ message: 'Chapitre supprimé.' });
}

// GET /api/courses/teacher/chapters/:id/resources
async function teacherGetResources(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const chapterId = parseInt(req.params.id, 10);
  const [chapters] = await db.query(
    `SELECT id FROM chapters WHERE id = ? AND track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [chapterId, ...ids]
  );
  if (!chapters[0]) return res.status(404).json({ message: 'Chapitre introuvable.' });

  const [rows] = await db.query(
    `SELECT id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published
     FROM chapter_resources WHERE chapter_id = ? ORDER BY display_order ASC, title ASC`,
    [chapterId]
  );
  res.json(rows);
}

// POST /api/courses/teacher/resources
async function teacherCreateResource(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const { chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published } = req.body;

  const [chapters] = await db.query(
    `SELECT id FROM chapters WHERE id = ? AND track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [chapter_id, ...ids]
  );
  if (!chapters[0]) return res.status(403).json({ message: 'Ce chapitre ne vous appartient pas.' });

  const [result] = await db.query(
    `INSERT INTO chapter_resources (chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [chapter_id, resource_type, title, description || null, file_url || null, external_url || null,
     duration_minutes || null, display_order || 0, is_published ?? 1]
  );
  res.status(201).json({ id: result.insertId, message: 'Ressource créée.' });
}

// PUT /api/courses/teacher/resources/:id
async function teacherUpdateResource(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const resourceId = parseInt(req.params.id, 10);
  const [rows] = await db.query(
    `SELECT cr.id FROM chapter_resources cr
     JOIN chapters ch ON ch.id = cr.chapter_id
     WHERE cr.id = ? AND ch.track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [resourceId, ...ids]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Ressource introuvable.' });

  const { resource_type, title, description, file_url, external_url, duration_minutes, display_order, is_published } = req.body;
  const updates = [];
  const params  = [];
  if (resource_type    !== undefined) { updates.push('resource_type = ?');    params.push(resource_type); }
  if (title            !== undefined) { updates.push('title = ?');            params.push(title); }
  if (description      !== undefined) { updates.push('description = ?');      params.push(description); }
  if (file_url         !== undefined) { updates.push('file_url = ?');         params.push(file_url || null); }
  if (external_url     !== undefined) { updates.push('external_url = ?');     params.push(external_url || null); }
  if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); params.push(duration_minutes || null); }
  if (display_order    !== undefined) { updates.push('display_order = ?');    params.push(display_order); }
  if (is_published     !== undefined) { updates.push('is_published = ?');     params.push(is_published ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ message: 'Aucun champ à modifier.' });

  params.push(resourceId);
  await db.query(`UPDATE chapter_resources SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Ressource mise à jour.' });
}

// DELETE /api/courses/teacher/resources/:id
async function teacherDeleteResource(req, res) {
  const ids = await loadTeacherSubjectIds(req.user.id);
  if (!ids.length) return res.status(403).json({ message: 'Aucune matière assignée.' });

  const resourceId = parseInt(req.params.id, 10);
  const [rows] = await db.query(
    `SELECT cr.id FROM chapter_resources cr
     JOIN chapters ch ON ch.id = cr.chapter_id
     WHERE cr.id = ? AND ch.track_subject_id IN (${ids.map(() => '?').join(',')})`,
    [resourceId, ...ids]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Ressource introuvable.' });

  await db.query('DELETE FROM chapter_resources WHERE id = ?', [resourceId]);
  res.json({ message: 'Ressource supprimée.' });
}

// ─── GET /api/courses/admin/unassigned-teachers  (all teachers — multi-subject allowed) ─
async function adminGetUnassignedTeachers(req, res) {
  const [rows] = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email
     FROM users u
     WHERE u.role = 'teacher'
     ORDER BY u.first_name`
  );
  res.json(rows);
}

// GET /api/courses/admin/track-subjects-list  (for assignment dropdown)
async function adminGetTrackSubjectsList(req, res) {
  const [rows] = await db.query(
    `SELECT ts.id, s.name AS subject_name, at.title AS track_title,
            at.grade_code, at.section_code
     FROM track_subjects ts
     JOIN subjects s ON s.id = ts.subject_id
     JOIN academic_tracks at ON at.id = ts.academic_track_id
     WHERE ts.is_published = 1 AND at.is_active = 1
     ORDER BY at.title, s.name`
  );
  res.json(rows);
}

// POST /api/courses/resources/:id/complete
async function markResourceComplete(req, res) {
  const resourceId = parseInt(req.params.id, 10);
  if (!resourceId) return res.status(400).json({ message: 'ID de ressource invalide.' });

  // Verify the resource exists and is published
  const [rows] = await db.query(
    'SELECT id FROM chapter_resources WHERE id = ? AND is_published = 1',
    [resourceId]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Ressource introuvable.' });

  await db.query(
    'INSERT IGNORE INTO student_resource_progress (student_id, resource_id) VALUES (?, ?)',
    [req.user.id, resourceId]
  );
  res.json({ completed: true });
}

// DELETE /api/courses/resources/:id/complete
async function unmarkResourceComplete(req, res) {
  const resourceId = parseInt(req.params.id, 10);
  if (!resourceId) return res.status(400).json({ message: 'ID de ressource invalide.' });

  await db.query(
    'DELETE FROM student_resource_progress WHERE student_id = ? AND resource_id = ?',
    [req.user.id, resourceId]
  );
  res.json({ completed: false });
}

module.exports = {
  adminGetCurriculum,
  adminUpdateTrack,
  adminDeleteTrack,
  adminToggleTrack,
  adminCreateSubject,
  adminUpdateSubject,
  adminDeleteSubject,
  adminToggleSubject,
  adminCreateTrackSubject,
  adminUpdateTrackSubject,
  adminDeleteTrackSubject,
  adminCreateChapter,
  adminUpdateChapter,
  adminDeleteChapter,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  getMySubjects,
  getSubjectChapters,
  getChapterDetail,
  markResourceComplete,
  unmarkResourceComplete,
  getAll,
  getOne,
  getTeacherOutline,
  getTeacherStudents,
  create,
  createCourseChapter,
  update,
  updateCourseChapter,
  remove,
  deleteCourseChapter,
  createCourseResource,
  updateCourseResource,
  deleteCourseResource,
  getCourseContent,
  updateProgress,
  enroll,
  myEnrollments,
  getMyStats,
  getMyProgress,
  // teacher assignments (admin)
  adminGetTeacherAssignments,
  adminCreateTeacherAssignment,
  adminDeleteTeacherAssignment,
  adminGetUnassignedTeachers,
  adminGetTrackSubjectsList,
  // teacher curriculum
  teacherGetMySubject,
  teacherCreateChapter,
  teacherUpdateChapter,
  teacherDeleteChapter,
  teacherGetResources,
  teacherCreateResource,
  teacherUpdateResource,
  teacherDeleteResource,
};
