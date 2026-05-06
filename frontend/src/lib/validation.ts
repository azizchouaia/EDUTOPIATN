export type FormErrors<FieldName extends string> = Partial<Record<FieldName, string>>

export function isBlank(value: string | null | undefined) {
  return String(value ?? "").trim().length === 0
}

export function hasMinLength(value: string | null | undefined, length: number) {
  return String(value ?? "").trim().length >= length
}

export function isValidEmail(value: string | null | undefined) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim())
}

export function isValidUrl(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim()
  if (!rawValue) {
    return false
  }

  try {
    const parsed = new URL(rawValue)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function isNonNegativeNumber(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
}

export function isPositiveInteger(value: string | number | null | undefined, minimum = 1) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum
}

export function isNonNegativeInteger(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0
}

export function isValidSlug(value: string | null | undefined) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value ?? "").trim())
}

export function isValidHexColor(value: string | null | undefined) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value ?? "").trim())
}

export function isValidDateInput(value: string | null | undefined) {
  return !Number.isNaN(Date.parse(String(value ?? "")))
}

export function isFutureDateTime(value: string | null | undefined) {
  const parsed = Date.parse(String(value ?? ""))
  return !Number.isNaN(parsed) && parsed > Date.now()
}

export function hasErrors<FieldName extends string>(errors: FormErrors<FieldName>) {
  return Object.keys(errors).length > 0
}