import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";
import { useLogin, useRegister, useRequestPasswordReset, useResetPassword } from "@/hooks/useAuth";
import { GRADE_CODES, GRADE_OPTIONS, SECTION_CODES, SECTION_OPTIONS, needsSection } from "@/lib/academic";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Edutopia" },
      { name: "description", content: "Sign in or create your Edutopia account to access courses, tests and the marketplace." },
    ],
  }),
  component: LoginPage,
});

const signinSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  password: z.string().min(1, "Le mot de passe est obligatoire"),
})

const signupSchema = z.object({
  first_name: z.string().trim().min(2, "Le prenom doit contenir au moins 2 caracteres"),
  last_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
  role: z.enum(["student", "teacher", "parent"]),
  grade_code: z.enum(GRADE_CODES).optional().or(z.literal("")),
  section_code: z.enum(SECTION_CODES).optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.role === "student" && !value.grade_code) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["grade_code"], message: "Selectionnez une classe" })
  }

  if (value.role === "student" && needsSection(value.grade_code) && !value.section_code) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["section_code"], message: "Selectionnez une section" })
  }
})

const requestResetSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
})

const confirmResetSchema = z.object({
  email: z.string().trim().email("Saisissez une adresse e-mail valide"),
  code: z.string().trim().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
  confirm: z.string(),
}).refine((value) => value.password === value.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
})

type SigninForm = z.infer<typeof signinSchema>
type SignupForm = z.infer<typeof signupSchema>
type RequestResetForm = z.infer<typeof requestResetSchema>
type ConfirmResetForm = z.infer<typeof confirmResetSchema>

function getPostAuthPath(role: "admin" | "teacher" | "student" | "parent") {
  if (role === "admin") return "/admin"
  if (role === "teacher") return "/teacher"
  if (role === "parent") return "/parent"
  return "/dashboard"
}

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");

  const loginMutation    = useLogin();
  const registerMutation = useRegister();
  const requestPasswordResetMutation = useRequestPasswordReset();
  const resetPasswordMutation = useResetPassword();

  const signinForm = useForm<SigninForm>({ resolver: zodResolver(signinSchema), defaultValues: { email: "", password: "" } });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema), defaultValues: { first_name: "", last_name: "", email: "", password: "", role: "student", grade_code: "", section_code: "" } });
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
        password: data.password,
        role: data.role,
        grade_code: data.role === "student" && data.grade_code ? data.grade_code : undefined,
        section_code: data.role === "student" && needsSection(data.grade_code) && data.section_code ? data.section_code : undefined,
      });
      toast.success("Compte cree. Connectez-vous maintenant.");
      setMode("signin");
      signupForm.reset({ first_name: "", last_name: "", email: "", password: "", role: "student", grade_code: "", section_code: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Inscription impossible.");
    }
  }

  async function handleRequestReset(data: RequestResetForm) {
    try {
      const response = await requestPasswordResetMutation.mutateAsync({ email: data.email });
      toast.success(response.message);
      confirmResetForm.reset({ email: data.email, code: "", password: "", confirm: "" });
      setResetStep("confirm");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Envoi du code impossible.");
    }
  }

  async function handleResetPassword(data: ConfirmResetForm) {
    try {
      const response = await resetPasswordMutation.mutateAsync({ email: data.email, code: data.code, password: data.password });
      toast.success(response.message);
      signinForm.setValue("email", data.email);
      signinForm.setValue("password", "");
      requestResetForm.reset({ email: data.email });
      confirmResetForm.reset({ email: data.email, code: "", password: "", confirm: "" });
      setResetStep("request");
      setMode("signin");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Reinitialisation impossible.");
    }
  }

  function openForgotPassword() {
    const email = signinForm.getValues("email");
    requestResetForm.reset({ email });
    confirmResetForm.reset({ email, code: "", password: "", confirm: "" });
    setResetStep("request");
    setMode("forgot");
  }

  function backToSignin() {
    setMode("signin");
    setResetStep("request");
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] grid md:grid-cols-2">
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
            "Education is the most powerful weapon you can use to change the world."
          </h2>
          <div className="gold-divider mt-6" />
          <p className="mt-4 text-primary-foreground/80">— Nelson Mandela</p>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Edutopia</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="text-center md:hidden mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-gradient-bordeaux">
                <GraduationCap className="h-5 w-5 text-gold" />
              </span>
              <span className="font-display text-2xl font-bold text-bordeaux">Edutopia</span>
            </Link>
          </div>

          <h1 className="font-display text-4xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </h1>
          <div className="gold-divider mt-3" />
          <p className="mt-4 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your learning journey."
              : mode === "signup"
                ? "Join Edutopia and start learning today."
                : resetStep === "request"
                  ? "Enter your email and we will send you a secure reset code."
                  : "Enter the 6-digit code from your email and choose a new password."}
          </p>

          {mode === "signin" ? (
            <form className="mt-8 space-y-4" onSubmit={signinForm.handleSubmit(handleSignin)}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@edutopia.com"
                  {...signinForm.register("email")}
                />
                {signinForm.formState.errors.email ? <p className="text-xs text-destructive">{signinForm.formState.errors.email.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...signinForm.register("password")}
                />
                {signinForm.formState.errors.password ? <p className="text-xs text-destructive">{signinForm.formState.errors.password.message}</p> : null}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-sm font-medium text-bordeaux hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11"
              >
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : mode === "forgot" ? (
            resetStep === "request" ? (
              <form className="mt-8 space-y-4" onSubmit={requestResetForm.handleSubmit(handleRequestReset)}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@edutopia.com"
                    {...requestResetForm.register("email")}
                  />
                  {requestResetForm.formState.errors.email ? <p className="text-xs text-destructive">{requestResetForm.formState.errors.email.message}</p> : null}
                </div>
                <Button
                  type="submit"
                  disabled={requestPasswordResetMutation.isPending}
                  className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11"
                >
                  {requestPasswordResetMutation.isPending ? "Sending code…" : "Send reset code"}
                </Button>
                <Button type="button" variant="outline" className="w-full border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={backToSignin}>
                  Back to sign in
                </Button>
              </form>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={confirmResetForm.handleSubmit(handleResetPassword)}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email-confirm">Email</Label>
                  <Input
                    id="reset-email-confirm"
                    type="email"
                    placeholder="you@edutopia.com"
                    {...confirmResetForm.register("email")}
                  />
                  {confirmResetForm.formState.errors.email ? <p className="text-xs text-destructive">{confirmResetForm.formState.errors.email.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-code">Reset code</Label>
                  <Input
                    id="reset-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    {...confirmResetForm.register("code")}
                  />
                  {confirmResetForm.formState.errors.code ? <p className="text-xs text-destructive">{confirmResetForm.formState.errors.code.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="••••••••"
                    {...confirmResetForm.register("password")}
                  />
                  {confirmResetForm.formState.errors.password ? <p className="text-xs text-destructive">{confirmResetForm.formState.errors.password.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm">Confirm new password</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    placeholder="••••••••"
                    {...confirmResetForm.register("confirm")}
                  />
                  {confirmResetForm.formState.errors.confirm ? <p className="text-xs text-destructive">{confirmResetForm.formState.errors.confirm.message}</p> : null}
                </div>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11"
                >
                  {resetPasswordMutation.isPending ? "Updating password…" : "Reset password"}
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={() => setResetStep("request")}>
                    Resend code
                  </Button>
                  <Button type="button" variant="outline" className="border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={backToSignin}>
                    Back to sign in
                  </Button>
                </div>
              </form>
            )
          ) : (
            <form className="mt-8 space-y-4" onSubmit={signupForm.handleSubmit(handleSignup)}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Marie"
                    {...signupForm.register("first_name")}
                  />
                  {signupForm.formState.errors.first_name ? <p className="text-xs text-destructive">{signupForm.formState.errors.first_name.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Curie"
                    {...signupForm.register("last_name")}
                  />
                  {signupForm.formState.errors.last_name ? <p className="text-xs text-destructive">{signupForm.formState.errors.last_name.message}</p> : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailReg">Email</Label>
                <Input
                  id="emailReg"
                  type="email"
                  placeholder="you@edutopia.com"
                  {...signupForm.register("email")}
                />
                {signupForm.formState.errors.email ? <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passwordReg">Password</Label>
                <Input
                  id="passwordReg"
                  type="password"
                  placeholder="••••••••"
                  {...signupForm.register("password")}
                />
                {signupForm.formState.errors.password ? <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">I am a</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  {...signupForm.register("role")}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              {signupRole === "student" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="grade_code">Class</Label>
                    <select
                      id="grade_code"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                      {...signupForm.register("grade_code")}
                    >
                      <option value="">Select class</option>
                      {GRADE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {signupForm.formState.errors.grade_code ? <p className="text-xs text-destructive">{signupForm.formState.errors.grade_code.message}</p> : null}
                  </div>
                  {needsSection(signupGrade) && (
                    <div className="space-y-1.5">
                      <Label htmlFor="section_code">Section</Label>
                      <select
                        id="section_code"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                        {...signupForm.register("section_code")}
                      >
                        <option value="">Select section</option>
                        {SECTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {signupForm.formState.errors.section_code ? <p className="text-xs text-destructive">{signupForm.formState.errors.section_code.message}</p> : null}
                    </div>
                  )}
                </>
              )}
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant h-11"
              >
                {registerMutation.isPending ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signin" ? (
              <>
                New to Edutopia? {" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-bordeaux hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account? {" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-bordeaux hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Back to your account? {" "}
                <button
                  type="button"
                  onClick={backToSignin}
                  className="font-semibold text-bordeaux hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
