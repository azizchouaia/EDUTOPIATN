INSERT INTO subjects (
  name,
  slug,
  description,
  icon,
  color,
  is_active
) VALUES
  ('Maths', 'maths', 'Core mathematics curriculum with lessons, exercises, and corrections.', 'calculator', '#7d1022', 1),
  ('Francais', 'francais', 'Reading, grammar, and written expression for Tunisian students.', 'book-open', '#9a7a2b', 1),
  ('Arabe', 'arabe', 'Arabic language support with texts, grammar, and writing practice.', 'languages', '#1f5f4a', 1),
  ('Sciences', 'sciences', 'Life and earth sciences with guided activities.', 'flask-conical', '#0f766e', 1),
  ('Physique', 'physique', 'Physics fundamentals, guided problems, and corrections.', 'atom', '#1d4ed8', 1),
  ('Informatique', 'informatique', 'Algorithms, digital tools, and practical exercises.', 'monitor-smartphone', '#7c3aed', 1),
  ('Economie', 'economie', 'Economic analysis, case studies, and applied exercises.', 'line-chart', '#b45309', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon),
  color = VALUES(color),
  is_active = VALUES(is_active);

INSERT INTO track_subjects (
  academic_track_id,
  subject_id,
  description,
  display_order,
  is_published
)
SELECT
  at.id,
  s.id,
  CONCAT(s.name, ' for ', at.title),
  CASE s.slug
    WHEN 'maths' THEN 10
    WHEN 'francais' THEN 20
    WHEN 'arabe' THEN 30
  END,
  1
FROM academic_tracks at
JOIN subjects s ON s.slug IN ('maths', 'francais', 'arabe')
LEFT JOIN track_subjects ts ON ts.academic_track_id = at.id AND ts.subject_id = s.id
WHERE ts.id IS NULL;

INSERT INTO track_subjects (
  academic_track_id,
  subject_id,
  description,
  display_order,
  is_published
)
SELECT
  at.id,
  s.id,
  CONCAT(s.name, ' for ', at.title),
  CASE s.slug
    WHEN 'sciences' THEN 40
    WHEN 'physique' THEN 50
    WHEN 'informatique' THEN 60
    WHEN 'economie' THEN 70
  END,
  1
FROM academic_tracks at
JOIN subjects s ON (
  (s.slug = 'sciences' AND (at.school_cycle = 'college' OR at.section_code = 'science')) OR
  (s.slug = 'physique' AND at.school_cycle = 'lycee' AND (at.section_code IS NULL OR at.section_code IN ('science', 'math', 'technique'))) OR
  (s.slug = 'informatique' AND at.school_cycle = 'lycee' AND (at.section_code IS NULL OR at.section_code IN ('info', 'math'))) OR
  (s.slug = 'economie' AND at.school_cycle = 'lycee' AND at.section_code = 'eco')
)
LEFT JOIN track_subjects ts ON ts.academic_track_id = at.id AND ts.subject_id = s.id
WHERE ts.id IS NULL;

INSERT INTO chapters (
  track_subject_id,
  title,
  slug,
  description,
  display_order,
  is_published
)
SELECT
  ts.id,
  CASE s.slug
    WHEN 'maths' THEN 'Calcul et raisonnement'
    WHEN 'francais' THEN 'Lecture et comprehension'
    WHEN 'arabe' THEN 'Lecture et langue'
    WHEN 'sciences' THEN 'Notions scientifiques'
    WHEN 'physique' THEN 'Concepts essentiels'
    WHEN 'informatique' THEN 'Algorithmique'
    WHEN 'economie' THEN 'Fondamentaux d''economie'
  END,
  CASE s.slug
    WHEN 'maths' THEN 'calcul-et-raisonnement'
    WHEN 'francais' THEN 'lecture-et-comprehension'
    WHEN 'arabe' THEN 'lecture-et-langue'
    WHEN 'sciences' THEN 'notions-scientifiques'
    WHEN 'physique' THEN 'concepts-essentiels'
    WHEN 'informatique' THEN 'algorithmique'
    WHEN 'economie' THEN 'fondamentaux-economie'
  END,
  CONCAT('Starter lesson for ', s.name, ' in ', at.title, '.'),
  10,
  1
FROM track_subjects ts
JOIN subjects s ON s.id = ts.subject_id
JOIN academic_tracks at ON at.id = ts.academic_track_id
LEFT JOIN chapters ch ON ch.track_subject_id = ts.id AND ch.slug = CASE s.slug
  WHEN 'maths' THEN 'calcul-et-raisonnement'
  WHEN 'francais' THEN 'lecture-et-comprehension'
  WHEN 'arabe' THEN 'lecture-et-langue'
  WHEN 'sciences' THEN 'notions-scientifiques'
  WHEN 'physique' THEN 'concepts-essentiels'
  WHEN 'informatique' THEN 'algorithmique'
  WHEN 'economie' THEN 'fondamentaux-economie'
END
WHERE ch.id IS NULL;

INSERT INTO chapters (
  track_subject_id,
  title,
  slug,
  description,
  display_order,
  is_published
)
SELECT
  ts.id,
  CASE s.slug
    WHEN 'maths' THEN 'Serie d''exercices'
    WHEN 'francais' THEN 'Expression ecrite'
    WHEN 'arabe' THEN 'Production ecrite'
    WHEN 'sciences' THEN 'Travaux diriges'
    WHEN 'physique' THEN 'Applications et exercices'
    WHEN 'informatique' THEN 'Applications pratiques'
    WHEN 'economie' THEN 'Etude de cas'
  END,
  CASE s.slug
    WHEN 'maths' THEN 'serie-exercices'
    WHEN 'francais' THEN 'expression-ecrite'
    WHEN 'arabe' THEN 'production-ecrite'
    WHEN 'sciences' THEN 'travaux-diriges'
    WHEN 'physique' THEN 'applications-exercices'
    WHEN 'informatique' THEN 'applications-pratiques'
    WHEN 'economie' THEN 'etude-de-cas'
  END,
  CONCAT('Guided practice for ', s.name, ' in ', at.title, '.'),
  20,
  1
FROM track_subjects ts
JOIN subjects s ON s.id = ts.subject_id
JOIN academic_tracks at ON at.id = ts.academic_track_id
LEFT JOIN chapters ch ON ch.track_subject_id = ts.id AND ch.slug = CASE s.slug
  WHEN 'maths' THEN 'serie-exercices'
  WHEN 'francais' THEN 'expression-ecrite'
  WHEN 'arabe' THEN 'production-ecrite'
  WHEN 'sciences' THEN 'travaux-diriges'
  WHEN 'physique' THEN 'applications-exercices'
  WHEN 'informatique' THEN 'applications-pratiques'
  WHEN 'economie' THEN 'etude-de-cas'
END
WHERE ch.id IS NULL;

INSERT INTO chapter_resources (
  chapter_id,
  resource_type,
  title,
  description,
  file_url,
  external_url,
  duration_minutes,
  display_order,
  is_published
)
SELECT
  ch.id,
  'pdf_lesson',
  CONCAT('PDF lesson - ', ch.title),
  'Structured lesson notes for this chapter.',
  NULL,
  NULL,
  NULL,
  10,
  1
FROM chapters ch
LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.resource_type = 'pdf_lesson'
WHERE cr.id IS NULL;

INSERT INTO chapter_resources (
  chapter_id,
  resource_type,
  title,
  description,
  file_url,
  external_url,
  duration_minutes,
  display_order,
  is_published
)
SELECT
  ch.id,
  'video_lesson',
  CONCAT('Video lesson - ', ch.title),
  'Short video explanation for the key ideas in this chapter.',
  NULL,
  NULL,
  12,
  20,
  1
FROM chapters ch
LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.resource_type = 'video_lesson'
WHERE cr.id IS NULL;

INSERT INTO chapter_resources (
  chapter_id,
  resource_type,
  title,
  description,
  file_url,
  external_url,
  duration_minutes,
  display_order,
  is_published
)
SELECT
  ch.id,
  'exercise_sheet',
  CONCAT('Exercises - ', ch.title),
  'Practice sheet for the learner.',
  NULL,
  NULL,
  NULL,
  30,
  1
FROM chapters ch
LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.resource_type = 'exercise_sheet'
WHERE cr.id IS NULL;

INSERT INTO chapter_resources (
  chapter_id,
  resource_type,
  title,
  description,
  file_url,
  external_url,
  duration_minutes,
  display_order,
  is_published
)
SELECT
  ch.id,
  'correction_sheet',
  CONCAT('Corrections - ', ch.title),
  'Correction sheet with model answers.',
  NULL,
  NULL,
  NULL,
  40,
  1
FROM chapters ch
LEFT JOIN chapter_resources cr ON cr.chapter_id = ch.id AND cr.resource_type = 'correction_sheet'
WHERE cr.id IS NULL;