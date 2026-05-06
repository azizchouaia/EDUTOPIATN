import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, KeyRound, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMe, useUpdateProfile } from "@/hooks/useAuth";
import { GRADE_CODES, GRADE_OPTIONS, SECTION_CODES, SECTION_OPTIONS, formatAcademicTrack, inferSchoolCycle, needsSection } from "@/lib/academic";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "My Profile — Edutopia" },
      { name: "description", content: "View and update your Edutopia profile." },
    ],
  }),
  component: ProfilePage,
});

// ── Schemas ──────────────────────────────────────────────────
const infoSchema = z.object({
  first_name: z.string().trim().min(1, "Le prenom est obligatoire"),
  last_name: z.string().trim().min(1, "Le nom est obligatoire"),
  age: z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().min(10, "L'age doit etre superieur ou egal a 10").max(120, "L'age doit etre inferieur ou egal a 120").optional()),
  college: z.string().trim().max(120, "Le nom de l'etablissement est trop long").optional().or(z.literal("")),
  grade_code: z.enum(GRADE_CODES).optional().or(z.literal("")),
  section_code: z.enum(SECTION_CODES).optional().or(z.literal("")),
  avatar_url: z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().url("L'URL doit etre valide").optional().or(z.literal(""))),
}).superRefine((values, context) => {
  if (needsSection(values.grade_code) && !values.section_code) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["section_code"], message: "La section est obligatoire pour cette classe" })
  }
});

const pwSchema = z
  .object({
    password: z.string().min(8, "Minimum 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type InfoForm = z.infer<typeof infoSchema>;
type PwForm = z.infer<typeof pwSchema>;

// ── Component ────────────────────────────────────────────────
function ProfilePage() {
  const { data: user } = useMe();
  const updateMutation = useUpdateProfile();
  const [mounted, setMounted] = useState(false);
  const isTeacher = user?.role === "teacher";

  const infoForm = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      age: null,
      college: "",
      grade_code: "",
      section_code: "",
      avatar_url: "",
    },
  });
  const selectedGrade = infoForm.watch("grade_code");

  const pwForm = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
    defaultValues: { password: "", confirm: "" },
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
        college: user.college ?? "",
        grade_code: user.role === "teacher" ? "" : user.grade_code ?? "",
        section_code: user.role === "teacher" ? "" : user.section_code ?? "",
        avatar_url: user.avatar_url ?? "",
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!needsSection(selectedGrade)) {
      infoForm.setValue("section_code", "");
    }
  }, [selectedGrade, infoForm]);

  function onInfoSubmit(values: InfoForm) {
    if (!user) return;
    updateMutation.mutate(
      {
        id: user.id,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          age: values.age ?? null,
          college: values.college || null,
          school_cycle: isTeacher ? null : inferSchoolCycle(values.grade_code) as "college" | "lycee" | null,
          grade_code: isTeacher ? null : values.grade_code || null,
          section_code: isTeacher ? null : needsSection(values.grade_code) ? values.section_code || null : null,
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

  function onPwSubmit(values: PwForm) {
    if (!user) return;
    updateMutation.mutate(
      { id: user.id, data: { password: values.password } },
      {
        onSuccess: () => {
          toast.success("Mot de passe modifie."),
          pwForm.reset();
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.message ?? "Modification du mot de passe impossible."),
      }
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-16 flex items-center gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-gold ring-4 ring-white/20 shadow-elegant">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="avatar"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <User className="h-9 w-9 text-bordeaux" />
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {mounted && user ? `${user.first_name} ${user.last_name}` : "My Profile"}
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

      <section className="container mx-auto px-4 py-12 max-w-2xl space-y-10">
        {/* Info form */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-bordeaux" /> {isTeacher ? "Teacher Information" : "Personal Information"}
          </h2>
          <Separator className="my-5" />
          <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name *</Label>
                <Input id="first_name" {...infoForm.register("first_name")} />
                {infoForm.formState.errors.first_name && (
                  <p className="text-xs text-destructive">{infoForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name *</Label>
                <Input id="last_name" {...infoForm.register("last_name")} />
                {infoForm.formState.errors.last_name && (
                  <p className="text-xs text-destructive">{infoForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className={`grid gap-4 ${isTeacher ? "grid-cols-1" : "grid-cols-2"}`}>
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={10}
                  max={120}
                  {...infoForm.register("age")}
                />
                {infoForm.formState.errors.age && (
                  <p className="text-xs text-destructive">{infoForm.formState.errors.age.message}</p>
                )}
              </div>
              {!isTeacher && (
                <div className="space-y-1.5">
                  <Label htmlFor="grade_code">Class</Label>
                  <select
                    id="grade_code"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    {...infoForm.register("grade_code")}
                  >
                    <option value="">Select class</option>
                    {GRADE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!isTeacher && needsSection(selectedGrade) && (
              <div className="space-y-1.5">
                <Label htmlFor="section_code">Section</Label>
                <select
                  id="section_code"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  {...infoForm.register("section_code")}
                >
                  <option value="">Select section</option>
                  {SECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {infoForm.formState.errors.section_code && (
                  <p className="text-xs text-destructive">{infoForm.formState.errors.section_code.message}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="college">{isTeacher ? "Institution" : "College / Institution"}</Label>
              <Input
                id="college"
                placeholder="e.g. ESPRIT, FST Tunis…"
                {...infoForm.register("college")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                placeholder="https://…"
                {...infoForm.register("avatar_url")}
              />
              {infoForm.formState.errors.avatar_url && (
                <p className="text-xs text-destructive">{infoForm.formState.errors.avatar_url.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90 w-full"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save changes</>
              )}
            </Button>
          </form>
        </div>

        {/* Password form */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-bordeaux" /> Change Password
          </h2>
          <Separator className="my-5" />
          <form onSubmit={pwForm.handleSubmit(onPwSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...pwForm.register("password")} />
              {pwForm.formState.errors.password && (
                <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" {...pwForm.register("confirm")} />
              {pwForm.formState.errors.confirm && (
                <p className="text-xs text-destructive">{pwForm.formState.errors.confirm.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              variant="outline"
              className="border-bordeaux text-bordeaux hover:bg-bordeaux/5 w-full"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…</>
              ) : (
                <><KeyRound className="h-4 w-4 mr-2" /> Update password</>
              )}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
