import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "ar";

// ── Full translation dictionary ───────────────────────────────
export const translations = {
  en: {
    /* ── Nav ── */
    nav_home:          "Accueil",
    nav_courses:       "Cours",
    nav_events:        "Événements",
    nav_bac:           "Examens Bac",
    nav_khlayel:       "Khlayel AI",
    nav_market:        "Marché",
    nav_subscriptions: "Abonnements",
    nav_team:          "Équipe",
    nav_support:       "Support",
    nav_signin:        "Connexion",
    nav_get_started:   "Commencer",
    nav_logout:        "Déconnexion",
    nav_profile:       "Profil",
    nav_dashboard:     "Tableau de bord",

    /* ── Homepage hero ── */
    hero_badge:    "Plateforme e-éducation premium",
    hero_title_1:  "Apprends avec",
    hero_title_2:  "Élégance",
    hero_subtitle: "Découvre des cours sélectionnés, des leçons vidéo et PDF, des tests avec corrections complètes, et un marché raffiné — conçu pour les étudiants tunisiens.",
    hero_cta:      "Commencer à apprendre",
    hero_cta_sub:  "Explorer les cours",

    /* ── Homepage stats ── */
    stat_students:     "Étudiants actifs",
    stat_courses:      "Cours premium",
    stat_satisfaction: "Satisfaction",
    stat_support:      "Support",

    /* ── Features ── */
    features_title:    "Tout ce qu'il faut pour exceller",
    features_subtitle: "Edutopia réunit les meilleurs outils pour les étudiants tunisiens — en une seule plateforme élégante.",
    feat_video_title:  "Leçons vidéo",
    feat_video_desc:   "Cours vidéo haute qualité diffusés sans interruption sur tous les appareils.",
    feat_pdf_title:    "Ressources PDF",
    feat_pdf_desc:     "Ressources PDF téléchargeables et fiches d'exercices pour étudier partout.",
    feat_tests_title:  "Tests et corrections",
    feat_tests_desc:   "Quiz intégrés avec correction automatique et corrections détaillées.",
    feat_market_title: "Marché sélectionné",
    feat_market_desc:  "Un marché soigné avec codes promo et plans d'abonnement.",

    /* ── Homepage CTA banner ── */
    cta_title:    "Prêt à commencer ton parcours ?",
    cta_subtitle: "Rejoins des milliers d'étudiants tunisiens qui apprennent déjà sur Edutopia.",
    cta_button:   "Créer un compte gratuit",
    cta_sub:      "Explorer les plans",

    /* ── Quick cards ── */
    card_courses_title: "Parcourir les cours",
    card_courses_desc:  "Des centaines de programmes sélectionnés pour les filières tunisiennes.",
    card_market_title:  "Visiter le marché",
    card_market_desc:   "Livres, kits et un vrai processus de commande.",
    card_subs_title:    "Choisir un abonnement",
    card_subs_desc:     "Choisis ton plan pour 1 mois, 3 mois ou 1 an.",
    card_team_title:    "Rencontrer l'équipe",
    card_team_desc:     "Les personnes talentueuses derrière Edutopia.",

    /* ── Login ── */
    login_welcome:        "Bon retour",
    login_subtitle:       "Connecte-toi pour continuer ton parcours d'apprentissage.",
    login_email:          "E-mail",
    login_phone:          "Téléphone",
    login_password:       "Mot de passe",
    login_forgot:         "Mot de passe oublié ?",
    login_btn:            "Se connecter",
    login_signing:        "Connexion en cours…",
    login_signup_title:   "Créer ton compte",
    login_signup_subtitle:"Rejoins Edutopia et commence à apprendre aujourd'hui.",
    login_firstname:      "Prénom",
    login_lastname:       "Nom",
    login_iam:            "Je suis",
    login_student:        "Étudiant",
    login_teacher:        "Enseignant",
    login_parent:         "Parent",
    login_class:          "Classe",
    login_section:        "Section",
    login_select_class:   "Sélectionner une classe",
    login_select_section: "Sélectionner une section",
    login_create_btn:     "Créer le compte",
    login_creating:       "Création du compte…",
    login_reset_title:    "Réinitialiser le mot de passe",
    login_reset_step1:    "Saisis ton e-mail et nous t'enverrons un code de réinitialisation sécurisé.",
    login_reset_step2:    "Saisis le code à 6 chiffres reçu par e-mail et choisis un nouveau mot de passe.",
    login_send_code:      "Envoyer le code",
    login_sending:        "Envoi en cours…",
    login_reset_code:     "Code de réinitialisation",
    login_new_password:   "Nouveau mot de passe",
    login_confirm_pw:     "Confirmer le nouveau mot de passe",
    login_reset_btn:      "Réinitialiser le mot de passe",
    login_resetting:      "Mise à jour du mot de passe…",
    login_resend:         "Renvoyer le code",
    login_back_signin:    "Retour à la connexion",
    login_back_account:   "Retour à ton compte ?",
    login_signin_link:    "Se connecter",

    /* ── Dashboard ── */
    dash_greeting:      "Bon retour",
    dash_subtitle:      "Voici un aperçu de ta progression.",
    dash_total:         "Total des cours",
    dash_completed:     "Terminés",
    dash_in_progress:   "En cours",
    dash_avg:           "Progression moyenne",
    dash_timeline:      "Historique des inscriptions",
    dash_timeline_sub:  "Nouvelles inscriptions sur les 6 derniers mois",
    dash_progress_chart:"Progression des cours",
    dash_progress_sub:  "Ta progression par cours inscrit",
    dash_completion:    "Taux d'achèvement",
    dash_enrollments:   "Mes cours",
    dash_no_courses:    "Aucun cours pour l'instant",
    dash_no_courses_sub:"Inscris-toi à un cours pour commencer à suivre ta progression.",
    dash_browse:        "Parcourir les cours",
    dash_enrolled:      "Inscrit",
    dash_month:         "Mois",
    dash_discover:      "Découvrir des cours",
    dash_discover_sub:  "Parcours les cours créés par les enseignants et inscris-toi pour accéder au contenu.",
    dash_enroll:        "S'inscrire",
    dash_enrolling:     "Inscription…",

    /* ── Courses ── */
    courses_title:      "Mes cours",
    courses_subtitle:   "Tes matières inscrites pour cette filière académique.",
    courses_search:     "Rechercher des matières…",
    courses_empty:      "Aucune matière trouvée",
    courses_empty_sub:  "Essaie d'ajuster ta recherche ou reviens plus tard.",
    courses_no_track:   "Aucune filière académique définie",
    courses_no_track_sub:"Mets à jour ton profil avec ta classe et section pour voir tes cours.",
    courses_update:     "Mettre à jour le profil",
    courses_chapters:   "chapitres",
    courses_resources:  "ressources",

    /* ── Profile ── */
    profile_info:        "Informations personnelles",
    profile_teacher_info:"Informations de l'enseignant",
    profile_firstname:   "Prénom",
    profile_lastname:    "Nom",
    profile_age:         "Âge",
    profile_class:       "Classe",
    profile_section:     "Section",
    profile_institution: "Établissement / Institution",
    profile_avatar:      "URL de l'avatar",
    profile_save:        "Enregistrer les modifications",
    profile_saving:      "Enregistrement…",
    profile_pw_title:    "Changer le mot de passe",
    profile_pw_desc:     "Pour changer ton mot de passe, nous enverrons un code de vérification à 6 chiffres à",
    profile_pw_send:     "Envoyer le code de vérification",
    profile_pw_sending:  "Envoi en cours…",
    profile_pw_notice:   "Un code à 6 chiffres a été envoyé à",
    profile_pw_notice2:  ". Saisis-le ci-dessous avec ton nouveau mot de passe.",
    profile_pw_code:     "Code de vérification",
    profile_pw_new:      "Nouveau mot de passe",
    profile_pw_confirm:  "Confirmer le nouveau mot de passe",
    profile_pw_resend:   "Renvoyer le code",
    profile_pw_update:   "Mettre à jour le mot de passe",
    profile_pw_updating: "Mise à jour…",
    profile_pw_cancel:   "Annuler",

    /* ── Footer ── */
    footer_tagline:  "E-éducation premium pour les étudiants tunisiens.",
    footer_platform: "Plateforme",
    footer_company:  "Société",
    footer_contact:  "Contact",
    footer_rights:   "Tous droits réservés.",
    footer_privacy:  "Confidentialité",
    footer_terms:    "Conditions",
    footer_support_link: "Support",

    /* ── Common ── */
    loading:  "Chargement…",
    error:    "Erreur",
    retry:    "Réessayer",
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
