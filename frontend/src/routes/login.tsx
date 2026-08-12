import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { OtpInput, useCountdown } from "@/components/OtpInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLogin, useRegister, useRequestPasswordReset, useResetPassword } from "@/hooks/useAuth";
import { GRADE_CODES, GRADE_OPTIONS, SECTION_CODES, SECTION_OPTIONS, needsSection } from "@/lib/academic";
import { getStoredUser, isAuthenticated, saveAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import api from "@/lib/api";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string | undefined) ?? "signin",
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Edutopia" },
      { name: "description", content: "Connectez-vous ou créez votre compte Edutopia pour accéder aux cours, tests et à la boutique." },
    ],
  }),
  component: LoginPage,
});

const signinSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  password: z.string().min(1, "Le mot de passe est obligatoire"),
})

const signupSchema = z.object({
  first_name: z.string().trim().min(2, "Le prénom doit contenir au moins 2 caractères"),
  last_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  phone: z.string().trim().regex(/^\+?[0-9 ]{8,15}$/, "Saisissez un numéro de téléphone valide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["student", "teacher", "parent"]),
  grade_code: z.enum(GRADE_CODES).optional().or(z.literal("")),
  section_code: z.enum(SECTION_CODES).optional().or(z.literal("")),
  student_code: z.string().trim().optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.role === "student" && !value.grade_code) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["grade_code"], message: "Sélectionnez une classe" })
  }

  if (value.role === "student" && needsSection(value.grade_code) && !value.section_code) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["section_code"], message: "Sélectionnez une section" })
  }
})

const requestResetSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
})

const confirmResetSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  code: z.string().trim().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirm: z.string(),
}).refine((value) => value.password === value.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
})

type SigninForm = z.infer<typeof signinSchema>
type SignupForm = z.infer<typeof signupSchema>
type RequestResetForm = z.infer<typeof requestResetSchema>
type ConfirmResetForm = z.infer<typeof confirmResetSchema>

function getPostAuthPath(role: string) {
  if (role === "admin") return "/admin"
  if (role === "teacher") return "/teacher"
  if (role === "parent") return "/parent"
  if (role === "commercial") return "/commercial"
  return "/dashboard"
}

function PasswordInput({ id, placeholder, registration, autoComplete }: { id: string; placeholder: string; registration: any; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-10"
        {...registration}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ResetConfirmForm(props: {
  form: any;
  countdown: any;
  t: any;
  onSubmit: any;
  isPending: boolean;
  onResend: any;
  onBack: any;
}) {
  const { form, countdown, t, onSubmit, isPending, onResend, onBack } = props;
  const pwdPlaceholder = "••••••••";
  return (
    <form className="mt-8 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1.5">
        <Label htmlFor="reset-email-confirm">{t("login_email")}</Label>
        <Input id="reset-email-confirm" type="email" placeholder="you@edutopia.com" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs text-destructive">{String(form.formState.errors.email.message)}</p> : null}
      </div>
      <div className="space-y-2">
        <Label>{t("login_reset_code")}</Label>
        <OtpInput
          value={form.watch("code")}
          onChange={(v: string) => { form.setValue("code", v, { shouldValidate: true }); }}
        />
        {form.formState.errors.code ? <p className="text-xs text-destructive text-center">{String(form.formState.errors.code.message)}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-password">{t("login_new_password")}</Label>
        <PasswordInput id="reset-password" placeholder={pwdPlaceholder} autoComplete="new-password" registration={form.register("password")} />
        {form.formState.errors.password ? <p className="text-xs text-destructive">{String(form.formState.errors.password.message)}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">{t("login_confirm_pw")}</Label>
        <PasswordInput id="reset-confirm" placeholder={pwdPlaceholder} autoComplete="new-password" registration={form.register("confirm")} />
        {form.formState.errors.confirm ? <p className="text-xs text-destructive">{String(form.formState.errors.confirm.message)}</p> : null}
      </div>
      <Button type="submit" disabled={isPending} className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11">
        {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("login_resetting")}</> : t("login_reset_btn")}
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" disabled={countdown.active} className="border-bordeaux text-bordeaux hover:bg-bordeaux/5 disabled:opacity-60" onClick={onResend}>
          {countdown.active ? t("login_resend") + " (" + String(countdown.remaining) + "s)" : t("login_resend")}
        </Button>
        <Button type="button" variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={onBack}>
          {t("login_back_signin")}
        </Button>
      </div>
    </form>
  );
}

function LoginPage() {
  const { t, isRTL } = useLanguage();
  const { tab } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(
    tab === "signup" ? "signup" : "signin"
  );
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [animKey, setAnimKey] = useState(0);
  const [googlePending, setGooglePending] = useState(false);

  function switchMode(next: "signin" | "signup" | "forgot") {
    setMode(next);
    setAnimKey((k) => k + 1);
  }

  const countdown = useCountdown(60);

  const loginMutation    = useLogin();
  const registerMutation = useRegister();
  const requestPasswordResetMutation = useRequestPasswordReset();
  const resetPasswordMutation = useResetPassword();

  const signinForm = useForm<SigninForm>({ resolver: zodResolver(signinSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema), defaultValues: { first_name: "", last_name: "", email: "", phone: "", password: "", role: "student", grade_code: "", section_code: "", student_code: "" } });
  const requestResetForm = useForm<RequestResetForm>({ resolver: zodResolver(requestResetSchema), defaultValues: { email: "" } });
  const confirmResetForm = useForm<ConfirmResetForm>({ resolver: zodResolver(confirmResetSchema), defaultValues: { email: "", code: "", password: "", confirm: "" } });
  const signupRole = signupForm.watch("role")
  const signupGrade = signupForm.watch("grade_code")

  useEffect(() => {
    if (!needsSection(signupGrade)) {
      signupForm.setValue("section_code", "")
    }
  }, [signupGrade, signupForm])

  useEffect(() => {
    const user = getStoredUser();
    if (isAuthenticated() && user) {
      window.location.replace(getPostAuthPath(user.role));
    }
  }, []);

  async function handleSignin(data: SigninForm) {
    try {
      const result = await loginMutation.mutateAsync(data);
      window.location.replace(getPostAuthPath(result.user.role));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Connexion impossible.");
    }
  }

  async function handleSignup(data: SignupForm) {
    try {
      await registerMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
        grade_code: data.role === "student" && data.grade_code ? data.grade_code : undefined,
        section_code: data.role === "student" && needsSection(data.grade_code) && data.section_code ? data.section_code : undefined,
        student_code: data.role === "parent" && data.student_code ? data.student_code.toUpperCase() : undefined,
      });
      toast.success("Compte créé. Connectez-vous maintenant.");
      switchMode("signin");
      signupForm.reset({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "student", grade_code: "", section_code: "", student_code: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Inscription impossible.");
    }
  }

  async function handleRequestReset(data: RequestResetForm) {
    try {
      const response = await requestPasswordResetMutation.mutateAsync({ email: data.email });
      toast.success(response.message);
      confirmResetForm.reset({ email: data.email, code: "", password: "", confirm: "" });
      countdown.start();
      setResetStep("confirm");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Envoi du code impossible.");
    }
  }

  async function handleResetPassword(data: ConfirmResetForm) {
    try {
      const response = await resetPasswordMutation.mutateAsync({
        email: data.email,
        code: data.code,
        password: data.password,
      });
      toast.success(response.message);
      signinForm.setValue("email", data.email);
      signinForm.setValue("password", "");
      requestResetForm.reset({ email: data.email });
      confirmResetForm.reset({ email: data.email, code: "", password: "", confirm: "" });
      setResetStep("request");
      switchMode("signin");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Réinitialisation impossible.");
    }
  }

  function openForgotPassword() {
    const email = signinForm.getValues("email");
    requestResetForm.reset({ email });
    confirmResetForm.reset({ email, code: "", password: "", confirm: "" });
    setResetStep("request");
    switchMode("forgot");
  }

  function backToSignin() {
    switchMode("signin");
    setResetStep("request");
  }

  async function handleGoogleAuth(credential: string) {
    setGooglePending(true);
    try {
      const { data } = await api.post("/auth/google", { credential });
      saveAuth(data.token, data.user);
      window.location.replace(getPostAuthPath(data.user.role));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Google sign-in impossible.");
    } finally {
      setGooglePending(false);
    }
  }

  // Precomputed classNames -- avoids template literals inside JSX (TS 5.9.3 parser workaround)
  const clsTabBar = "flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1 mb-6 w-fit" + (isRTL ? " flex-row-reverse" : "");
  const clsTabActive = "relative px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 bg-gradient-bordeaux text-primary-foreground shadow-elegant";
  const clsTabInactive = "relative px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 text-muted-foreground hover:text-foreground";
  const clsFormSlide = "form-slide-in" + (isRTL ? " text-right" : "");
  const clsForgotRow = "flex " + (isRTL ? "justify-start" : "justify-end");

  return (
    <section className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2 page-enter">
      {/* Left: brand panel */}
      <div className="hidden md:flex relative bg-gradient-hero text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-bordeaux-deep">
            <GraduationCap className="h-5 w-5 text-gold" />
          </span>
          <span className="font-display text-2xl font-bold">
            Edu<span className="text-gradient-gold">topia</span>
          </span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            "L'éducation est l'arme la plus puissante que vous puissiez utiliser pour changer le monde."
          </h2>
          <div className="gold-divider mt-6" />
          <p className="mt-4 text-primary-foreground/80">— Nelson Mandela</p>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Edutopia</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12 overflow-hidden">
        <div className="w-full max-w-md">
          <div className="text-center md:hidden mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-gradient-bordeaux">
                <GraduationCap className="h-5 w-5 text-gold" />
              </span>
              <span className="font-display text-2xl font-bold text-bordeaux">Edutopia</span>
            </Link>
          </div>

          {/* Mode tab switcher — only for signin/signup */}
          {mode !== "forgot" && (
            <div className={clsTabBar}>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={mode === "signin" ? clsTabActive : clsTabInactive}
              >
                {t("nav_signin")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={mode === "signup" ? clsTabActive : clsTabInactive}
              >
                {t("nav_get_started")}
              </button>
            </div>
          )}

          <div key={animKey} className={clsFormSlide}>
            <h1 className="font-display text-4xl font-bold text-foreground">
              {mode === "signin" ? t("login_welcome") : mode === "signup" ? t("login_signup_title") : t("login_reset_title")}
            </h1>
            <div className="gold-divider mt-3" />
            <p className="mt-4 text-sm text-muted-foreground">
              {mode === "signin"
                ? t("login_subtitle")
                : mode === "signup"
                  ? t("login_signup_subtitle")
                  : resetStep === "request"
                    ? t("login_reset_step1")
                    : t("login_reset_step2")}
            </p>

          {mode === "signin" ? (
            <form className="mt-8 space-y-4" onSubmit={signinForm.handleSubmit(handleSignin)}>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("login_email")}</Label>
                <Input id="email" type="email" placeholder="you@edutopia.com" autoComplete="email" {...signinForm.register("email")} />
                {signinForm.formState.errors.email ? <p className="text-xs text-destructive">{signinForm.formState.errors.email.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("login_password")}</Label>
                <PasswordInput id="password" placeholder="••••••••" autoComplete="current-password" registration={signinForm.register("password")} />
                {signinForm.formState.errors.password ? <p className="text-xs text-destructive">{signinForm.formState.errors.password.message}</p> : null}
              </div>
              <div className={clsForgotRow}>
                <button type="button" onClick={openForgotPassword} className="text-sm font-medium text-bordeaux hover:underline">
                  {t("login_forgot")}
                </button>
              </div>
              <Button type="submit" disabled={loginMutation.isPending} className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11">
                {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("login_signing")}</> : t("login_btn")}
              </Button>
            </form>
          ) : mode === "forgot" ? (
            resetStep === "request" ? (
              <form className="mt-8 space-y-4" onSubmit={requestResetForm.handleSubmit(handleRequestReset)}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">{t("login_email")}</Label>
                  <Input id="reset-email" type="email" placeholder="you@edutopia.com" autoComplete="email" {...requestResetForm.register("email")} />
                  {requestResetForm.formState.errors.email ? <p className="text-xs text-destructive">{requestResetForm.formState.errors.email.message}</p> : null}
                </div>
                <Button type="submit" disabled={requestPasswordResetMutation.isPending} className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11">
                  {requestPasswordResetMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("login_sending")}</> : t("login_send_code")}
                </Button>
                <Button type="button" variant="outline" className="w-full border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={backToSignin}>
                  {t("login_back_signin")}
                </Button>
              </form>
            ) : (
              <ResetConfirmForm
                form={confirmResetForm as any}
                countdown={countdown}
                t={t}
                onSubmit={handleResetPassword}
                isPending={resetPasswordMutation.isPending}
                onResend={() => setResetStep("request")}
                onBack={backToSignin}
              />
            )
          ) : (
            <form className="mt-8 space-y-4" onSubmit={signupForm.handleSubmit(handleSignup)}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">{t("login_firstname")}</Label>
                  <Input id="firstName" placeholder="Marie" autoComplete="given-name" {...signupForm.register("first_name")} />
                  {signupForm.formState.errors.first_name ? <p className="text-xs text-destructive">{signupForm.formState.errors.first_name.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">{t("login_lastname")}</Label>
                  <Input id="lastName" placeholder="Curie" autoComplete="family-name" {...signupForm.register("last_name")} />
                  {signupForm.formState.errors.last_name ? <p className="text-xs text-destructive">{signupForm.formState.errors.last_name.message}</p> : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailReg">{t("login_email")}</Label>
                <Input id="emailReg" type="email" placeholder="you@edutopia.com" autoComplete="email" {...signupForm.register("email")} />
                {signupForm.formState.errors.email ? <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phoneReg">{t("login_phone")}</Label>
                <Input id="phoneReg" type="tel" placeholder="+216 ..." autoComplete="tel" {...signupForm.register("phone")} />
                {signupForm.formState.errors.phone ? <p className="text-xs text-destructive">{signupForm.formState.errors.phone.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passwordReg">{t("login_password")}</Label>
                <PasswordInput id="passwordReg" placeholder="••••••••" autoComplete="new-password" registration={signupForm.register("password")} />
                {signupForm.formState.errors.password ? <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">{t("login_iam")}</Label>
                <select id="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold" {...signupForm.register("role")}>
                  <option value="student">{t("login_student")}</option>
                  <option value="teacher">{t("login_teacher")}</option>
                  <option value="parent">{t("login_parent")}</option>
                </select>
              </div>
              {signupRole === "student" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="grade_code">{t("login_class")}</Label>
                    <select id="grade_code" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold" {...signupForm.register("grade_code")}>
                      <option value="">{t("login_select_class")}</option>
                      {GRADE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                    {signupForm.formState.errors.grade_code ? <p className="text-xs text-destructive">{signupForm.formState.errors.grade_code.message}</p> : null}
                  </div>
                  {needsSection(signupGrade) && (
                    <div className="space-y-1.5">
                      <Label htmlFor="section_code">{t("login_section")}</Label>
                      <select id="section_code" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold" {...signupForm.register("section_code")}>
                        <option value="">{t("login_select_section")}</option>
                        {SECTION_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </select>
                      {signupForm.formState.errors.section_code ? <p className="text-xs text-destructive">{signupForm.formState.errors.section_code.message}</p> : null}
                    </div>
                  )}
                </>
              )}
              {signupRole === "parent" && (
                <div className="space-y-1.5">
                  <Label htmlFor="student_code">Code élève <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input
                    id="student_code"
                    type="text"
                    placeholder="STU-EDU-00001"
                    className="uppercase tracking-widest font-mono font-bold text-bordeaux border-gold/40 bg-gold/5 placeholder:text-bordeaux/30 focus-visible:ring-gold/40"
                    {...signupForm.register("student_code")}
                    onChange={(e) => signupForm.setValue("student_code", e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground">
                    Entrez le code de l'élève (reçu par e-mail à l'inscription) pour être lié automatiquement.
                  </p>
                  {signupForm.formState.errors.student_code ? <p className="text-xs text-destructive">{signupForm.formState.errors.student_code.message}</p> : null}
                </div>
              )}
              <Button type="submit" disabled={registerMutation.isPending} className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11">
                {registerMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("login_creating")}</> : t("login_create_btn")}
              </Button>
            </form>
          )}

          </div>{/* end form-slide-in */}

          {mode !== "forgot" && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <>
              <div className="relative my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex-1 border-t border-border" />
                <span>ou continuer avec</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className={googlePending ? "flex justify-center opacity-60 pointer-events-none" : "flex justify-center"}>
                <GoogleLogin
                  onSuccess={(cred) => { if (cred.credential) void handleGoogleAuth(cred.credential); }}
                  onError={() => toast.error("Connexion Google impossible.")}
                  theme="outline"
                  text={mode === "signin" ? "signin_with" : "signup_with"}
                  shape="rectangular"
                  size="large"
                  width={440}
                />
              </div>
              {mode === "signup" && (
                <p className="mt-5 text-center text-xs text-muted-foreground">
                  En créant un compte, vous acceptez nos{" "}
                  <Link to="/terms" className="font-medium text-bordeaux hover:underline">Conditions d'utilisation</Link>
                  {" "}et{" "}
                  <Link to="/privacy" className="font-medium text-bordeaux hover:underline">Politique de confidentialité</Link>.
                </p>
              )}
            </>
          )}

          {mode === "forgot" && (
            <p className="mt-6 text-sm text-center text-muted-foreground">
              Retour à votre compte ?{" "}
              <button
                type="button"
                onClick={backToSignin}
                className="font-semibold text-bordeaux hover:underline"
              >
                Se connecter
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
