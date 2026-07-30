import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "ar";

// ── Full translation dictionary ───────────────────────────────
export const translations = {
  en: {
    /* ── Nav ── */
    nav_home:          "Home",
    nav_courses:       "Courses",
    nav_events:        "Events",
    nav_bac:           "Examens Bac",
    nav_khlayel:       "Khlayel AI",
    nav_market:        "Market",
    nav_subscriptions: "Subscriptions",
    nav_team:          "Team",
    nav_support:       "Support",
    nav_signin:        "Sign in",
    nav_get_started:   "Get Started",
    nav_logout:        "Logout",
    nav_profile:       "Profile",
    nav_dashboard:     "Dashboard",

    /* ── Homepage hero ── */
    hero_badge:    "Premium e-Education Platform",
    hero_title_1:  "Learn with",
    hero_title_2:  "Elegance",
    hero_subtitle: "Discover curated courses, video & PDF lessons, tests with full corrections, and a refined marketplace — built for Tunisian students.",
    hero_cta:      "Start Learning",
    hero_cta_sub:  "Explore courses",

    /* ── Homepage stats ── */
    stat_students:     "Active students",
    stat_courses:      "Premium courses",
    stat_satisfaction: "Satisfaction",
    stat_support:      "Support",

    /* ── Features ── */
    features_title:    "Everything you need to excel",
    features_subtitle: "Edutopia brings together the best tools for Tunisian students — in one elegant platform.",
    feat_video_title:  "Video Lessons",
    feat_video_desc:   "High-quality video courses streamed seamlessly across all devices.",
    feat_pdf_title:    "PDF Materials",
    feat_pdf_desc:     "Downloadable PDF resources and exercise sheets to study anywhere.",
    feat_tests_title:  "Tests & Corrections",
    feat_tests_desc:   "Built-in quizzes with automatic grading and detailed corrections.",
    feat_market_title: "Curated Market",
    feat_market_desc:  "A thoughtful marketplace with promo codes and subscription plans.",

    /* ── Homepage CTA banner ── */
    cta_title:    "Ready to start your journey?",
    cta_subtitle: "Join thousands of Tunisian students already learning on Edutopia.",
    cta_button:   "Create free account",
    cta_sub:      "Explore plans",

    /* ── Quick cards ── */
    card_courses_title: "Browse courses",
    card_courses_desc:  "Hundreds of curated programs for Tunisian tracks.",
    card_market_title:  "Visit the market",
    card_market_desc:   "Books, kits, and a real checkout flow.",
    card_subs_title:    "Choose a subscription",
    card_subs_desc:     "Pick your plan for 1 month, 3 months, or 1 year.",
    card_team_title:    "Meet the team",
    card_team_desc:     "The talented people behind Edutopia.",

    /* ── Login ── */
    login_welcome:        "Welcome back",
    login_subtitle:       "Sign in to continue your learning journey.",
    login_email:          "Email",
    login_phone:          "Phone",
    login_password:       "Password",
    login_forgot:         "Forgot password?",
    login_btn:            "Sign in",
    login_signing:        "Signing in…",
    login_signup_title:   "Create your account",
    login_signup_subtitle:"Join Edutopia and start learning today.",
    login_firstname:      "First name",
    login_lastname:       "Last name",
    login_iam:            "I am a",
    login_student:        "Student",
    login_teacher:        "Teacher",
    login_parent:         "Parent",
    login_class:          "Class",
    login_section:        "Section",
    login_select_class:   "Select class",
    login_select_section: "Select section",
    login_create_btn:     "Create account",
    login_creating:       "Creating account…",
    login_reset_title:    "Reset your password",
    login_reset_step1:    "Enter your email and we will send you a secure reset code.",
    login_reset_step2:    "Enter the 6-digit code from your email and choose a new password.",
    login_send_code:      "Send reset code",
    login_sending:        "Sending code…",
    login_reset_code:     "Reset code",
    login_new_password:   "New password",
    login_confirm_pw:     "Confirm new password",
    login_reset_btn:      "Reset password",
    login_resetting:      "Updating password…",
    login_resend:         "Resend code",
    login_back_signin:    "Back to sign in",
    login_back_account:   "Back to your account?",
    login_signin_link:    "Sign in",

    /* ── Dashboard ── */
    dash_greeting:      "Welcome back",
    dash_subtitle:      "Here's an overview of your learning progress.",
    dash_total:         "Total courses",
    dash_completed:     "Completed",
    dash_in_progress:   "In progress",
    dash_avg:           "Avg progress",
    dash_timeline:      "Enrollment timeline",
    dash_timeline_sub:  "New enrollments over the last 6 months",
    dash_progress_chart:"Course progress",
    dash_progress_sub:  "Your progress per enrolled course",
    dash_completion:    "Completion rate",
    dash_enrollments:   "My Courses",
    dash_no_courses:    "No courses yet",
    dash_no_courses_sub:"Enroll in a course to start tracking your progress.",
    dash_browse:        "Browse courses",
    dash_enrolled:      "Enrolled",
    dash_month:         "Month",
    dash_discover:      "Discover Courses",
    dash_discover_sub:  "Browse teacher-created courses and enroll to access their content.",
    dash_enroll:        "Enroll",
    dash_enrolling:     "Enrolling…",

    /* ── Courses ── */
    courses_title:      "My Courses",
    courses_subtitle:   "Your enrolled subjects for this academic track.",
    courses_search:     "Search subjects…",
    courses_empty:      "No subjects found",
    courses_empty_sub:  "Try adjusting your search or check back later.",
    courses_no_track:   "No academic track set",
    courses_no_track_sub:"Update your profile with your class and section to see your courses.",
    courses_update:     "Update profile",
    courses_chapters:   "chapters",
    courses_resources:  "resources",

    /* ── Profile ── */
    profile_info:        "Personal Information",
    profile_teacher_info:"Teacher Information",
    profile_firstname:   "First name",
    profile_lastname:    "Last name",
    profile_age:         "Age",
    profile_class:       "Class",
    profile_section:     "Section",
    profile_institution: "College / Institution",
    profile_avatar:      "Avatar URL",
    profile_save:        "Save changes",
    profile_saving:      "Saving…",
    profile_pw_title:    "Change Password",
    profile_pw_desc:     "To change your password, we will send a 6-digit verification code to",
    profile_pw_send:     "Send verification code",
    profile_pw_sending:  "Sending code…",
    profile_pw_notice:   "A 6-digit code was sent to",
    profile_pw_notice2:  ". Enter it below with your new password.",
    profile_pw_code:     "Verification code",
    profile_pw_new:      "New password",
    profile_pw_confirm:  "Confirm new password",
    profile_pw_resend:   "Resend code",
    profile_pw_update:   "Update password",
    profile_pw_updating: "Updating…",
    profile_pw_cancel:   "Cancel",

    /* ── Footer ── */
    footer_tagline:  "Premium e-education for Tunisian students.",
    footer_platform: "Platform",
    footer_company:  "Company",
    footer_contact:  "Contact",
    footer_rights:   "All rights reserved.",
    footer_privacy:  "Privacy",
    footer_terms:    "Terms",
    footer_support_link: "Support",

    /* ── Common ── */
    loading:  "Loading…",
    error:    "Error",
    retry:    "Retry",
  },

  ar: {
    /* ── Nav ── */
    nav_home:          "الرئيسية",
    nav_courses:       "الدروس",
    nav_events:        "الفعاليات",
    nav_bac:           "امتحانات البكالوريا",
    nav_khlayel:       "خلايل AI",
    nav_market:        "المتجر",
    nav_subscriptions: "الاشتراكات",
    nav_team:          "الفريق",
    nav_support:       "الدعم",
    nav_signin:        "تسجيل الدخول",
    nav_get_started:   "ابدأ الآن",
    nav_logout:        "تسجيل الخروج",
    nav_profile:       "الملف الشخصي",
    nav_dashboard:     "لوحة التحكم",

    /* ── Homepage hero ── */
    hero_badge:    "منصة تعليمية متميزة",
    hero_title_1:  "تعلّم",
    hero_title_2:  "بأناقة",
    hero_subtitle: "اكتشف دروسًا متنوعة ومنتقاة، فيديوهات ومواد PDF، اختبارات مع تصحيحات كاملة، ومتجرًا متميزًا — مصمم للطلاب التونسيين.",
    hero_cta:      "ابدأ التعلم",
    hero_cta_sub:  "استعرض الدروس",

    /* ── Homepage stats ── */
    stat_students:     "طالب نشط",
    stat_courses:      "دورة متميزة",
    stat_satisfaction: "رضا",
    stat_support:      "دعم",

    /* ── Features ── */
    features_title:    "كل ما تحتاجه للتفوق",
    features_subtitle: "تجمع Edutopia أفضل الأدوات للطلاب التونسيين — في منصة واحدة أنيقة.",
    feat_video_title:  "دروس فيديو",
    feat_video_desc:   "دورات فيديو عالية الجودة تُبث بسلاسة على جميع الأجهزة.",
    feat_pdf_title:    "مواد PDF",
    feat_pdf_desc:     "موارد PDF قابلة للتنزيل وأوراق تمارين للدراسة في أي مكان.",
    feat_tests_title:  "اختبارات وتصحيحات",
    feat_tests_desc:   "اختبارات مدمجة مع تصحيح تلقائي وتعليقات تفصيلية.",
    feat_market_title: "متجر منتقى",
    feat_market_desc:  "متجر متميز مع رموز ترويجية وخطط اشتراك.",

    /* ── Homepage CTA banner ── */
    cta_title:    "هل أنت مستعد لبدء رحلتك؟",
    cta_subtitle: "انضم إلى آلاف الطلاب التونسيين الذين يتعلمون على Edutopia.",
    cta_button:   "إنشاء حساب مجاني",
    cta_sub:      "استعرض الخطط",

    /* ── Quick cards ── */
    card_courses_title: "تصفح الدروس",
    card_courses_desc:  "مئات البرامج المنتقاة للمسارات التونسية.",
    card_market_title:  "زيارة المتجر",
    card_market_desc:   "كتب، أدوات، وتجربة شراء حقيقية.",
    card_subs_title:    "اختر اشتراكك",
    card_subs_desc:     "اختر خطتك لمدة شهر، 3 أشهر، أو سنة.",
    card_team_title:    "تعرف على الفريق",
    card_team_desc:     "الأشخاص الموهوبون خلف Edutopia.",

    /* ── Login ── */
    login_welcome:        "مرحباً بعودتك",
    login_subtitle:       "سجّل دخولك لمواصلة رحلة التعلم.",
    login_email:          "البريد الإلكتروني",
    login_phone:          "الهاتف",
    login_password:       "كلمة المرور",
    login_forgot:         "نسيت كلمة المرور؟",
    login_btn:            "تسجيل الدخول",
    login_signing:        "جارٍ الدخول…",
    login_signup_title:   "إنشاء حسابك",
    login_signup_subtitle:"انضم إلى Edutopia وابدأ التعلم اليوم.",
    login_firstname:      "الاسم الأول",
    login_lastname:       "اللقب",
    login_iam:            "أنا",
    login_student:        "طالب",
    login_teacher:        "أستاذ",
    login_parent:         "ولي أمر",
    login_class:          "الصف",
    login_section:        "الشعبة",
    login_select_class:   "اختر الصف",
    login_select_section: "اختر الشعبة",
    login_create_btn:     "إنشاء الحساب",
    login_creating:       "جارٍ الإنشاء…",
    login_reset_title:    "إعادة تعيين كلمة المرور",
    login_reset_step1:    "أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة تعيين آمنًا.",
    login_reset_step2:    "أدخل الرمز المكوّن من 6 أرقام من بريدك واختر كلمة مرور جديدة.",
    login_send_code:      "إرسال رمز التحقق",
    login_sending:        "جارٍ الإرسال…",
    login_reset_code:     "رمز التحقق",
    login_new_password:   "كلمة المرور الجديدة",
    login_confirm_pw:     "تأكيد كلمة المرور",
    login_reset_btn:      "تغيير كلمة المرور",
    login_resetting:      "جارٍ التحديث…",
    login_resend:         "إعادة الإرسال",
    login_back_signin:    "العودة لتسجيل الدخول",
    login_back_account:   "العودة إلى حسابك؟",
    login_signin_link:    "تسجيل الدخول",

    /* ── Dashboard ── */
    dash_greeting:      "مرحباً بعودتك",
    dash_subtitle:      "نظرة عامة على تقدمك في التعلم.",
    dash_total:         "إجمالي الدروس",
    dash_completed:     "مكتمل",
    dash_in_progress:   "جارٍ",
    dash_avg:           "متوسط التقدم",
    dash_timeline:      "مخطط التسجيلات",
    dash_timeline_sub:  "التسجيلات الجديدة خلال الأشهر الـ6 الماضية",
    dash_progress_chart:"تقدم الدروس",
    dash_progress_sub:  "تقدمك في كل درس مسجّل",
    dash_completion:    "نسبة الإتمام",
    dash_enrollments:   "دروسي",
    dash_no_courses:    "لا توجد دروس بعد",
    dash_no_courses_sub:"سجّل في درس لتبدأ متابعة تقدمك.",
    dash_browse:        "تصفح الدروس",
    dash_enrolled:      "مسجّل",
    dash_month:         "الشهر",
    dash_discover:      "اكتشف الدروس",
    dash_discover_sub:  "تصفح الدروس التي أنشأها الأساتذة وسجّل للوصول إلى محتواها.",
    dash_enroll:        "التسجيل",
    dash_enrolling:     "جارٍ التسجيل…",

    /* ── Courses ── */
    courses_title:      "دروسي",
    courses_subtitle:   "المواد المسجّلة في مسارك الدراسي.",
    courses_search:     "ابحث عن مواد…",
    courses_empty:      "لا توجد مواد",
    courses_empty_sub:  "حاول تعديل البحث أو تحقق لاحقًا.",
    courses_no_track:   "لم يُحدَّد المسار الدراسي",
    courses_no_track_sub:"حدّث ملفك الشخصي بالصف والشعبة لعرض دروسك.",
    courses_update:     "تحديث الملف الشخصي",
    courses_chapters:   "فصول",
    courses_resources:  "موارد",

    /* ── Profile ── */
    profile_info:        "المعلومات الشخصية",
    profile_teacher_info:"معلومات الأستاذ",
    profile_firstname:   "الاسم الأول",
    profile_lastname:    "اللقب",
    profile_age:         "العمر",
    profile_class:       "الصف",
    profile_section:     "الشعبة",
    profile_institution: "المؤسسة التعليمية",
    profile_avatar:      "رابط الصورة الشخصية",
    profile_save:        "حفظ التغييرات",
    profile_saving:      "جارٍ الحفظ…",
    profile_pw_title:    "تغيير كلمة المرور",
    profile_pw_desc:     "لتغيير كلمة المرور، سنرسل رمزًا مكوّنًا من 6 أرقام إلى",
    profile_pw_send:     "إرسال رمز التحقق",
    profile_pw_sending:  "جارٍ الإرسال…",
    profile_pw_notice:   "تم إرسال رمز التحقق إلى",
    profile_pw_notice2:  ". أدخله أدناه مع كلمة المرور الجديدة.",
    profile_pw_code:     "رمز التحقق",
    profile_pw_new:      "كلمة المرور الجديدة",
    profile_pw_confirm:  "تأكيد كلمة المرور",
    profile_pw_resend:   "إعادة الإرسال",
    profile_pw_update:   "تحديث كلمة المرور",
    profile_pw_updating: "جارٍ التحديث…",
    profile_pw_cancel:   "إلغاء",

    /* ── Footer ── */
    footer_tagline:  "منصة تعليمية متميزة للطلاب التونسيين.",
    footer_platform: "المنصة",
    footer_company:  "الشركة",
    footer_contact:  "تواصل معنا",
    footer_rights:   "جميع الحقوق محفوظة.",
    footer_privacy:  "الخصوصية",
    footer_terms:    "الشروط",
    footer_support_link: "الدعم",

    /* ── Common ── */
    loading:  "جارٍ التحميل…",
    error:    "خطأ",
    retry:    "إعادة المحاولة",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

// ── Context ──────────────────────────────────────────────────
interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key],
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("edutopia_lang") as Lang) ?? "en";
  });

  const isRTL = lang === "ar";

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("edutopia_lang", l);
  };

  // Apply dir + lang to <html> reactively
  useEffect(() => {
    document.documentElement.dir  = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    // Toggle Arabic font class
    document.documentElement.classList.toggle("font-arabic", isRTL);
  }, [lang, isRTL]);

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}
