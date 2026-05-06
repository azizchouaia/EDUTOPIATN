export const GRADE_CODES = ["7eme", "8eme", "9eme", "1ere", "2eme", "3eme", "bac"] as const
export const SECTION_CODES = ["science", "math", "technique", "info", "eco"] as const

export type GradeCode = (typeof GRADE_CODES)[number]
export type SectionCode = (typeof SECTION_CODES)[number]

export const GRADE_OPTIONS: Array<{ value: GradeCode; label: string }> = [
  { value: "7eme", label: "7eme" },
  { value: "8eme", label: "8eme" },
  { value: "9eme", label: "9eme" },
  { value: "1ere", label: "1ere lycee" },
  { value: "2eme", label: "2eme lycee" },
  { value: "3eme", label: "3eme lycee" },
  { value: "bac", label: "Bac" },
]

export const SECTION_OPTIONS: Array<{ value: SectionCode; label: string }> = [
  { value: "science", label: "Science" },
  { value: "math", label: "Math" },
  { value: "technique", label: "Technique" },
  { value: "info", label: "Info" },
  { value: "eco", label: "Eco" },
]

export function needsSection(gradeCode?: string | null) {
  return gradeCode === "2eme" || gradeCode === "3eme" || gradeCode === "bac"
}

export function inferSchoolCycle(gradeCode?: string | null) {
  if (!gradeCode) return null
  return ["7eme", "8eme", "9eme"].includes(gradeCode) ? "college" : "lycee"
}

export function formatAcademicTrack(user: {
  grade_code?: string | null
  section_code?: string | null
  year_of_study?: string | null
}) {
  if (!user.grade_code) return user.year_of_study ?? null
  if (!needsSection(user.grade_code) || !user.section_code) return user.grade_code
  return `${user.grade_code} - ${user.section_code}`
}