import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, KeyRound, Save, Loader2, Eye, EyeOff, Mail, ShieldCheck, Camera, CreditCard, CalendarClock, CheckCircle2, Clock, AlertCircle, BrainCircuit, LayoutDashboard, Crown, ChevronRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMe, useUpdateProfile, useRequestPasswordReset, useResetPassword } from "@/hooks/useAuth";
import api, { assetUrl } from "@/lib/api";
import { GRADE_OPTIONS, SECTION_OPTIONS, formatAcademicTrack, inferSchoolCycle } from "@/lib/academic";
import { isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import type { SubscriptionAccessStatus } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Mon profil — Edutopia" },
      { name: "description", content: "View and update your Edutopia profile." },
    ],
  }),
  component: ProfilePage,
});

// ── Schemas ──────────────────────────────────────────────────
// Class & section are locked ("défini à l'inscription") and rendered as
// read-only text — they are NOT form fields, so they must not be validated here.
const infoSchema = z.object({
  first_name: z.string().trim().min(1, "Le prenom est obligatoire"),
  last_name: z.string().trim().min(1, "Le nom est obligatoire"),
  age: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(10, "L'age doit etre superieur ou egal a 10").max(120, "L'age doit etre inferieur ou egal a 120").optional()),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,15}$/, "Numero de telephone invalide").optional().or(z.literal("")),
  college: z.string().trim().max(120, "Le nom de l'etablissement est trop long").optional().or(z.literal("")),
  // Accepts absolute URLs AND relative upload paths (/uploads/avatars/…) —
  // the avatar upload endpoint stores a relative path, not a full URL.
  avatar_url: z.preprocess(
    (value) => typeof value === "string" ? value.trim() : value,
    z.string().refine(
      (v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v),
      "L'URL de l'avatar est invalide"
    ).optional().or(z.literal(""))
  ),
});

const verifyPwSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
    password: z.string().min(8, "Minimum 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type InfoForm = z.infer<typeof infoSchema>;
type VerifyPwForm = z.infer<typeof verifyPwSchema>;

function PasswordInput({ id, placeholder, registration }: { id: string; placeholder?: string; registration: any }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder ?? "••••••••"}
        className="pr-10"
        {...registration}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────
function ProfilePage() {
  const { t, isRTL } = useLanguage();
  const { data: user, refetch: refetchUser } = useMe();
  const updateMutation = useUpdateProfile();

  const isStudent = user?.role === "student";
  const { data: accessStatus } = useQuery<SubscriptionAccessStatus>({
    queryKey: ["subscription-access-status"],
    queryFn: async () => (await api.get<SubscriptionAccessStatus>("/subscriptions/access-status")).data,
    enabled: isAuthenticated() && isStudent,
  });
  const requestResetMutation = useRequestPasswordReset();
  const resetPasswordMutation = useResetPassword();

  const { data: khConversations = [] } = useQuery<{ id: number }[]>({
    queryKey: ["profile-kh-conversations"],
    queryFn: async () => (await api.get<{ id: number }[]>("/ai/math-chat/conversations")).data,
    enabled: isAuthenticated() && user?.role === "student",
  });
  const [mounted, setMounted] = useState(false);
  const [pwStep, setPwStep] = useState<"idle" | "verify">("idle");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isTeacher = user?.role === "teacher";

  const infoForm = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      age: null,
      phone: "",
      college: "",
      avatar_url: "",
    },
  });

  const verifyPwForm = useForm<VerifyPwForm>({
    resolver: zodResolver(verifyPwSchema),
    defaultValues: { code: "", password: "", confirm: "" },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill form once user data arrives
  useEffect(() => {
    if (user) {
      infoForm.reset({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        age: user.age ?? null,
        phone: user.phone ?? "",
        college: user.college ?? "",
        avatar_url: user.avatar_url ?? "",
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function onInfoSubmit(values: InfoForm) {
    if (!user) return;
    updateMutation.mutate(
      {
        id: user.id,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          age: values.age ?? null,
          phone: values.phone || null,
          college: values.college || null,
          // Class/section are immutable here — resend the account's values as-is
          school_cycle: isTeacher ? null : inferSchoolCycle(user.grade_code ?? "") as "college" | "lycee" | null,
          grade_code: isTeacher ? null : user.grade_code || null,
          section_code: isTeacher ? null : user.section_code || null,
          avatar_url: values.avatar_url || null,
        },
      },
      {
        onSuccess: () => toast.success("Profil mis a jour."),
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? "Mise a jour impossible."),
      }
    );
  }

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await api.post<{ avatar_url: string }>("/users/upload-avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      infoForm.setValue("avatar_url", data.avatar_url);
      await refetchUser();
      toast.success("Photo de profil mise à jour.");
    } catch {
      toast.error("Erreur lors de l'upload de l'avatar.");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSendCode() {
    if (!user?.email) return;
    try {
      await requestResetMutation.mutateAsync({ email: user.email });
      verifyPwForm.reset({ code: "", password: "", confirm: "" });
      setPwStep("verify");
      toast.success("Code envoyé à " + user.email);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Envoi du code impossible.");
    }
  }

  async function handleVerifyAndChange(values: VerifyPwForm) {
    if (!user?.email) return;
    try {
      await resetPasswordMutation.mutateAsync({ email: user.email, code: values.code, password: values.password });
      toast.success("Mot de passe modifié avec succès.");
      verifyPwForm.reset();
      setPwStep("idle");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Modification impossible.");
    }
  }

  // ── Profile completeness ────────────────────────────────────
  const missingFields: string[] = [];
  if (user) {
    if (user.age == null) missingFields.push("ton âge");
    if (!user.college) missingFields.push("ton établissement");
    if (!user.avatar_url && !avatarPreview) missingFields.push("une photo");
    if (isStudent && !user.grade_code) missingFields.push("ta classe");
  }
  const totalChecks = isStudent ? 6 : 5;
  const completeness = user
    ? Math.round(((totalChecks - missingFields.length - (user.first_name ? 0 : 1) - (user.last_name ? 0 : 1)) / totalChecks) * 100)
    : 0;

  const workspaceHref = user?.role === "teacher" ? "/teacher" : user?.role === "parent" ? "/parent" : "/dashboard";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;

  const quickLinkCls = "flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-bordeaux/40 hover:bg-bordeaux/5 hover:text-bordeaux";

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-16 flex items-center gap-6">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            title="Changer la photo de profil"
            className="group relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-gold ring-4 ring-white/20 shadow-elegant overflow-hidden cursor-pointer transition-transform hover:scale-105"
          >
            {mounted && (avatarPreview || user?.avatar_url) ? (
              <img
                src={avatarPreview ?? (assetUrl(user?.avatar_url) ?? "")}
                alt="avatar"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <User className="h-9 w-9 text-bordeaux" />
            )}
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {mounted && user ? `${user.first_name} ${user.last_name}` : "Mon profil"}
            </h1>
            <p className="text-primary-foreground/70 mt-1">{mounted ? user?.email : ""}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-gold/90 text-bordeaux border-0 capitalize">
                {mounted ? (user?.role ?? "student") : "student"}
              </Badge>
              {mounted && user?.college && (
                <Badge className="bg-white/10 text-primary-foreground border-white/20">
                  {user.college}
                </Badge>
              )}
              {mounted && !isTeacher && formatAcademicTrack(user) && (
                <Badge className="bg-white/10 text-primary-foreground border-white/20">
                  {formatAcademicTrack(user)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-5xl page-enter">
        <div className="grid gap-8 items-start lg:grid-cols-[300px_minmax(0,1fr)]">

        {/* ── Summary sidebar ── */}
        <aside className={`rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24 ${isRTL ? "text-right" : ""}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mon profil</p>

          {/* Completeness */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Complété</span>
              <span className="font-bold text-bordeaux tabular-nums">{completeness}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${completeness >= 100 ? "bg-emerald-500" : "bg-gradient-bordeaux"}`}
                style={{ width: `${Math.max(4, completeness)}%` }}
              />
            </div>
            {missingFields.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Il manque : {missingFields.join(", ")}.
              </p>
            )}
            {completeness >= 100 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Profil complet !
              </p>
            )}
          </div>

          <Separator className="my-5" />

          {/* Facts */}
          <div className="space-y-3 text-sm">
            {memberSince && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Membre depuis</span>
                <span className="font-medium capitalize">{memberSince}</span>
              </div>
            )}
            {mounted && user?.user_code && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground mb-1.5">
                  {user.role === "student" ? "Mon code élève" : user.role === "parent" ? "Mon code parent" : "Mon identifiant"}
                </p>
                <button
                  type="button"
                  title="Copier le code"
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 font-mono text-sm font-bold tracking-widest text-bordeaux hover:bg-gold/15 transition-colors cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(user.user_code ?? "").then(() => {
                      import("sonner").then(({ toast }) => toast.success("Code copié !"));
                    });
                  }}
                >
                  {user.user_code}
                </button>
                {user.role === "student" && (
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Partagez ce code avec un parent pour qu'il puisse suivre votre progression.
                  </p>
                )}
              </div>
            )}
            {isStudent && formatAcademicTrack(user) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Filière</span>
                <span className="font-medium truncate">{formatAcademicTrack(user)}</span>
              </div>
            )}
            {isStudent && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Sessions Khlayel</span>
                <span className="font-medium tabular-nums">{khConversations.length}</span>
              </div>
            )}
          </div>

          <Separator className="my-5" />

          {/* Quick links */}
          <div className="space-y-2">
            <Link to={workspaceHref} className={quickLinkCls}>
              <LayoutDashboard className="h-4 w-4" /> Mon espace
              <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
            </Link>
            {isStudent && (
              <>
                <Link to="/progress" className={quickLinkCls}>
                  <TrendingUp className="h-4 w-4" /> Ma progression
                  <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                </Link>
                <Link to="/khlayel" className={quickLinkCls}>
                  <BrainCircuit className="h-4 w-4" /> Khlayel AI
                  <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                </Link>
                <Link to="/subscriptions" className={quickLinkCls}>
                  <Crown className="h-4 w-4" /> Abonnements
                  <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                </Link>
              </>
            )}
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="space-y-10">
        {/* Info form */}
        <div className={`rounded-2xl border border-border bg-card p-8 shadow-sm ${isRTL ? "text-right" : ""}`}>
          <h2 className={`font-display text-2xl font-bold text-foreground flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bordeaux/10 text-bordeaux">
              <User className="h-5 w-5" />
            </span>
            {isTeacher ? t("profile_teacher_info") : t("profile_info")}
          </h2>
          <Separator className="my-5" />
          <form
            onSubmit={infoForm.handleSubmit(onInfoSubmit, (errors) => {
              // Surface silent validation failures (e.g. on fields without a visible input)
              const first = Object.values(errors)[0];
              toast.error(String(first?.message ?? "Corrige les champs invalides."));
            })}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">{t("profile_firstname")} *</Label>
                <Input id="first_name" {...infoForm.register("first_name")} />
                {infoForm.formState.errors.first_name && <p className="text-xs text-destructive">{infoForm.formState.errors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">{t("profile_lastname")} *</Label>
                <Input id="last_name" {...infoForm.register("last_name")} />
                {infoForm.formState.errors.last_name && <p className="text-xs text-destructive">{infoForm.formState.errors.last_name.message}</p>}
              </div>
            </div>

            <div className={`grid gap-4 ${isTeacher ? "grid-cols-1" : "grid-cols-2"}`}>
              <div className="space-y-1.5">
                <Label htmlFor="age">{t("profile_age")}</Label>
                <Input id="age" type="number" min={10} max={120} {...infoForm.register("age")} />
                {infoForm.formState.errors.age && <p className="text-xs text-destructive">{infoForm.formState.errors.age.message}</p>}
              </div>
              {!isTeacher && user?.grade_code && (
                <div className="space-y-1.5">
                  <Label>{t("profile_class")}</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground cursor-not-allowed select-none">
                    {GRADE_OPTIONS.find(o => o.value === user.grade_code)?.label ?? user.grade_code}
                    <span className="ml-auto text-xs text-muted-foreground/60">Défini à l'inscription</span>
                  </div>
                </div>
              )}
            </div>

            {!isTeacher && user?.section_code && (
              <div className="space-y-1.5">
                <Label>{t("profile_section")}</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground cursor-not-allowed select-none">
                  {SECTION_OPTIONS.find(o => o.value === user.section_code)?.label ?? user.section_code}
                  <span className="ml-auto text-xs text-muted-foreground/60">Défini à l'inscription</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("login_phone")}</Label>
              <Input id="phone" type="tel" placeholder="+216 ..." autoComplete="tel" {...infoForm.register("phone")} />
              {infoForm.formState.errors.phone && <p className="text-xs text-destructive">{infoForm.formState.errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="college">{t("profile_institution")}</Label>
              <Input id="college" placeholder="e.g. ESPRIT, FST Tunis…" {...infoForm.register("college")} />
            </div>

            {/* Avatar upload */}
            <div className="space-y-2">
              <Label>{t("profile_avatar")}</Label>
              <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                    {mounted && (avatarPreview || user?.avatar_url) ? (
                      <img
                        src={avatarPreview ?? (assetUrl(user?.avatar_url) ?? "")}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-bordeaux text-white border-2 border-background hover:opacity-90 transition-opacity"
                  >
                    {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {/* Text */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Photo de profil</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP · max 5 MB</p>
                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-2 text-xs font-medium text-bordeaux hover:underline disabled:opacity-50"
                  >
                    {avatarUploading ? "Upload en cours…" : "Changer la photo"}
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }}
                />
              </div>
            </div>

            <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90 w-full">
              {updateMutation.isPending ? (
                <><Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_saving")}</>
              ) : (
                <><Save className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_save")}</>
              )}
            </Button>
          </form>
        </div>

        {/* Subscription section — students only */}
        {isStudent && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bordeaux/10 text-bordeaux">
                <CreditCard className="h-5 w-5" />
              </span>
              Abonnement
            </h2>
            <Separator className="my-5" />

            {accessStatus?.has_active_subscription && accessStatus.active_subscription ? (
              (() => {
                const sub = accessStatus.active_subscription;
                const endDate = new Date(sub.end_date);
                const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));
                const cycleLabel = sub.billing_cycle === "1_month" ? "1 mois" : sub.billing_cycle === "3_months" ? "3 mois" : "1 an";
                const isAlmostExpired = daysLeft <= 7;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize text-sm px-3 py-1">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Actif
                      </Badge>
                      <Badge className="border border-gold/30 bg-gold/10 text-bordeaux capitalize text-sm px-3 py-1">
                        {sub.plan}
                      </Badge>
                      <span className="text-sm text-muted-foreground">· {cycleLabel}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                        <div className="text-xs text-muted-foreground">Valable du</div>
                        <div className="mt-1 font-semibold text-foreground">{new Date(sub.start_date).toLocaleDateString()}</div>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
                        <div className="text-xs text-muted-foreground">Valable jusqu'au</div>
                        <div className="mt-1 font-semibold text-foreground">{new Date(sub.end_date).toLocaleDateString()}</div>
                      </div>
                      <div className={`rounded-xl border px-4 py-3 ${isAlmostExpired ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30" : "border-border/70 bg-background/70"}`}>
                        <div className="text-xs text-muted-foreground">Jours restants</div>
                        <div className={`mt-1 font-semibold ${isAlmostExpired ? "text-amber-700 dark:text-amber-400" : "text-bordeaux"}`}>
                          {daysLeft} jour{daysLeft !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {isAlmostExpired && (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Votre abonnement expire bientôt. <Link to="/subscriptions" className="font-medium underline underline-offset-2">Renouveler maintenant</Link>
                      </p>
                    )}
                  </div>
                );
              })()
            ) : accessStatus?.has_pending_activation && accessStatus.pending_subscription ? (
              (() => {
                const pending = accessStatus.pending_subscription;
                const statusMessages: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                  pending_receipt: { label: "Reçu en attente d'upload", icon: <Clock className="mr-1.5 h-3.5 w-3.5" />, color: "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300" },
                  pending_approval: { label: "Reçu en cours de révision", icon: <AlertCircle className="mr-1.5 h-3.5 w-3.5" />, color: "border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300" },
                  pending_code: { label: "Entrer le code d'activation", icon: <CalendarClock className="mr-1.5 h-3.5 w-3.5" />, color: "border-bordeaux/20 bg-bordeaux/5 text-bordeaux" },
                };
                const info = statusMessages[pending.status] ?? statusMessages.pending_receipt;
                return (
                  <div className="space-y-4">
                    <Badge className={`border text-sm px-3 py-1 ${info.color}`}>
                      {info.icon} {info.label}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Vous avez un abonnement <strong className="capitalize">{pending.plan}</strong> en cours.{" "}
                      <Link to="/subscriptions" className="font-medium text-bordeaux underline-offset-2 hover:underline">Accéder aux abonnements</Link> pour finaliser l'activation.
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Vous n'avez pas encore d'abonnement actif. Abonnez-vous pour débloquer les cours et événements.</p>
                <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                  <Link to="/subscriptions">Voir les formules d'abonnement</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Password section */}
        <div className={`rounded-2xl border border-border bg-card p-8 shadow-sm ${isRTL ? "text-right" : ""}`}>
          <h2 className={`font-display text-2xl font-bold text-foreground flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bordeaux/10 text-bordeaux">
              <KeyRound className="h-5 w-5" />
            </span>
            {t("profile_pw_title")}
          </h2>
          <Separator className="my-5" />

          {pwStep === "idle" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("profile_pw_desc")}{" "}<span className="font-medium text-foreground">{user?.email}</span>.
              </p>
              <Button type="button" onClick={handleSendCode} disabled={requestResetMutation.isPending} variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5 w-full">
                {requestResetMutation.isPending ? (
                  <><Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_pw_sending")}</>
                ) : (
                  <><Mail className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_pw_send")}</>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={verifyPwForm.handleSubmit(handleVerifyAndChange)} className="space-y-5">
              <div className={`rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-foreground flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                <span>{t("profile_pw_notice")} <span className="font-medium">{user?.email}</span>{t("profile_pw_notice2")}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-code">{t("profile_pw_code")}</Label>
                <Input id="reset-code" inputMode="numeric" maxLength={6} placeholder="123456" className="tracking-[0.3em] text-center font-mono text-lg" {...verifyPwForm.register("code")} />
                {verifyPwForm.formState.errors.code && <p className="text-xs text-destructive">{verifyPwForm.formState.errors.code.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("profile_pw_new")}</Label>
                <PasswordInput id="new-password" registration={verifyPwForm.register("password")} />
                {verifyPwForm.formState.errors.password && <p className="text-xs text-destructive">{verifyPwForm.formState.errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("profile_pw_confirm")}</Label>
                <PasswordInput id="confirm-password" registration={verifyPwForm.register("confirm")} />
                {verifyPwForm.formState.errors.confirm && <p className="text-xs text-destructive">{verifyPwForm.formState.errors.confirm.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={handleSendCode} disabled={requestResetMutation.isPending}>
                  {requestResetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profile_pw_resend")}
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                  {resetPasswordMutation.isPending ? (
                    <><Loader2 className={`h-4 w-4 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_pw_updating")}</>
                  ) : (
                    <><KeyRound className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} /> {t("profile_pw_update")}</>
                  )}
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm" onClick={() => { verifyPwForm.reset(); setPwStep("idle"); }}>
                {t("profile_pw_cancel")}
              </Button>
            </form>
          )}
        </div>
        </div>{/* end main column */}
        </div>{/* end grid */}
      </section>
    </>
  );
}
