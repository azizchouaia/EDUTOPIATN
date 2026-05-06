import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api, { assetUrl } from "@/lib/api";
import { AdminListControls } from "@/components/admin/AdminListControls";
import { CurriculumAdminModule } from "@/components/admin/CurriculumAdminModule";
import { GRADE_OPTIONS, SECTION_OPTIONS, formatAcademicTrack, inferSchoolCycle, needsSection, type GradeCode, type SectionCode } from "@/lib/academic";
import { FormErrors, hasErrors, hasMinLength, isBlank, isNonNegativeInteger, isNonNegativeNumber, isPositiveInteger, isValidDateInput, isValidEmail, isValidSlug, isValidUrl } from "@/lib/validation";
import type { Course, Event, MarketOrder, ParentStudentLink, Product, PromoCode, Reclamation, Subscription, TeamMember, User } from "@/lib/types";
import { AdminPageIntro } from "./admin";

type ModuleName = "users" | "courses" | "events" | "products" | "orders" | "promo-codes" | "subscriptions" | "reclamations" | "team";

type UserForm = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: User["role"];
  grade_code: GradeCode | "";
  section_code: SectionCode | "";
};

type ParentLinkForm = {
  parent_id: string;
  student_id: string;
  relation_type: "parent" | "mother" | "father" | "guardian";
};

type CourseForm = {
  title: string;
  description: string;
  category: string;
  price: string;
  duration_hours: string;
  lessons_count: string;
  cover_image: string;
};

type EventForm = {
  title: string;
  description: string;
  category: string;
  delivery_type: Event["delivery_type"];
  access_url: string;
  event_date: string;
  seats_total: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  tag: Product["tag"];
  stock: string;
  image_url: string;
};

type PromoForm = {
  code: string;
  discount_percent: string;
  product_id: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
};

type SubscriptionForm = {
  user_id: string;
  plan: Subscription["plan"];
  status: Subscription["status"];
  start_date: string;
  end_date: string;
};

type TeamForm = {
  name: string;
  role: string;
  bio: string;
  initials: string;
  gradient_from: string;
  gradient_to: string;
  linkedin_url: string;
  github_url: string;
  email: string;
  display_order: string;
  is_active: boolean;
};

const INITIAL_USER_FORM: UserForm = { first_name: "", last_name: "", email: "", password: "", role: "student", grade_code: "", section_code: "" };
const INITIAL_COURSE_FORM: CourseForm = { title: "", description: "", category: "", price: "0", duration_hours: "0", lessons_count: "0", cover_image: "" };
const INITIAL_EVENT_FORM: EventForm = { title: "", description: "", category: "", delivery_type: "google_meet", access_url: "", event_date: "", seats_total: "50" };
const INITIAL_PRODUCT_FORM: ProductForm = { name: "", description: "", price: "0", category: "", tag: "none", stock: "0", image_url: "" };
const INITIAL_PROMO_FORM: PromoForm = { code: "", discount_percent: "10", product_id: "", max_uses: "", expires_at: "", is_active: true };
const INITIAL_SUBSCRIPTION_FORM: SubscriptionForm = { user_id: "", plan: "basic", status: "active", start_date: "", end_date: "" };
const INITIAL_TEAM_FORM: TeamForm = { name: "", role: "", bio: "", initials: "", gradient_from: "from-bordeaux", gradient_to: "to-bordeaux-deep", linkedin_url: "", github_url: "", email: "", display_order: "0", is_active: true };
const INITIAL_PARENT_LINK_FORM: ParentLinkForm = { parent_id: "", student_id: "", relation_type: "parent" };

export const Route = createFileRoute("/admin/$module")({
  component: AdminModulePage,
});

function AdminModulePage() {
  const { module } = Route.useParams();
  const safeModule = module as ModuleName;

  switch (safeModule) {
    case "users":
      return <UsersModule />;
    case "courses":
      return <CoursesModule />;
    case "events":
      return <EventsModule />;
    case "products":
      return <ProductsModule />;
    case "orders":
      return <OrdersModule />;
    case "promo-codes":
      return <PromoCodesModule />;
    case "subscriptions":
      return <SubscriptionsModule />;
    case "reclamations":
      return <ReclamationsModule />;
    case "team":
      return <TeamModule />;
    default:
      return (
        <Card className="border-border/70 bg-white/85">
          <CardContent className="p-8 text-center text-muted-foreground">Unknown module.</CardContent>
        </Card>
      );
  }
}

function UsersModule() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<User[]>("/users")).data,
  });
  const { data: parentLinks = [] } = useQuery<ParentStudentLink[]>({
    queryKey: ["admin-parent-links"],
    queryFn: async () => (await api.get<ParentStudentLink[]>("/users/parent-links")).data,
  });
  const [form, setForm] = useState<UserForm>(INITIAL_USER_FORM);
  const [linkForm, setLinkForm] = useState<ParentLinkForm>(INITIAL_PARENT_LINK_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [errors, setErrors] = useState<FormErrors<keyof UserForm & string>>({});
  const showSectionSelect = form.role === "student" && needsSection(form.grade_code);
  const parentUsers = users.filter((user) => user.role === "parent");
  const studentUsers = users.filter((user) => user.role === "student");

  const filteredUsers = sortItems(
    users.filter((user) => {
      const matchesText = matchesSearch(searchTerm, user.first_name, user.last_name, user.email, formatAcademicTrack(user) ?? "");
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? Boolean(user.is_active) : !user.is_active);

      return matchesText && matchesRole && matchesStatus;
    }),
    (user) => {
      switch (sortBy) {
        case "name-desc":
          return `${user.last_name} ${user.first_name}`;
        case "email-asc":
        case "email-desc":
          return user.email;
        case "recent":
          return user.id;
        default:
          return `${user.last_name} ${user.first_name}`;
      }
    },
    sortBy.endsWith("desc") || sortBy === "recent" ? "desc" : "asc"
  );

  const createMutation = useMutation({
    mutationFn: () => api.post("/users", form),
    onSuccess: () => {
      toast.success("Utilisateur cree.");
      resetForm(setForm, setEditingId, INITIAL_USER_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation de l'utilisateur impossible.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      toast.success("Utilisateur mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_USER_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de l'utilisateur impossible.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success("Utilisateur supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression de l'utilisateur impossible.")),
  });

  const createParentLinkMutation = useMutation({
    mutationFn: () => api.post("/users/parent-links", { parent_id: Number(linkForm.parent_id), student_id: Number(linkForm.student_id), relation_type: linkForm.relation_type }),
    onSuccess: () => {
      toast.success("Lien parent-enfant cree.");
      setLinkForm(INITIAL_PARENT_LINK_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-parent-links"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du lien parent-enfant impossible.")),
  });

  const deleteParentLinkMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/parent-links/${id}`),
    onSuccess: () => {
      toast.success("Lien parent-enfant supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-parent-links"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Suppression du lien parent-enfant impossible.")),
  });

  const handleSubmit = () => {
    const nextErrors = validateUserForm(form, Boolean(editingId));
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      toast.error("Corrigez le formulaire utilisateur avant enregistrement.");
      return;
    }

    if (editingId) {
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        school_cycle: form.role === "student" ? inferSchoolCycle(form.grade_code) : null,
        grade_code: form.role === "student" && form.grade_code ? form.grade_code : null,
        section_code: form.role === "student" && needsSection(form.grade_code) ? form.section_code || null : null,
      };
      if (form.password.trim()) {
        payload.password = form.password;
      }
      updateMutation.mutate({ id: editingId, data: payload });
      return;
    }

    createMutation.mutate();
  };

  return (
    <ModuleScaffold
      eyebrow="Users"
      title="Users module"
      description="Create accounts, edit details, manage roles, deactivate access, and remove accounts."
      form={
        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">{editingId ? "Edit user" : "Create user"}</CardTitle>
            <CardDescription>{editingId ? "Update account details or reset the password." : "Admin-side account creation."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="First name" value={form.first_name} onChange={(value) => setForm((prev) => ({ ...prev, first_name: value }))} />
              <FormInput label="First name" value={form.first_name} error={errors.first_name} onChange={(value) => setForm((prev) => ({ ...prev, first_name: value }))} />
              <FormInput label="Last name" value={form.last_name} error={errors.last_name} onChange={(value) => setForm((prev) => ({ ...prev, last_name: value }))} />
            </div>
            <FormInput label="Email" value={form.email} error={errors.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <FormInput label={editingId ? "New password" : "Password"} type="password" value={form.password} error={errors.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} placeholder={editingId ? "Leave blank to keep current password" : undefined} />
            <FormSelect label="Role" value={form.role} options={["admin", "teacher", "student", "parent"]} error={errors.role} onChange={(value) => setForm((prev) => ({ ...prev, role: value as User["role"], grade_code: value === "student" ? prev.grade_code : "", section_code: "" }))} />
            {form.role === "student" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Class</Label>
                  <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.grade_code ? "border-destructive" : "border-input"}`} value={form.grade_code} onChange={(e) => setForm((prev) => ({ ...prev, grade_code: e.target.value as GradeCode | "", section_code: needsSection(e.target.value) ? prev.section_code : "" }))}>
                    <option value="">Select class</option>
                    {GRADE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {errors.grade_code ? <p className="text-xs text-destructive">{errors.grade_code}</p> : null}
                </div>
                {showSectionSelect ? (
                  <div className="space-y-1.5">
                    <Label>Section</Label>
                    <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.section_code ? "border-destructive" : "border-input"}`} value={form.section_code} onChange={(e) => setForm((prev) => ({ ...prev, section_code: e.target.value as SectionCode | "" }))}>
                      <option value="">Select section</option>
                      {SECTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {errors.section_code ? <p className="text-xs text-destructive">{errors.section_code}</p> : null}
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                {createMutation.isPending || updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {editingId ? "Save changes" : "Create user"}</>}
              </Button>
              {editingId ? <Button type="button" variant="outline" onClick={() => resetForm(setForm, setEditingId, INITIAL_USER_FORM)}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>
      }
    >
      {isLoading ? <LoadingCard /> : (
        <>
          <AdminListControls
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by name, email, or class"
            filters={[
              { label: "Role", value: roleFilter, onChange: setRoleFilter, options: [{ value: "all", label: "All roles" }, { value: "admin", label: "Admin" }, { value: "teacher", label: "Teacher" }, { value: "student", label: "Student" }, { value: "parent", label: "Parent" }] },
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
            ]}
            sort={{ label: "Sort", value: sortBy, onChange: setSortBy, options: [{ value: "name-asc", label: "Name A-Z" }, { value: "name-desc", label: "Name Z-A" }, { value: "email-asc", label: "Email A-Z" }, { value: "email-desc", label: "Email Z-A" }, { value: "recent", label: "Newest first" }] }}
          />
          <AdminTable
            headers={["Name", "Email", "Role", "Track", "Status", "Actions"]}
            rows={filteredUsers.map((user) => [
              <div key={`name-${user.id}`}>
                <div className="font-medium text-foreground">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-muted-foreground">ID {user.id}</div>
              </div>,
              user.email,
              <select key={`role-${user.id}`} className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={user.role} onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value as User["role"] } })}>
                <option value="admin">admin</option>
                <option value="teacher">teacher</option>
                <option value="student">student</option>
                <option value="parent">parent</option>
              </select>,
              formatAcademicTrack(user) ?? "—",
              <Button key={`status-${user.id}`} size="sm" variant="outline" className={user.is_active ? "border-emerald-700 text-emerald-700" : "border-bordeaux text-bordeaux"} onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: user.is_active ? 0 : 1 } })}>
                {user.is_active ? "Active" : "Inactive"}
              </Button>,
              <div key={`actions-${user.id}`} className="flex flex-wrap gap-2">
                <EditButton onClick={() => {
                  setEditingId(user.id);
                  setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, password: "", role: user.role, grade_code: user.grade_code ?? "", section_code: user.section_code ?? "" });
                }} />
                <DeleteButton onDelete={() => deleteMutation.mutate(user.id)} />
              </div>,
            ])}
          />
          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="border-border/70 bg-background/70">
              <CardHeader>
                <CardTitle className="text-lg text-bordeaux">Assign parent to child</CardTitle>
                <CardDescription>Create the secure read-only link before the parent can see progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Parent</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={linkForm.parent_id} onChange={(event) => setLinkForm((prev) => ({ ...prev, parent_id: event.target.value }))}>
                    <option value="">Select parent</option>
                    {parentUsers.map((user) => <option key={user.id} value={String(user.id)}>{user.first_name} {user.last_name} · {user.email}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Student</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={linkForm.student_id} onChange={(event) => setLinkForm((prev) => ({ ...prev, student_id: event.target.value }))}>
                    <option value="">Select student</option>
                    {studentUsers.map((user) => <option key={user.id} value={String(user.id)}>{user.first_name} {user.last_name} · {user.email}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Relation</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={linkForm.relation_type} onChange={(event) => setLinkForm((prev) => ({ ...prev, relation_type: event.target.value as ParentLinkForm["relation_type"] }))}>
                    <option value="parent">parent</option>
                    <option value="mother">mother</option>
                    <option value="father">father</option>
                    <option value="guardian">guardian</option>
                  </select>
                </div>
                <Button type="button" className="w-full bg-gradient-bordeaux text-primary-foreground hover:opacity-90" disabled={!linkForm.parent_id || !linkForm.student_id || createParentLinkMutation.isPending} onClick={() => createParentLinkMutation.mutate()}>
                  {createParentLinkMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> Create link</>}
                </Button>
                {parentUsers.length === 0 || studentUsers.length === 0 ? <p className="text-xs text-muted-foreground">Create both a parent account and a student account before linking them.</p> : null}
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-background/70">
              <CardHeader>
                <CardTitle className="text-lg text-bordeaux">Parent-child links</CardTitle>
                <CardDescription>These links are what authorize the parent dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                {parentLinks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">No parent-child links yet.</div>
                ) : (
                  <div className="space-y-3">
                    {parentLinks.map((link) => (
                      <div key={link.id} className="rounded-2xl border border-border/70 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-medium text-foreground">{link.parent_first_name} {link.parent_last_name}</div>
                            <div className="text-xs text-muted-foreground">{link.parent_email}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{link.relation_type}</div>
                        </div>
                        <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3 text-sm">
                          <div className="font-medium text-foreground">{link.student_first_name} {link.student_last_name}</div>
                          <div className="text-xs text-muted-foreground">{link.student_email}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{formatAcademicTrack({ grade_code: link.grade_code, section_code: link.section_code, year_of_study: null }) ?? "No academic track"}</div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <DeleteButton onDelete={() => deleteParentLinkMutation.mutate(link.id)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </ModuleScaffold>
  );
}

function CoursesModule() {
  return <CurriculumAdminModule />;
}

function EventsModule() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["admin-events"],
    queryFn: async () => (await api.get<Event[]>("/events", { params: { include_all: true } })).data,
  });
  const [form, setForm] = useState<EventForm>(INITIAL_EVENT_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors<keyof EventForm & string>>({});

  const createMutation = useMutation({
    mutationFn: () => api.post("/events", eventPayload(form)),
    onSuccess: () => {
      toast.success("Evenement cree.");
      resetForm(setForm, setEditingId, INITIAL_EVENT_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation de l'evenement impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/events/${id}`, data),
    onSuccess: () => {
      toast.success("Evenement mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_EVENT_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de l'evenement impossible.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => {
      toast.success("Evenement supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  return (
    <ModuleScaffold
      eyebrow="Events"
      title="Events module"
      description="Create, edit, cancel, restore, and remove events."
      form={<SimpleEventForm form={form} setForm={setForm} errors={errors} isPending={createMutation.isPending || updateMutation.isPending} onSubmit={() => {
        const nextErrors = validateAdminEventForm(form)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
          toast.error("Corrigez le formulaire evenement avant enregistrement.")
          return
        }
        editingId ? updateMutation.mutate({ id: editingId, data: eventPayload(form) }) : createMutation.mutate()
      }} heading={editingId ? "Edit event" : "Create event"} submitLabel={editingId ? "Save changes" : "Create event"} onCancel={editingId ? () => resetForm(setForm, setEditingId, INITIAL_EVENT_FORM) : undefined} />}
    >
      {isLoading ? <LoadingCard /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="border-border/70 bg-white/85">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl font-semibold text-foreground">{event.title}</div>
                    <div className="text-sm text-muted-foreground">{new Date(event.event_date).toLocaleString()} · {event.first_name} {event.last_name}</div>
                  </div>
                  <Badge className={event.is_cancelled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{event.is_cancelled ? "Annule" : "Actif"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{event.delivery_type === "video" ? "Video gratuite" : `Google Meet · ${event.seats_taken}/${event.seats_total} places`}</span>
                  {event.access_url ? <a href={event.access_url} target="_blank" rel="noreferrer" className="text-bordeaux hover:underline">Ouvrir le lien</a> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <EditButton onClick={() => {
                    setEditingId(event.id);
                    setForm({ title: event.title, description: event.description ?? "", category: event.category ?? "", delivery_type: event.delivery_type, access_url: event.access_url ?? "", event_date: toDateTimeLocal(event.event_date), seats_total: String(event.seats_total ?? 50) });
                  }} />
                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateMutation.mutate({ id: event.id, data: { is_cancelled: event.is_cancelled ? 0 : 1 } })}>{event.is_cancelled ? "Restaurer" : "Annuler"}</Button>
                  <DeleteButton onDelete={() => deleteMutation.mutate(event.id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModuleScaffold>
  );
}

function ProductsModule() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => (await api.get<Product[]>("/market/products", { params: { include_inactive: true } })).data,
  });
  const [form, setForm] = useState<ProductForm>(INITIAL_PRODUCT_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors<keyof ProductForm & string>>({});

  const createMutation = useMutation({
    mutationFn: () => api.post("/market/products", productPayload(form)),
    onSuccess: () => {
      toast.success("Produit cree.");
      resetForm(setForm, setEditingId, INITIAL_PRODUCT_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du produit impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/market/products/${id}`, data),
    onSuccess: () => {
      toast.success("Produit mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_PRODUCT_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour du produit impossible.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/market/products/${id}`),
    onSuccess: () => {
      toast.success("Produit supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  return (
    <ModuleScaffold
      eyebrow="Products"
      title="Products module"
      description="Manage the product catalog, edit product details, control visibility, and remove items."
      form={<SimpleProductForm form={form} setForm={setForm} errors={errors} isPending={createMutation.isPending || updateMutation.isPending} onSubmit={() => {
        const nextErrors = validateProductForm(form)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
          toast.error("Corrigez le formulaire produit avant enregistrement.")
          return
        }
        editingId ? updateMutation.mutate({ id: editingId, data: productPayload(form) }) : createMutation.mutate()
      }} heading={editingId ? "Edit product" : "Create product"} submitLabel={editingId ? "Save changes" : "Create product"} onCancel={editingId ? () => resetForm(setForm, setEditingId, INITIAL_PRODUCT_FORM) : undefined} />}
    >
      {isLoading ? <LoadingCard /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="border-border/70 bg-white/85">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl font-semibold text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.category ?? "No category"} · stock {product.stock}</div>
                  </div>
                  <Badge className={product.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{product.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-3 font-display text-2xl text-bordeaux">EUR {Number(product.price).toFixed(2)}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <EditButton onClick={() => {
                    setEditingId(product.id);
                    setForm({ name: product.name, description: product.description ?? "", price: String(product.price ?? 0), category: product.category ?? "", tag: product.tag, stock: String(product.stock ?? 0), image_url: product.image_url ?? "" });
                  }} />
                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateMutation.mutate({ id: product.id, data: { is_active: product.is_active ? 0 : 1 } })}>{product.is_active ? "Deactivate" : "Activate"}</Button>
                  <DeleteButton onDelete={() => deleteMutation.mutate(product.id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModuleScaffold>
  );
}

function OrdersModule() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<MarketOrder[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => (await api.get<MarketOrder[]>("/market/orders/all")).data,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MarketOrder["status"] }) => api.put(`/market/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Commande mise a jour.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de la commande impossible.")),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const filteredOrders = sortItems(
    orders.filter((order) => {
      const matchesText = matchesSearch(searchTerm, order.first_name, order.last_name, order.email, order.promo_code ?? "", String(order.id));
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesText && matchesStatus;
    }),
    (order) => {
      switch (sortBy) {
        case "oldest":
        case "recent":
          return order.created_at;
        case "total-asc":
        case "total-desc":
          return Number(order.total_amount ?? 0);
        default:
          return order.created_at;
      }
    },
    sortBy === "oldest" || sortBy === "total-asc" ? "asc" : "desc"
  );

  return (
    <ModuleScaffold eyebrow="Orders" title="Orders module" description="Review marketplace orders and update their payment lifecycle.">
      {isLoading ? <LoadingCard /> : (
        <>
          <AdminListControls
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by customer, email, promo, or order ID"
            filters={[
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" }, { value: "refunded", label: "Refunded" }] },
            ]}
            sort={{ label: "Sort", value: sortBy, onChange: setSortBy, options: [{ value: "recent", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "total-desc", label: "Highest total" }, { value: "total-asc", label: "Lowest total" }] }}
          />
          <AdminTable
            headers={["Customer", "Promo", "Total", "Created", "Status"]}
            rows={filteredOrders.map((order) => [
              <div key={`customer-${order.id}`}>
                <div className="font-medium text-foreground">{order.first_name} {order.last_name}</div>
                <div className="text-xs text-muted-foreground">{order.email}</div>
              </div>,
              order.promo_code ?? "No promo",
              `EUR ${Number(order.total_amount).toFixed(2)}`,
              new Date(order.created_at).toLocaleString(),
              <select key={`status-${order.id}`} className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={order.status} onChange={(e) => updateMutation.mutate({ id: order.id, status: e.target.value as MarketOrder["status"] })}>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="cancelled">cancelled</option>
                <option value="refunded">refunded</option>
              </select>,
            ])}
          />
        </>
      )}
    </ModuleScaffold>
  );
}

function PromoCodesModule() {
  const queryClient = useQueryClient();
  const { data: promoCodes = [], isLoading } = useQuery<PromoCode[]>({ queryKey: ["admin-promo-codes"], queryFn: async () => (await api.get<PromoCode[]>("/market/promo-codes")).data });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["admin-products-options"], queryFn: async () => (await api.get<Product[]>("/market/products", { params: { include_inactive: true } })).data });
  const [form, setForm] = useState<PromoForm>(INITIAL_PROMO_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors<keyof PromoForm & string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("code-asc");

  const filteredPromoCodes = sortItems(
    promoCodes.filter((promo) => {
      const matchesText = matchesSearch(searchTerm, promo.code, promo.product_name ?? "", String(promo.discount_percent));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? Boolean(promo.is_active) : !promo.is_active);

      return matchesText && matchesStatus;
    }),
    (promo) => {
      switch (sortBy) {
        case "code-desc":
        case "code-asc":
          return promo.code;
        case "discount-desc":
        case "discount-asc":
          return promo.discount_percent;
        case "usage-desc":
        case "usage-asc":
          return promo.used_count;
        default:
          return promo.code;
      }
    },
    sortBy.endsWith("desc") ? "desc" : "asc"
  );

  const createMutation = useMutation({
    mutationFn: () => api.post("/market/promo-codes", promoPayload(form)),
    onSuccess: () => {
      toast.success("Code promo cree.");
      resetForm(setForm, setEditingId, INITIAL_PROMO_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du code promo impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/market/promo-codes/${id}`, data),
    onSuccess: () => {
      toast.success("Code promo mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_PROMO_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour du code promo impossible.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/market/promo-codes/${id}`),
    onSuccess: () => {
      toast.success("Code promo supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
  });

  return (
    <ModuleScaffold
      eyebrow="Promo Codes"
      title="Promo-code module"
      description="Create discounts, attach them to specific products, edit them, deactivate them, or remove them."
      form={<SimplePromoForm form={form} setForm={setForm} products={products} errors={errors} isPending={createMutation.isPending || updateMutation.isPending} onSubmit={() => {
        const nextErrors = validatePromoForm(form)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
          toast.error("Corrigez le formulaire promo avant enregistrement.")
          return
        }
        editingId ? updateMutation.mutate({ id: editingId, data: promoPayload(form) }) : createMutation.mutate()
      }} heading={editingId ? "Edit promo code" : "Create promo code"} submitLabel={editingId ? "Save changes" : "Create promo code"} onCancel={editingId ? () => resetForm(setForm, setEditingId, INITIAL_PROMO_FORM) : undefined} />}
    >
      {isLoading ? <LoadingCard /> : (
        <>
          <AdminListControls
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by promo code or product"
            filters={[
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
            ]}
            sort={{ label: "Sort", value: sortBy, onChange: setSortBy, options: [{ value: "code-asc", label: "Code A-Z" }, { value: "code-desc", label: "Code Z-A" }, { value: "discount-desc", label: "Highest discount" }, { value: "discount-asc", label: "Lowest discount" }, { value: "usage-desc", label: "Most used" }, { value: "usage-asc", label: "Least used" }] }}
          />
          <AdminTable
            headers={["Code", "Discount", "Product", "Usage", "Status", "Actions"]}
            rows={filteredPromoCodes.map((promo) => [
              <div key={`code-${promo.id}`} className="font-medium text-foreground">{promo.code}</div>,
              `${promo.discount_percent}%`,
              promo.product_name ?? "All products",
              `${promo.used_count}/${promo.max_uses ?? "∞"}`,
              <Button key={`status-${promo.id}`} size="sm" variant="outline" className={promo.is_active ? "border-emerald-700 text-emerald-700" : "border-bordeaux text-bordeaux"} onClick={() => updateMutation.mutate({ id: promo.id, data: { is_active: promo.is_active ? 0 : 1 } })}>{promo.is_active ? "Active" : "Inactive"}</Button>,
              <div key={`actions-${promo.id}`} className="flex flex-wrap gap-2">
                <EditButton onClick={() => {
                  setEditingId(promo.id);
                  setForm({ code: promo.code, discount_percent: String(promo.discount_percent), product_id: promo.product_id ? String(promo.product_id) : "", max_uses: promo.max_uses ? String(promo.max_uses) : "", expires_at: toDateTimeLocal(promo.expires_at), is_active: Boolean(promo.is_active) });
                }} />
                <DeleteButton onDelete={() => deleteMutation.mutate(promo.id)} />
              </div>,
            ])}
          />
        </>
      )}
    </ModuleScaffold>
  );
}

function SubscriptionsModule() {
  const queryClient = useQueryClient();
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({ queryKey: ["admin-subscriptions"], queryFn: async () => (await api.get<Subscription[]>("/subscriptions")).data });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["admin-users-options"], queryFn: async () => (await api.get<User[]>("/users")).data });
  const [form, setForm] = useState<SubscriptionForm>(INITIAL_SUBSCRIPTION_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors<keyof SubscriptionForm & string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("end-desc");

  const filteredSubscriptions = sortItems(
    subscriptions.filter((subscription) => {
      const matchesText = matchesSearch(searchTerm, subscription.first_name, subscription.last_name, subscription.email, subscription.plan, subscription.payment_method ?? "");
      const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
      const matchesPlan = planFilter === "all" || subscription.plan === planFilter;

      return matchesText && matchesStatus && matchesPlan;
    }),
    (subscription) => {
      switch (sortBy) {
        case "name-asc":
        case "name-desc":
          return `${subscription.last_name} ${subscription.first_name}`;
        case "start-asc":
        case "start-desc":
          return subscription.start_date;
        case "end-asc":
        case "end-desc":
          return subscription.end_date;
        default:
          return subscription.end_date;
      }
    },
    sortBy.endsWith("asc") ? "asc" : "desc"
  );

  const createMutation = useMutation({
    mutationFn: () => api.post("/subscriptions", subscriptionPayload(form)),
    onSuccess: () => {
      toast.success("Abonnement cree.");
      resetForm(setForm, setEditingId, INITIAL_SUBSCRIPTION_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation de l'abonnement impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/subscriptions/${id}`, data),
    onSuccess: () => {
      toast.success("Abonnement mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_SUBSCRIPTION_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour de l'abonnement impossible.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => {
      toast.success("Abonnement supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/subscriptions/${id}/approve-bank-transfer`),
    onSuccess: (response) => {
      const devCode = response.data?.development_code as string | undefined;
      toast.success(devCode ? `Virement valide. Code dev : ${devCode}` : "Virement valide.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Validation du virement impossible.")),
  });

  return (
    <ModuleScaffold
      eyebrow="Subscriptions"
      title="Subscriptions module"
      description="Create subscriptions linked to users, edit any plan window or state, and delete them if needed."
      form={<SimpleSubscriptionForm form={form} setForm={setForm} users={users} errors={errors} isPending={createMutation.isPending || updateMutation.isPending} onSubmit={() => {
        const nextErrors = validateSubscriptionForm(form)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
          toast.error("Corrigez le formulaire abonnement avant enregistrement.")
          return
        }
        editingId ? updateMutation.mutate({ id: editingId, data: subscriptionPayload(form) }) : createMutation.mutate()
      }} heading={editingId ? "Edit subscription" : "Create subscription"} submitLabel={editingId ? "Save changes" : "Create subscription"} onCancel={editingId ? () => resetForm(setForm, setEditingId, INITIAL_SUBSCRIPTION_FORM) : undefined} />}
    >
      {isLoading ? <LoadingCard /> : (
        <>
          <AdminListControls
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by user, email, plan, or payment method"
            filters={[
              { label: "Plan", value: planFilter, onChange: setPlanFilter, options: [{ value: "all", label: "All plans" }, { value: "basic", label: "Basic" }, { value: "premium", label: "Premium" }, { value: "enterprise", label: "Enterprise" }] },
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "pending_receipt", label: "Pending receipt" }, { value: "pending_approval", label: "Pending approval" }, { value: "pending_code", label: "Pending code" }, { value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "cancelled", label: "Cancelled" }] },
            ]}
            sort={{ label: "Sort", value: sortBy, onChange: setSortBy, options: [{ value: "end-desc", label: "Ends latest" }, { value: "end-asc", label: "Ends soonest" }, { value: "start-desc", label: "Starts latest" }, { value: "start-asc", label: "Starts earliest" }, { value: "name-asc", label: "Name A-Z" }, { value: "name-desc", label: "Name Z-A" }] }}
          />
          <AdminTable
            headers={["User", "Plan", "Payment", "Dates", "Status", "Actions"]}
            rows={filteredSubscriptions.map((subscription) => [
              <div key={`user-${subscription.id}`}>
                <div className="font-medium text-foreground">{subscription.first_name} {subscription.last_name}</div>
                <div className="text-xs text-muted-foreground">{subscription.email}</div>
              </div>,
              subscription.plan,
              <div key={`payment-${subscription.id}`} className="space-y-1 text-sm">
                <div className="font-medium text-foreground">{subscription.payment_method?.replace("_", " ") ?? "online"}</div>
                {subscription.bank_receipt_path ? (
                  <a href={assetUrl(subscription.bank_receipt_path) ?? undefined} target="_blank" rel="noreferrer" className="text-xs text-bordeaux hover:underline">
                    {subscription.bank_receipt_original_name ?? "View receipt"}
                  </a>
                ) : (
                  <div className="text-xs text-muted-foreground">No receipt</div>
                )}
              </div>,
              `${subscription.start_date} → ${subscription.end_date}`,
              <select key={`status-${subscription.id}`} className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={subscription.status} onChange={(e) => updateMutation.mutate({ id: subscription.id, data: { status: e.target.value as Subscription["status"] } })}>
                <option value="pending_receipt">pending receipt</option>
                <option value="pending_approval">pending approval</option>
                <option value="pending_code">pending code</option>
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="cancelled">cancelled</option>
              </select>,
              <div key={`actions-${subscription.id}`} className="flex flex-wrap gap-2">
                {subscription.bank_receipt_path ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-bordeaux text-bordeaux"
                  >
                    <a href={assetUrl(subscription.bank_receipt_path) ?? undefined} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> View receipt
                    </a>
                  </Button>
                ) : null}
                {subscription.payment_method === "bank_transfer" && subscription.status === "pending_approval" ? (
                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => approveMutation.mutate(subscription.id)}>
                    Approve receipt
                  </Button>
                ) : null}
                <EditButton onClick={() => {
                  setEditingId(subscription.id);
                  setForm({ user_id: String(subscription.user_id), plan: subscription.plan, status: subscription.status, start_date: toDate(subscription.start_date), end_date: toDate(subscription.end_date) });
                }} />
                <DeleteButton onDelete={() => deleteMutation.mutate(subscription.id)} />
              </div>,
            ])}
          />
        </>
      )}
    </ModuleScaffold>
  );
}

function ReclamationsModule() {
  const queryClient = useQueryClient();
  const { data: reclamations = [], isLoading } = useQuery<Array<Reclamation & { first_name: string; last_name: string; email: string }>>({ queryKey: ["admin-reclamations"], queryFn: async () => (await api.get<Array<Reclamation & { first_name: string; last_name: string; email: string }>>("/reclamations")).data });
  const updateMutation = useMutation({ mutationFn: ({ id, status }: { id: number; status: Reclamation["status"] }) => api.put(`/reclamations/${id}/status`, { status }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reclamations"] }) });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/reclamations/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reclamations"] }) });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  const categoryOptions = Array.from(new Set(reclamations.map((ticket) => ticket.category).filter(Boolean))) as string[];
  const filteredReclamations = sortItems(
    reclamations.filter((ticket) => {
      const matchesText = matchesSearch(searchTerm, ticket.first_name, ticket.last_name, ticket.email, ticket.subject, ticket.message, ticket.category ?? "");
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;

      return matchesText && matchesStatus && matchesCategory;
    }),
    (ticket) => (sortBy === "subject-asc" || sortBy === "subject-desc" ? ticket.subject : ticket.id),
    sortBy.endsWith("asc") ? "asc" : "desc"
  );

  return (
    <ModuleScaffold eyebrow="Reclamations" title="Support module" description="Review tickets, update status, and delete invalid entries.">
      {isLoading ? <LoadingCard /> : (
        <>
          <AdminListControls
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search by user, subject, message, or category"
            filters={[
              { label: "Status", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "open", label: "Open" }, { value: "in_progress", label: "In progress" }, { value: "resolved", label: "Resolved" }] },
              { label: "Category", value: categoryFilter, onChange: setCategoryFilter, options: [{ value: "all", label: "All categories" }, ...categoryOptions.map((category) => ({ value: category, label: category }))] },
            ]}
            sort={{ label: "Sort", value: sortBy, onChange: setSortBy, options: [{ value: "recent", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "subject-asc", label: "Subject A-Z" }, { value: "subject-desc", label: "Subject Z-A" }] }}
          />
          <AdminTable
            headers={["User", "Subject", "Category", "Status", "Actions"]}
            rows={filteredReclamations.map((ticket) => [
              <div key={`user-${ticket.id}`}>
                <div className="font-medium text-foreground">{ticket.first_name} {ticket.last_name}</div>
                <div className="text-xs text-muted-foreground">{ticket.email}</div>
              </div>,
              <div key={`subject-${ticket.id}`}>
                <div className="font-medium text-foreground">{ticket.subject}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{ticket.message}</div>
              </div>,
              ticket.category ?? "-",
              <select key={`status-${ticket.id}`} className="rounded-md border border-input bg-background px-2 py-1 text-sm" value={ticket.status} onChange={(e) => updateMutation.mutate({ id: ticket.id, status: e.target.value as Reclamation["status"] })}>
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="resolved">resolved</option>
              </select>,
              <DeleteButton key={`delete-${ticket.id}`} onDelete={() => deleteMutation.mutate(ticket.id)} />,
            ])}
          />
        </>
      )}
    </ModuleScaffold>
  );
}

function TeamModule() {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery<TeamMember[]>({ queryKey: ["admin-team"], queryFn: async () => (await api.get<TeamMember[]>("/team/all")).data });
  const [form, setForm] = useState<TeamForm>(INITIAL_TEAM_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors<keyof TeamForm & string>>({});

  const createMutation = useMutation({
    mutationFn: () => api.post("/team", teamPayload(form)),
    onSuccess: () => {
      toast.success("Membre de l'equipe cree.");
      resetForm(setForm, setEditingId, INITIAL_TEAM_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Creation du membre de l'equipe impossible.")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/team/${id}`, data),
    onSuccess: () => {
      toast.success("Membre de l'equipe mis a jour.");
      resetForm(setForm, setEditingId, INITIAL_TEAM_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Mise a jour du membre de l'equipe impossible.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/team/${id}`),
    onSuccess: () => {
      toast.success("Membre de l'equipe supprime.");
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
  });

  return (
    <ModuleScaffold
      eyebrow="Team"
      title="Team module"
      description="The public team page is no longer static. Create, edit, hide, show, and remove team members here."
      form={<SimpleTeamForm form={form} setForm={setForm} errors={errors} isPending={createMutation.isPending || updateMutation.isPending} onSubmit={() => {
        const nextErrors = validateTeamForm(form)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
          toast.error("Corrigez le formulaire equipe avant enregistrement.")
          return
        }
        editingId ? updateMutation.mutate({ id: editingId, data: teamPayload(form) }) : createMutation.mutate()
      }} heading={editingId ? "Edit team member" : "Create team member"} submitLabel={editingId ? "Save changes" : "Create member"} onCancel={editingId ? () => resetForm(setForm, setEditingId, INITIAL_TEAM_FORM) : undefined} />}
    >
      {isLoading ? <LoadingCard /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {members.map((member) => (
            <Card key={member.id} className="border-border/70 bg-white/85">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl font-semibold text-foreground">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.role}</div>
                  </div>
                  <Badge className={member.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{member.is_active ? "Visible" : "Hidden"}</Badge>
                </div>
                {member.bio ? <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <EditButton onClick={() => {
                    setEditingId(member.id);
                    setForm({ name: member.name, role: member.role, bio: member.bio ?? "", initials: member.initials ?? "", gradient_from: member.gradient_from, gradient_to: member.gradient_to, linkedin_url: member.linkedin_url ?? "", github_url: member.github_url ?? "", email: member.email ?? "", display_order: String(member.display_order ?? 0), is_active: Boolean(member.is_active) });
                  }} />
                  <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={() => updateMutation.mutate({ id: member.id, data: { is_active: member.is_active ? 0 : 1 } })}>{member.is_active ? "Hide" : "Show"}</Button>
                  <DeleteButton onDelete={() => deleteMutation.mutate(member.id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ModuleScaffold>
  );
}

function ModuleScaffold({ eyebrow, title, description, form, children }: { eyebrow: string; title: string; description: string; form?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <AdminPageIntro eyebrow={eyebrow} title={title} description={description} />
      <div className={`grid gap-6 ${form ? "xl:grid-cols-[380px_minmax(0,1fr)]" : ""}`}>
        {form ?? null}
        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-bordeaux">Records</CardTitle>
            <CardDescription>Live data from the backend.</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = "text", placeholder, error }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} className={error ? "border-destructive" : undefined} onChange={(e) => onChange(e.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function FormSelect({ label, value, options, onChange, error }: { label: string; value: string; options: readonly string[] | string[]; onChange: (value: string) => void; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${error ? "border-destructive" : "border-input"}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function FormTextarea({ label, value, onChange, rows = 4, error, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; error?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={rows} value={value} placeholder={placeholder} className={error ? "border-destructive" : undefined} onChange={(e) => onChange(e.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={() => { if (window.confirm("Delete this item?")) onDelete(); }}>
      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
    </Button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className="border-bordeaux text-bordeaux" onClick={onClick}>
      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
    </Button>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
    </div>
  );
}

function AdminTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-muted-foreground">
                No records yet.
              </td>
            </tr>
          ) : null}
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/70 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleCourseForm({ form, setForm, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: CourseForm; setForm: Dispatch<SetStateAction<CourseForm>>; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof CourseForm & string> }) {
  return (
    <Card className="border-border/70 bg-white/85">
      <CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <FormInput label="Title" value={form.title} error={errors.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} />
        <FormInput label="Category" value={form.category} error={errors.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} />
        <FormInput label="Price" type="number" value={form.price} error={errors.price} onChange={(value) => setForm((prev) => ({ ...prev, price: value }))} />
        <FormInput label="Duration hours" type="number" value={form.duration_hours} error={errors.duration_hours} onChange={(value) => setForm((prev) => ({ ...prev, duration_hours: value }))} />
        <FormInput label="Lessons count" type="number" value={form.lessons_count} error={errors.lessons_count} onChange={(value) => setForm((prev) => ({ ...prev, lessons_count: value }))} />
        <FormInput label="Cover image URL" value={form.cover_image} error={errors.cover_image} onChange={(value) => setForm((prev) => ({ ...prev, cover_image: value }))} />
        <FormTextarea label="Description" value={form.description} error={errors.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>
          {onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleEventForm({ form, setForm, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: EventForm; setForm: Dispatch<SetStateAction<EventForm>>; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof EventForm & string> }) {
  const isVideo = form.delivery_type === "video";

  return (
    <Card className="border-border/70 bg-white/85"><CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader><CardContent className="grid gap-4"><FormInput label="Titre" value={form.title} error={errors.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} /><FormInput label="Categorie" value={form.category} error={errors.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} /><div className="space-y-1.5"><Label>Type de session</Label><select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.delivery_type ? "border-destructive" : "border-input"}`} value={form.delivery_type} onChange={(e) => setForm((prev) => ({ ...prev, delivery_type: e.target.value as Event["delivery_type"], seats_total: e.target.value === "video" ? "0" : prev.seats_total || "50" }))}><option value="google_meet">Live Google Meet</option><option value="video">Video gratuite</option></select>{errors.delivery_type ? <p className="text-xs text-destructive">{errors.delivery_type}</p> : null}</div><FormInput label={isVideo ? "Lien video" : "Lien Google Meet"} value={form.access_url} error={errors.access_url} onChange={(value) => setForm((prev) => ({ ...prev, access_url: value }))} /><FormInput label="Date et heure" type="datetime-local" value={form.event_date} error={errors.event_date} onChange={(value) => setForm((prev) => ({ ...prev, event_date: value }))} />{isVideo ? null : <FormInput label="Places" type="number" value={form.seats_total} error={errors.seats_total} onChange={(value) => setForm((prev) => ({ ...prev, seats_total: value }))} />}<FormTextarea label="Description" value={form.description} error={errors.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} /><div className="flex flex-wrap gap-3"><Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>{onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Annuler</Button> : null}</div></CardContent></Card>
  );
}

function SimpleProductForm({ form, setForm, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: ProductForm; setForm: Dispatch<SetStateAction<ProductForm>>; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof ProductForm & string> }) {
  return (
    <Card className="border-border/70 bg-white/85"><CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader><CardContent className="grid gap-4"><FormInput label="Name" value={form.name} error={errors.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} /><FormInput label="Category" value={form.category} error={errors.category} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} /><FormInput label="Price" type="number" value={form.price} error={errors.price} onChange={(value) => setForm((prev) => ({ ...prev, price: value }))} /><FormInput label="Stock" type="number" value={form.stock} error={errors.stock} onChange={(value) => setForm((prev) => ({ ...prev, stock: value }))} /><FormSelect label="Tag" value={form.tag} options={["none", "bestseller", "new", "limited", "promo"]} error={errors.tag} onChange={(value) => setForm((prev) => ({ ...prev, tag: value as Product["tag"] }))} /><FormInput label="Image URL" value={form.image_url} error={errors.image_url} onChange={(value) => setForm((prev) => ({ ...prev, image_url: value }))} /><FormTextarea label="Description" value={form.description} error={errors.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} /><div className="flex flex-wrap gap-3"><Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>{onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}</div></CardContent></Card>
  );
}

function SimplePromoForm({ form, setForm, products, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: PromoForm; setForm: Dispatch<SetStateAction<PromoForm>>; products: Product[]; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof PromoForm & string> }) {
  return (
    <Card className="border-border/70 bg-white/85"><CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader><CardContent className="grid gap-4"><FormInput label="Code" value={form.code} error={errors.code} onChange={(value) => setForm((prev) => ({ ...prev, code: value.toUpperCase() }))} /><FormInput label="Discount percent" type="number" value={form.discount_percent} error={errors.discount_percent} onChange={(value) => setForm((prev) => ({ ...prev, discount_percent: value }))} /><div className="space-y-1.5"><Label>Related product</Label><select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.product_id ? "border-destructive" : "border-input"}`} value={form.product_id} onChange={(e) => setForm((prev) => ({ ...prev, product_id: e.target.value }))}><option value="">All products</option>{products.map((product) => <option key={product.id} value={String(product.id)}>{product.name}</option>)}</select>{errors.product_id ? <p className="text-xs text-destructive">{errors.product_id}</p> : null}</div><FormInput label="Max uses" type="number" value={form.max_uses} error={errors.max_uses} onChange={(value) => setForm((prev) => ({ ...prev, max_uses: value }))} /><FormInput label="Expires at" type="datetime-local" value={form.expires_at} error={errors.expires_at} onChange={(value) => setForm((prev) => ({ ...prev, expires_at: value }))} /><div className="space-y-1.5"><Label>Status</Label><select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.is_active ? "border-destructive" : "border-input"}`} value={form.is_active ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "1" }))}><option value="1">active</option><option value="0">inactive</option></select>{errors.is_active ? <p className="text-xs text-destructive">{errors.is_active}</p> : null}</div><div className="flex flex-wrap gap-3"><Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>{onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}</div></CardContent></Card>
  );
}

function SimpleSubscriptionForm({ form, setForm, users, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: SubscriptionForm; setForm: Dispatch<SetStateAction<SubscriptionForm>>; users: User[]; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof SubscriptionForm & string> }) {
  return (
    <Card className="border-border/70 bg-white/85"><CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="space-y-1.5"><Label>User</Label><select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.user_id ? "border-destructive" : "border-input"}`} value={form.user_id} onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}><option value="">Select user</option>{users.map((user) => <option key={user.id} value={String(user.id)}>{user.first_name} {user.last_name} · {user.email}</option>)}</select>{errors.user_id ? <p className="text-xs text-destructive">{errors.user_id}</p> : null}</div><FormSelect label="Plan" value={form.plan} options={["basic", "premium", "enterprise"]} error={errors.plan} onChange={(value) => setForm((prev) => ({ ...prev, plan: value as Subscription["plan"] }))} /><FormSelect label="Status" value={form.status} options={["pending_receipt", "pending_approval", "pending_code", "active", "expired", "cancelled"]} error={errors.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value as Subscription["status"] }))} /><FormInput label="Start date" type="date" value={form.start_date} error={errors.start_date} onChange={(value) => setForm((prev) => ({ ...prev, start_date: value }))} /><FormInput label="End date" type="date" value={form.end_date} error={errors.end_date} onChange={(value) => setForm((prev) => ({ ...prev, end_date: value }))} /><div className="flex flex-wrap gap-3"><Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>{onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}</div></CardContent></Card>
  );
}

function SimpleTeamForm({ form, setForm, isPending, onSubmit, heading, submitLabel, onCancel, errors = {} }: { form: TeamForm; setForm: Dispatch<SetStateAction<TeamForm>>; isPending: boolean; onSubmit: () => void; heading: string; submitLabel: string; onCancel?: () => void; errors?: FormErrors<keyof TeamForm & string> }) {
  return (
    <Card className="border-border/70 bg-white/85"><CardHeader><CardTitle className="font-display text-2xl text-bordeaux">{heading}</CardTitle></CardHeader><CardContent className="grid gap-4"><FormInput label="Name" value={form.name} error={errors.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} /><FormInput label="Role" value={form.role} error={errors.role} onChange={(value) => setForm((prev) => ({ ...prev, role: value }))} /><FormInput label="Initials" value={form.initials} error={errors.initials} onChange={(value) => setForm((prev) => ({ ...prev, initials: value }))} /><FormInput label="Email" value={form.email} error={errors.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} /><FormInput label="LinkedIn URL" value={form.linkedin_url} error={errors.linkedin_url} onChange={(value) => setForm((prev) => ({ ...prev, linkedin_url: value }))} /><FormInput label="GitHub URL" value={form.github_url} error={errors.github_url} onChange={(value) => setForm((prev) => ({ ...prev, github_url: value }))} /><FormInput label="Display order" type="number" value={form.display_order} error={errors.display_order} onChange={(value) => setForm((prev) => ({ ...prev, display_order: value }))} /><div className="grid gap-4 md:grid-cols-2"><FormInput label="Gradient from" value={form.gradient_from} error={errors.gradient_from} onChange={(value) => setForm((prev) => ({ ...prev, gradient_from: value }))} /><FormInput label="Gradient to" value={form.gradient_to} error={errors.gradient_to} onChange={(value) => setForm((prev) => ({ ...prev, gradient_to: value }))} /></div><div className="space-y-1.5"><Label>Status</Label><select className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${errors.is_active ? "border-destructive" : "border-input"}`} value={form.is_active ? "1" : "0"} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "1" }))}><option value="1">visible</option><option value="0">hidden</option></select>{errors.is_active ? <p className="text-xs text-destructive">{errors.is_active}</p> : null}</div><FormTextarea label="Bio" value={form.bio} error={errors.bio} onChange={(value) => setForm((prev) => ({ ...prev, bio: value }))} /><div className="flex flex-wrap gap-3"><Button type="button" onClick={onSubmit} disabled={isPending} className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">{isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="mr-2 h-4 w-4" /> {submitLabel}</>}</Button>{onCancel ? <Button type="button" variant="outline" onClick={onCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button> : null}</div></CardContent></Card>
  );
}

function coursePayload(form: CourseForm) {
  return {
    title: form.title,
    description: form.description || null,
    category: form.category || null,
    price: Number(form.price || 0),
    duration_hours: Number(form.duration_hours || 0),
    lessons_count: Number(form.lessons_count || 0),
    cover_image: form.cover_image || null,
  };
}

function eventPayload(form: EventForm) {
  return {
    title: form.title,
    description: form.description || null,
    category: form.category || null,
    delivery_type: form.delivery_type,
    access_url: form.access_url,
    event_date: new Date(form.event_date).toISOString(),
    seats_total: form.delivery_type === "video" ? 0 : Number(form.seats_total || 50),
  };
}

function productPayload(form: ProductForm) {
  return {
    name: form.name,
    description: form.description || null,
    price: Number(form.price || 0),
    category: form.category || null,
    tag: form.tag,
    stock: Number(form.stock || 0),
    image_url: form.image_url || null,
  };
}

function promoPayload(form: PromoForm) {
  return {
    code: form.code,
    discount_percent: Number(form.discount_percent || 0),
    product_id: form.product_id ? Number(form.product_id) : null,
    max_uses: form.max_uses ? Number(form.max_uses) : null,
    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    is_active: form.is_active ? 1 : 0,
  };
}

function subscriptionPayload(form: SubscriptionForm) {
  return {
    user_id: Number(form.user_id),
    plan: form.plan,
    status: form.status,
    start_date: form.start_date,
    end_date: form.end_date,
  };
}

function teamPayload(form: TeamForm) {
  return {
    name: form.name,
    role: form.role,
    bio: form.bio || null,
    initials: form.initials || null,
    gradient_from: form.gradient_from,
    gradient_to: form.gradient_to,
    linkedin_url: form.linkedin_url || null,
    github_url: form.github_url || null,
    email: form.email || null,
    display_order: Number(form.display_order || 0),
    is_active: form.is_active ? 1 : 0,
  };
}

function resetForm<T>(setForm: Dispatch<SetStateAction<T>>, setEditingId: Dispatch<SetStateAction<number | null>>, initialState: T) {
  setForm(initialState);
  setEditingId(null);
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
}

function toDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

function validateUserForm(form: UserForm, isEditing: boolean): FormErrors<keyof UserForm & string> {
  const errors: FormErrors<keyof UserForm & string> = {}

  if (!hasMinLength(form.first_name, 2)) errors.first_name = "Le prenom est obligatoire"
  if (!hasMinLength(form.last_name, 2)) errors.last_name = "Le nom est obligatoire"
  if (!isValidEmail(form.email)) errors.email = "Saisissez une adresse e-mail valide"
  if ((!isEditing && !hasMinLength(form.password, 8)) || (isEditing && !isBlank(form.password) && !hasMinLength(form.password, 8))) errors.password = "Le mot de passe doit contenir au moins 8 caracteres"
  if (isBlank(form.role)) errors.role = "Le role est obligatoire"
  if (form.role === "student" && isBlank(form.grade_code)) errors.grade_code = "La classe est obligatoire"
  if (form.role === "student" && needsSection(form.grade_code) && isBlank(form.section_code)) errors.section_code = "La section est obligatoire"

  return errors
}

function validateAdminEventForm(form: EventForm): FormErrors<keyof EventForm & string> {
  const errors: FormErrors<keyof EventForm & string> = {}
  if (!hasMinLength(form.title, 4)) errors.title = "Le titre doit contenir au moins 4 caracteres"
  if (isBlank(form.category)) errors.category = "La categorie est obligatoire"
  if (!isValidUrl(form.access_url)) errors.access_url = form.delivery_type === "video" ? "L'URL de la video est invalide" : "Le lien Google Meet est invalide"
  if (form.delivery_type === "google_meet" ? !isFutureDateTime(form.event_date) : !isValidDateInput(form.event_date)) errors.event_date = form.delivery_type === "google_meet" ? "Choisissez une date et une heure futures" : "Choisissez une date et une heure valides"
  if (form.delivery_type === "google_meet" && !isPositiveInteger(form.seats_total, 1)) errors.seats_total = "Le nombre de places doit etre au moins egal a 1"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

function validateProductForm(form: ProductForm): FormErrors<keyof ProductForm & string> {
  const errors: FormErrors<keyof ProductForm & string> = {}
  if (!hasMinLength(form.name, 3)) errors.name = "Le nom doit contenir au moins 3 caracteres"
  if (!isBlank(form.category) && !hasMinLength(form.category, 2)) errors.category = "La categorie est trop courte"
  if (!isNonNegativeNumber(form.price)) errors.price = "Le prix doit etre superieur ou egal a 0"
  if (!isNonNegativeInteger(form.stock)) errors.stock = "Le stock doit etre superieur ou egal a 0"
  if (!isBlank(form.image_url) && !isValidUrl(form.image_url)) errors.image_url = "L'URL de l'image est invalide"
  if (!isBlank(form.description) && !hasMinLength(form.description, 10)) errors.description = "La description doit contenir au moins 10 caracteres si elle est renseignee"
  return errors
}

function validatePromoForm(form: PromoForm): FormErrors<keyof PromoForm & string> {
  const errors: FormErrors<keyof PromoForm & string> = {}
  const discount = Number(form.discount_percent)

  if (!hasMinLength(form.code, 3)) errors.code = "Le code promo doit contenir au moins 3 caracteres"
  if (!Number.isFinite(discount) || discount < 1 || discount > 100) errors.discount_percent = "La reduction doit etre comprise entre 1 et 100"
  if (!isBlank(form.max_uses) && !isPositiveInteger(form.max_uses, 1)) errors.max_uses = "Le nombre max d'utilisations doit etre au moins egal a 1"
  if (!isBlank(form.expires_at) && !isValidDateInput(form.expires_at)) errors.expires_at = "Choisissez une date d'expiration valide"
  return errors
}

function validateSubscriptionForm(form: SubscriptionForm): FormErrors<keyof SubscriptionForm & string> {
  const errors: FormErrors<keyof SubscriptionForm & string> = {}

  if (isBlank(form.user_id)) errors.user_id = "Selectionnez un utilisateur"
  if (isBlank(form.plan)) errors.plan = "Le forfait est obligatoire"
  if (isBlank(form.status)) errors.status = "Le statut est obligatoire"
  if (!isValidDateInput(form.start_date)) errors.start_date = "Choisissez une date de debut valide"
  if (!isValidDateInput(form.end_date)) errors.end_date = "Choisissez une date de fin valide"
  if (!errors.start_date && !errors.end_date && new Date(form.end_date) < new Date(form.start_date)) errors.end_date = "La date de fin doit etre posterieure a la date de debut"

  return errors
}

function validateTeamForm(form: TeamForm): FormErrors<keyof TeamForm & string> {
  const errors: FormErrors<keyof TeamForm & string> = {}

  if (!hasMinLength(form.name, 2)) errors.name = "Le nom est obligatoire"
  if (!hasMinLength(form.role, 2)) errors.role = "Le role est obligatoire"
  if (!isBlank(form.initials) && form.initials.trim().length > 4) errors.initials = "Les initiales doivent rester courtes"
  if (!isBlank(form.email) && !isValidEmail(form.email)) errors.email = "Saisissez une adresse e-mail valide"
  if (!isBlank(form.linkedin_url) && !isValidUrl(form.linkedin_url)) errors.linkedin_url = "L'URL LinkedIn est invalide"
  if (!isBlank(form.github_url) && !isValidUrl(form.github_url)) errors.github_url = "L'URL GitHub est invalide"
  if (!isNonNegativeInteger(form.display_order)) errors.display_order = "L'ordre d'affichage doit etre superieur ou egal a 0"
  if (isBlank(form.gradient_from)) errors.gradient_from = "La classe du gradient de debut est obligatoire"
  if (isBlank(form.gradient_to)) errors.gradient_to = "La classe du gradient de fin est obligatoire"
  if (!isBlank(form.bio) && !hasMinLength(form.bio, 10)) errors.bio = "La biographie doit contenir au moins 10 caracteres si elle est renseignee"

  return errors
}

function matchesSearch(searchTerm: string, ...values: Array<string | number | null | undefined>) {
  const query = searchTerm.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(query));
}

function sortItems<T>(items: T[], selector: (item: T) => string | number | null | undefined, direction: "asc" | "desc") {
  return [...items].sort((left, right) => {
    const a = selector(left);
    const b = selector(right);

    if (typeof a === "number" && typeof b === "number") {
      return direction === "asc" ? a - b : b - a;
    }

    const result = String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}