import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronRight, Search, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { StudentSubjectsResponse } from "@/lib/types";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Edutopia" },
      { name: "description", content: "Browse the subjects and chapters published for your Tunisian school track." },
      { property: "og:title", content: "Courses — Edutopia" },
    ],
  }),
  component: CoursesIndexPage,
});

function SubjectSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-6 w-36 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptySubjects({ search, onClear }: { search: string; onClear: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-bordeaux/10 mb-5">
        <GraduationCap className="h-9 w-9 text-bordeaux" />
      </span>
      <h3 className="font-display text-xl font-semibold text-foreground">
        {t("courses_empty")}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        {t("courses_empty_sub")}
      </p>
      {search && (
        <Button variant="outline" className="mt-5 border-bordeaux text-bordeaux hover:bg-bordeaux/5" onClick={onClear}>
          ✕
        </Button>
      )}
    </div>
  );
}

function CoursesIndexPage() {
  const [search, setSearch] = useState("");
  const { t, isRTL } = useLanguage();

  const { data, isLoading, error } = useQuery<StudentSubjectsResponse>({
    queryKey: ["course-subjects"],
    queryFn: async () => {
      const res = await api.get<StudentSubjectsResponse>("/courses/subjects/me");
      return res.data;
    },
  });

  const isSubscriptionBlocked = (error as any)?.response?.data?.code === "SUBSCRIPTION_REQUIRED";
  const needsAcademicTrack    = (error as any)?.response?.data?.code === "ACADEMIC_TRACK_REQUIRED";
  const subjects               = data?.subjects ?? [];
  const filteredSubjects        = subjects.filter((subject) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${subject.name} ${subject.description ?? ""}`.toLowerCase().includes(needle);
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className={`container mx-auto px-4 py-20 text-center page-enter ${isRTL ? "text-right" : ""}`}>
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">{t("nav_courses")}</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mt-3">{t("courses_title")}</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="max-w-xl mx-auto text-primary-foreground/80 leading-relaxed">
            {t("courses_subtitle")}
          </p>
          {data?.track?.title && (
            <div className="mt-6 flex justify-center">
              <Badge className="border-white/20 bg-white/10 px-4 py-1 text-sm text-primary-foreground">
                {data.track.title}
              </Badge>
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {isSubscriptionBlocked ? (
          <SubscriptionGate
            resourceKey="courses"
            title="Courses unlock after subscription activation"
            description="The courses API now blocks access until the student has an active subscription. Subscribe first, then enter your activation code here to remove the blur and access the full catalog."
          />
        ) : needsAcademicTrack ? (
          <div className={`mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm ${isRTL ? "text-right" : ""}`}>
            <Badge className="bg-gold/15 text-bordeaux border border-gold/40">{t("courses_no_track")}</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-foreground">{t("courses_no_track")}</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              {t("courses_no_track_sub")}
            </p>
            <div className="mt-6">
              <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                <Link to="/profile">{t("courses_update")}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="mb-8 max-w-lg">
              <div className="relative">
                <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none`} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("courses_search")}
                  className={`${isRTL ? "pr-10 text-right" : "pl-10"} h-11 border-border focus:border-gold transition-colors`}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <SubjectSkeleton key={i} />)}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <EmptySubjects search={search} onClear={() => setSearch("")} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((subject) => (
                  <Link
                    key={subject.track_subject_id}
                    to="/courses/$subjectSlug"
                    params={{ subjectSlug: subject.slug }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elegant hover:border-gold/40"
                  >
                    {/* Subject cover */}
                    <div
                      className="relative aspect-[16/10] overflow-hidden"
                      style={{ background: subject.color ? `linear-gradient(135deg, ${subject.color}33, #7d1022)` : undefined }}
                    >
                      <div className="absolute inset-0 grid place-items-center bg-gradient-bordeaux/85 transition-opacity group-hover:bg-gradient-bordeaux/75">
                        <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/40 bg-white/10 font-display text-3xl font-bold text-gold transition-transform group-hover:scale-110">
                          {subject.icon ?? subject.name.charAt(0)}
                        </span>
                      </div>
                      <Badge className="absolute top-3 left-3 bg-gold text-gold-foreground hover:bg-gold border-0 text-xs">
                        {subject.chapter_count} {t("courses_chapters")}
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className={`p-5 ${isRTL ? "text-right" : ""}`}>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t("nav_courses")}</p>
                      <h3 className="font-display text-xl font-semibold mt-1.5 text-foreground group-hover:text-bordeaux transition-colors">
                        {subject.name}
                      </h3>
                      {subject.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {subject.description}
                        </p>
                      )}
                      <div className={`flex items-center gap-4 mt-4 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <BookOpen className="h-3.5 w-3.5" />
                          {subject.chapter_count} {t("courses_chapters")}
                        </span>
                        <span>{subject.resource_count} {t("courses_resources")}</span>
                      </div>
                      <div className={`flex items-center justify-between mt-5 pt-4 border-t border-border text-sm font-semibold text-bordeaux ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span>{t("nav_courses")}</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isRTL ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1"}`} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
