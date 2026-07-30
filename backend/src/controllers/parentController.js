const db = require('../config/db');

async function loadLinkedChild(parentId, studentId) {
  const [rows] = await db.query(
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
       l.relation_type
     FROM parent_student_links l
     JOIN users u ON u.id = l.student_id
     WHERE l.parent_id = ?
       AND l.student_id = ?
       AND l.is_active = 1
       AND u.role = 'student'
     LIMIT 1`,
    [parentId, studentId]
  );

  return rows[0] || null;
}

// GET /api/parent/children
async function getChildren(req, res) {
  const [rows] = await db.query(
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
       l.relation_type,
       COUNT(e.id) AS enrolled_courses,
       COALESCE(SUM(CASE WHEN e.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_courses,
       COALESCE(ROUND(AVG(e.progress)), 0) AS avg_progress,
       (SELECT s.plan        FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() ORDER BY s.end_date DESC LIMIT 1) AS active_plan,
       (SELECT s.billing_cycle FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() ORDER BY s.end_date DESC LIMIT 1) AS active_billing_cycle,
       (SELECT s.start_date  FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() ORDER BY s.end_date DESC LIMIT 1) AS active_start_date,
       (SELECT s.end_date    FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() ORDER BY s.end_date DESC LIMIT 1) AS active_end_date,
       (SELECT DATEDIFF(s.end_date, CURDATE()) FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() ORDER BY s.end_date DESC LIMIT 1) AS active_days_remaining
     FROM parent_student_links l
     JOIN users u ON u.id = l.student_id
     LEFT JOIN enrollments e ON e.student_id = u.id
     WHERE l.parent_id = ?
       AND l.is_active = 1
       AND u.role = 'student'
     GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.college, u.school_cycle, u.grade_code, u.section_code, l.relation_type
     ORDER BY u.last_name ASC, u.first_name ASC`,
    [req.user.id]
  );

  res.json(rows);
}

// GET /api/parent/children/:studentId/progress
async function getChildProgress(req, res) {
  const child = await loadLinkedChild(req.user.id, Number(req.params.studentId));
  if (!child) {
    return res.status(404).json({ message: 'Enfant introuvable pour ce parent.' });
  }

  const [enrollments] = await db.query(
    `SELECT
       c.id,
       c.title,
       c.category,
       c.cover_image,
       c.first_name,
       c.last_name,
       e.progress,
       e.completed,
       e.enrolled_at
     FROM enrollments e
     JOIN (
       SELECT c.id, c.title, c.category, c.cover_image, u.first_name, u.last_name
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
     ) c ON c.id = e.course_id
     WHERE e.student_id = ?
     ORDER BY e.enrolled_at DESC`,
    [child.id]
  );

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((enrollment) => Boolean(enrollment.completed)).length;
  const avgProgress = totalCourses
    ? Math.round(enrollments.reduce((sum, enrollment) => sum + Number(enrollment.progress || 0), 0) / totalCourses)
    : 0;

  const [subRows] = await db.query(
    `SELECT plan, billing_cycle, start_date, end_date,
            DATEDIFF(end_date, CURDATE()) AS days_remaining
     FROM subscriptions
     WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
     ORDER BY end_date DESC LIMIT 1`,
    [child.id]
  );

  res.json({
    child,
    subscription: subRows[0] || null,
    stats: {
      total_courses: totalCourses,
      completed_courses: completedCourses,
      avg_progress: avgProgress,
    },
    enrollments,
  });
}

module.exports = {
  getChildren,
  getChildProgress,
};