const db = require('../config/db');
const { SECTION_REQUIRED_GRADES, inferSchoolCycle } = require('../utils/academic');
const { handleValidationErrors } = require('../utils/validation');

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
       SUM(CASE WHEN cr.resource_type = 'correction_sheet' THEN 1 ELSE 0 END) AS correction_count
     FROM chapters ch
     LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.is_published = 1
     WHERE ch.track_subject_id = ?
       AND ch.is_published = 1
     GROUP BY ch.id, ch.title, ch.slug, ch.description, ch.display_order
     ORDER BY ch.display_order ASC, ch.title ASC`,
    [subject.track_subject_id]
  );

  res.json({ track: context.track, subject, chapters });
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

  const [resources] = await db.query(
    `SELECT id, chapter_id, resource_type, title, description, file_url, external_url, duration_minutes, display_order
     FROM chapter_resources
     WHERE chapter_id = ?
       AND is_published = 1
     ORDER BY display_order ASC, title ASC`,
    [chapter.id]
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

module.exports = {
  adminGetCurriculum,
  adminCreateSubject,
  adminUpdateSubject,
  adminDeleteSubject,
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
  enroll,
  myEnrollments,
};
