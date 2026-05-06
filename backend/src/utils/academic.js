const COLLEGE_GRADES = ['7eme', '8eme', '9eme'];
const LYCEE_GRADES = ['1ere', '2eme', '3eme', 'bac'];
const ALL_GRADES = [...COLLEGE_GRADES, ...LYCEE_GRADES];
const SECTION_CODES = ['science', 'math', 'technique', 'info', 'eco'];
const SECTION_REQUIRED_GRADES = new Set(['2eme', '3eme', 'bac']);

function cleanString(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function pickEnum(value, allowed) {
  const cleaned = cleanString(value);
  return cleaned && allowed.includes(cleaned) ? cleaned : null;
}

function inferSchoolCycle(gradeCode) {
  if (COLLEGE_GRADES.includes(gradeCode)) return 'college';
  if (LYCEE_GRADES.includes(gradeCode)) return 'lycee';
  return null;
}

function formatYearOfStudy({ gradeCode, sectionCode, fallback }) {
  if (!gradeCode) return cleanString(fallback);
  if (!SECTION_REQUIRED_GRADES.has(gradeCode) || !sectionCode) return gradeCode;
  return `${gradeCode} - ${sectionCode}`;
}

function normalizeAcademicFields(source = {}) {
  const gradeCode = pickEnum(source.grade_code, ALL_GRADES);
  const inferredCycle = inferSchoolCycle(gradeCode);
  const requestedCycle = pickEnum(source.school_cycle, ['college', 'lycee']);
  const schoolCycle = inferredCycle || requestedCycle;

  let sectionCode = pickEnum(source.section_code, SECTION_CODES);
  if (!SECTION_REQUIRED_GRADES.has(gradeCode)) {
    sectionCode = null;
  }

  return {
    school_cycle: schoolCycle,
    grade_code: gradeCode,
    section_code: sectionCode,
    year_of_study: formatYearOfStudy({
      gradeCode,
      sectionCode,
      fallback: source.year_of_study,
    }),
  };
}

module.exports = {
  ALL_GRADES,
  SECTION_CODES,
  SECTION_REQUIRED_GRADES,
  inferSchoolCycle,
  normalizeAcademicFields,
};