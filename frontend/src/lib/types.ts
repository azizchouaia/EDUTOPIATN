import type { GradeCode, SectionCode } from "./academic"

export type UserRole = "admin" | "teacher" | "student" | "parent" | "commercial"

export interface User {
  id: number
  first_name: string
  last_name: string
  age: number | null
  email: string
  phone: string | null
  user_code: string | null
  role: UserRole
  college: string | null
  year_of_study: string | null
  school_cycle: "college" | "lycee" | null
  grade_code: GradeCode | null
  section_code: SectionCode | null
  avatar_url: string | null
  is_active: number
  created_at: string
}

export interface Enrollment {
  id: number
  title: string
  category: string
  cover_image: string | null
  progress: number
  completed: number
  enrolled_at: string
}

export interface Course {
  id: number
  title: string
  description: string | null
  teacher_id: number
  first_name: string
  last_name: string
  category: string | null
  price: number
  duration_hours: number
  lessons_count: number
  cover_image: string | null
  is_published: number
  created_at: string
}

export interface AcademicTrack {
  id: number | null
  slug: string | null
  title: string
  school_cycle: "college" | "lycee" | null
  grade_code: GradeCode | null
  section_code: SectionCode | null
}

export interface LearningSubject {
  id: number
  track_subject_id: number
  name: string
  slug: string
  description: string | null
  cover_image: string | null
  icon: string | null
  color: string | null
  chapter_count: number
  resource_count: number
}

export interface SubjectChapter {
  id: number
  title: string
  slug: string
  description: string | null
  display_order: number
  resource_count: number
  video_count: number
  pdf_count: number
  exercise_count: number
  correction_count: number
  completed_count: number  // how many resources this student has completed
}

export interface ChapterResource {
  id: number
  chapter_id: number
  resource_type: "pdf_lesson" | "video_lesson" | "exercise_sheet" | "correction_sheet" | "extra_resource"
  title: string
  description: string | null
  file_url: string | null
  external_url: string | null
  duration_minutes: number | null
  display_order: number
  is_completed: boolean  // whether the current student has completed this resource
}

export interface StudentSubjectsResponse {
  track: AcademicTrack
  subjects: LearningSubject[]
}

export interface SubjectChaptersResponse {
  track: AcademicTrack
  subject: Omit<LearningSubject, "chapter_count" | "resource_count">
  chapters: SubjectChapter[]
}

export interface ChapterDetailResponse {
  track: AcademicTrack
  subject: Omit<LearningSubject, "track_subject_id" | "chapter_count" | "resource_count">
  chapter: {
    id: number
    title: string
    slug: string
    description: string | null
    display_order: number
  }
  resources: ChapterResource[]
}

export interface Event {
  id: number
  title: string
  description: string | null
  host_id: number
  first_name: string
  last_name: string
  category: string | null
  delivery_type: "google_meet" | "video"
  access_url: string | null
  event_date: string
  seats_total: number
  seats_taken: number
  is_cancelled: number
  /** true = any logged-in user may participate; false = active subscription required */
  is_free: boolean
  /** whether the current viewer holds an active subscription (server-computed) */
  has_subscription?: boolean
  is_registered?: boolean
}

export interface Reclamation {
  id: number
  user_id: number
  subject: string
  category: string | null
  message: string
  status: "open" | "in_progress" | "resolved"
  created_at: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  category: string | null
  tag: "none" | "bestseller" | "new" | "limited" | "promo"
  stock: number
  image_url: string | null
  is_active: number
}

export interface PromoCode {
  id: number
  code: string
  discount_percent: number
  product_id: number | null
  product_name?: string | null
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: number
  created_at: string
}

export type PaymentMethod = "cash_on_delivery" | "card" | "bank_transfer"
export type SubscriptionPaymentMethod = "online" | "bank_transfer"

export interface DeliveryDetails {
  full_name: string
  phone: string
  address: string
  city: string
  postal_code: string
  notes: string
}

export interface Subscription {
  id: number
  user_id: number
  plan: "basic" | "premium" | "enterprise"
  billing_cycle?: "1_month" | "3_months" | "1_year"
  price_paid?: number
  payment_method?: SubscriptionPaymentMethod
  status: "pending_receipt" | "pending_approval" | "pending_code" | "active" | "expired" | "cancelled"
  bank_receipt_path?: string | null
  bank_receipt_original_name?: string | null
  receipt_uploaded_at?: string | null
  activation_code_expires_at?: string | null
  approved_by?: number | null
  approved_at?: string | null
  activated_at?: string | null
  start_date: string
  end_date: string
  created_at: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface SubscriptionAccessStatus {
  has_active_subscription: boolean
  has_pending_activation: boolean
  active_subscription: Subscription | null
  pending_subscription: Subscription | null
  development_code?: string | null
}

export interface SubscriptionPlan {
  id: number
  slug: "basic" | "premium" | "enterprise"
  title: string
  title_arabic?: string | null
  description: string | null
  features_json?: string | string[]
  features: string[]
  features_arabic?: string[]
  monthly_price: number
  quarterly_price: number
  yearly_price: number
  is_popular: number
  is_recommended: number
  is_active: number
  display_order: number
}

export interface TeamMember {
  id: number
  name: string
  role: string
  bio: string | null
  initials: string | null
  gradient_from: string
  gradient_to: string
  linkedin_url: string | null
  github_url: string | null
  email: string | null
  display_order: number
  is_active: number
  created_at: string
}

export interface ParentStudentLink {
  id: number
  parent_id: number
  student_id: number
  relation_type: "parent" | "mother" | "father" | "guardian"
  is_active: number
  created_at: string
  parent_first_name: string
  parent_last_name: string
  parent_email: string
  student_first_name: string
  student_last_name: string
  student_email: string
  school_cycle: "college" | "lycee" | null
  grade_code: GradeCode | null
  section_code: SectionCode | null
}

export interface ParentChildSummary {
  id: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  college: string | null
  school_cycle: "college" | "lycee" | null
  grade_code: GradeCode | null
  section_code: SectionCode | null
  relation_type: "parent" | "mother" | "father" | "guardian"
  enrolled_courses: number
  completed_courses: number
  avg_progress: number
  // Subscription info
  active_plan: "basic" | "premium" | "enterprise" | null
  active_billing_cycle: "1_month" | "3_months" | "1_year" | null
  active_start_date: string | null
  active_end_date: string | null
  active_days_remaining: number | null
}

export interface ParentChildEnrollment {
  id: number
  title: string
  category: string | null
  cover_image: string | null
  first_name: string
  last_name: string
  progress: number
  completed: number
  enrolled_at: string
}

export interface ChildActiveSubscription {
  plan: "basic" | "premium" | "enterprise"
  billing_cycle: "1_month" | "3_months" | "1_year"
  start_date: string
  end_date: string
  days_remaining: number
}

export interface ParentChildProgressResponse {
  child: {
    id: number
    first_name: string
    last_name: string
    email: string
    avatar_url: string | null
    college: string | null
    school_cycle: "college" | "lycee" | null
    grade_code: GradeCode | null
    section_code: SectionCode | null
    relation_type: "parent" | "mother" | "father" | "guardian"
  }
  subscription: ChildActiveSubscription | null
  stats: {
    total_courses: number
    completed_courses: number
    avg_progress: number
  }
  enrollments: ParentChildEnrollment[]
}

export interface CourseContentResource {
  id: number
  chapter_id: number
  resource_type: "pdf_lesson" | "video_lesson" | "exercise_sheet" | "correction_sheet" | "extra_resource"
  title: string
  description: string | null
  file_url: string | null
  external_url: string | null
  duration_minutes: number | null
  display_order: number
}

export interface CourseContentChapter {
  id: number
  title: string
  slug: string
  description: string | null
  display_order: number
  resources: CourseContentResource[]
}

export interface CourseContentResponse {
  course: Course & { first_name: string; last_name: string }
  enrollment: { id: number; progress: number; completed: number }
  chapters: CourseContentChapter[]
}

export interface StudentStatsOverview {
  total_enrollments: number
  completed_courses: number
  in_progress: number
  avg_progress: number
}

export interface StudentStatsCourse {
  id: number
  title: string
  category: string
  progress: number
  completed: number
  enrolled_at: string
}

export interface StudentStatsTimeline {
  month: string  // "YYYY-MM"
  count: number
}

export interface StudentStatsCategory {
  category: string
  count: number
  avg_progress: number
}

export interface StudentStats {
  overview:   StudentStatsOverview
  courses:    StudentStatsCourse[]
  timeline:   StudentStatsTimeline[]
  categories: StudentStatsCategory[]
}

export interface OrderItem {
  order_id: number
  product_id: number
  quantity: number
  unit_price: number
  product_name: string
  product_image_url: string | null
}

export interface MarketOrder {
  id: number
  user_id: number
  promo_code_id: number | null
  promo_code?: string | null
  total_amount: number
  payment_method: PaymentMethod
  delivery_full_name: string | null
  delivery_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_postal_code: string | null
  delivery_notes: string | null
  status: "pending" | "paid" | "cancelled" | "refunded"
  created_at: string
  items: OrderItem[]
  first_name?: string
  last_name?: string
  email?: string
}
