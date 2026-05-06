const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/courseController');
const auth     = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { requireActiveSubscription } = require('../middleware/subscriptionAccess');
const { isHexColor, isHttpUrl, isSlug } = require('../utils/validation');

const subjectCreateValidators = [
  body('name').trim().isLength({ min: 2 }).withMessage('Le nom de la matiere doit contenir au moins 2 caracteres.'),
  body('slug').trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('color').optional({ values: 'falsy' }).custom((value) => {
    if (!isHexColor(value)) throw new Error('La couleur doit etre un code hexadecimal valide.');
    return true;
  }),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

const subjectUpdateValidators = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Le nom de la matiere doit contenir au moins 2 caracteres.'),
  body('slug').optional().trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('color').optional({ values: 'falsy' }).custom((value) => {
    if (!isHexColor(value)) throw new Error('La couleur doit etre un code hexadecimal valide.');
    return true;
  }),
  body('is_active').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut est invalide.'),
];

const trackSubjectCreateValidators = [
  body('academic_track_id').isInt({ min: 1 }).withMessage('Le parcours academique est invalide.'),
  body('subject_id').isInt({ min: 1 }).withMessage('La matiere est invalide.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('cover_image').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image de couverture est invalide.');
    return true;
  }),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const trackSubjectUpdateValidators = [
  body('academic_track_id').optional().isInt({ min: 1 }).withMessage('Le parcours academique est invalide.'),
  body('subject_id').optional().isInt({ min: 1 }).withMessage('La matiere est invalide.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('cover_image').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image de couverture est invalide.');
    return true;
  }),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const chapterCreateValidators = [
  body('track_subject_id').isInt({ min: 1 }).withMessage('La matiere assignee est invalide.'),
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre du chapitre doit contenir au moins 3 caracteres.'),
  body('slug').trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const chapterUpdateValidators = [
  body('track_subject_id').optional().isInt({ min: 1 }).withMessage('La matiere assignee est invalide.'),
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Le titre du chapitre doit contenir au moins 3 caracteres.'),
  body('slug').optional().trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const resourceTypes = ['pdf_lesson', 'video_lesson', 'exercise_sheet', 'correction_sheet', 'extra_resource'];
const resourceCreateValidators = [
  body('chapter_id').isInt({ min: 1 }).withMessage('Le chapitre est invalide.'),
  body('resource_type').isIn(resourceTypes).withMessage('Le type de ressource est invalide.'),
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre de la ressource doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('file_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL du fichier est invalide.');
    return true;
  }),
  body('external_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL externe est invalide.');
    return true;
  }),
  body().custom((value) => {
    if (!value.file_url && !value.external_url) {
      throw new Error('Ajoutez une URL de fichier ou une URL externe.');
    }
    return true;
  }),
  body('duration_minutes').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const resourceUpdateValidators = [
  body('chapter_id').optional().isInt({ min: 1 }).withMessage('Le chapitre est invalide.'),
  body('resource_type').optional().isIn(resourceTypes).withMessage('Le type de ressource est invalide.'),
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Le titre de la ressource doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('file_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL du fichier est invalide.');
    return true;
  }),
  body('external_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL externe est invalide.');
    return true;
  }),
  body('duration_minutes').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const flatCourseCreateValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre du cours doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Le prix doit etre superieur ou egal a 0.'),
  body('duration_hours').optional().isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('lessons_count').optional().isInt({ min: 0 }).withMessage('Le nombre de lecons doit etre superieur ou egal a 0.'),
  body('cover_image').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image de couverture est invalide.');
    return true;
  }),
];

const flatCourseUpdateValidators = [
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Le titre du cours doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('La categorie est invalide.'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Le prix doit etre superieur ou egal a 0.'),
  body('duration_hours').optional().isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('lessons_count').optional().isInt({ min: 0 }).withMessage('Le nombre de lecons doit etre superieur ou egal a 0.'),
  body('cover_image').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL de l\'image de couverture est invalide.');
    return true;
  }),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const teacherChapterCreateValidators = [
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre du chapitre doit contenir au moins 3 caracteres.'),
  body('slug').trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const teacherChapterUpdateValidators = [
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Le titre du chapitre doit contenir au moins 3 caracteres.'),
  body('slug').optional().trim().custom((value) => {
    if (!isSlug(value)) throw new Error('Le slug doit etre en minuscules avec des tirets.');
    return true;
  }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const teacherResourceCreateValidators = [
  body('chapter_id').isInt({ min: 1 }).withMessage('Le chapitre est invalide.'),
  body('resource_type').isIn(resourceTypes).withMessage('Le type de ressource est invalide.'),
  body('title').trim().isLength({ min: 3 }).withMessage('Le titre de la ressource doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('file_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL du fichier est invalide.');
    return true;
  }),
  body('external_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL externe est invalide.');
    return true;
  }),
  body().custom((value) => {
    if (!value.file_url && !value.external_url) {
      throw new Error('Ajoutez une URL de fichier ou une URL externe.');
    }
    return true;
  }),
  body('duration_minutes').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

const teacherResourceUpdateValidators = [
  body('chapter_id').optional().isInt({ min: 1 }).withMessage('Le chapitre est invalide.'),
  body('resource_type').optional().isIn(resourceTypes).withMessage('Le type de ressource est invalide.'),
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Le titre de la ressource doit contenir au moins 3 caracteres.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ min: 10 }).withMessage('La description doit contenir au moins 10 caracteres.'),
  body('file_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL du fichier est invalide.');
    return true;
  }),
  body('external_url').optional({ values: 'falsy' }).custom((value) => {
    if (!isHttpUrl(value)) throw new Error('L\'URL externe est invalide.');
    return true;
  }),
  body('duration_minutes').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('La duree doit etre superieure ou egale a 0.'),
  body('display_order').optional().isInt({ min: 0 }).withMessage('L\'ordre d\'affichage doit etre superieur ou egal a 0.'),
  body('is_published').optional().isIn([0, 1, '0', '1', true, false]).withMessage('Le statut de publication est invalide.'),
];

router.get('/admin/curriculum', auth, authorize('admin'), ctrl.adminGetCurriculum);
router.post('/admin/subjects', auth, authorize('admin'), subjectCreateValidators, ctrl.adminCreateSubject);
router.put('/admin/subjects/:id', auth, authorize('admin'), subjectUpdateValidators, ctrl.adminUpdateSubject);
router.delete('/admin/subjects/:id', auth, authorize('admin'), ctrl.adminDeleteSubject);

router.post('/admin/track-subjects', auth, authorize('admin'), trackSubjectCreateValidators, ctrl.adminCreateTrackSubject);
router.put('/admin/track-subjects/:id', auth, authorize('admin'), trackSubjectUpdateValidators, ctrl.adminUpdateTrackSubject);
router.delete('/admin/track-subjects/:id', auth, authorize('admin'), ctrl.adminDeleteTrackSubject);

router.post('/admin/chapters', auth, authorize('admin'), chapterCreateValidators, ctrl.adminCreateChapter);
router.put('/admin/chapters/:id', auth, authorize('admin'), chapterUpdateValidators, ctrl.adminUpdateChapter);
router.delete('/admin/chapters/:id', auth, authorize('admin'), ctrl.adminDeleteChapter);

router.post('/admin/resources', auth, authorize('admin'), resourceCreateValidators, ctrl.adminCreateResource);
router.put('/admin/resources/:id', auth, authorize('admin'), resourceUpdateValidators, ctrl.adminUpdateResource);
router.delete('/admin/resources/:id', auth, authorize('admin'), ctrl.adminDeleteResource);

router.get('/subjects/me', auth, requireActiveSubscription, ctrl.getMySubjects);
router.get('/subjects/:subjectSlug/chapters', auth, requireActiveSubscription, ctrl.getSubjectChapters);
router.get('/subjects/:subjectSlug/chapters/:chapterSlug', auth, requireActiveSubscription, ctrl.getChapterDetail);
router.get('/',                auth, requireActiveSubscription, ctrl.getAll);
router.get('/my-enrollments',  auth, requireActiveSubscription, ctrl.myEnrollments);
router.get('/:id/outline', auth, authorize('teacher','admin'), ctrl.getTeacherOutline);
router.get('/:id/students', auth, authorize('teacher','admin'), ctrl.getTeacherStudents);
router.get('/:id',             auth, requireActiveSubscription, ctrl.getOne);

router.post('/',
  auth, authorize('teacher','admin'),
  flatCourseCreateValidators,
  ctrl.create
);
router.post('/:id/chapters', auth, authorize('teacher','admin'), teacherChapterCreateValidators, ctrl.createCourseChapter);
router.post('/:id/resources', auth, authorize('teacher','admin'), teacherResourceCreateValidators, ctrl.createCourseResource);

router.put('/:id',  auth, authorize('teacher','admin'), flatCourseUpdateValidators, ctrl.update);
router.put('/chapters/:chapterId', auth, authorize('teacher','admin'), teacherChapterUpdateValidators, ctrl.updateCourseChapter);
router.put('/resources/:resourceId', auth, authorize('teacher','admin'), teacherResourceUpdateValidators, ctrl.updateCourseResource);
router.delete('/:id', auth, authorize('teacher','admin'), ctrl.remove);
router.delete('/chapters/:chapterId', auth, authorize('teacher','admin'), ctrl.deleteCourseChapter);
router.delete('/resources/:resourceId', auth, authorize('teacher','admin'), ctrl.deleteCourseResource);

router.post('/:id/enroll', auth, authorize('student'), requireActiveSubscription, ctrl.enroll);

module.exports = router;
