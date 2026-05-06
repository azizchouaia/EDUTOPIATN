import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronRight, Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import type { StudentSubjectsResponse } from "@/lib/types";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Edutopia" },
      { name: "description", content: "Browse the subjects and chapters published for your Tunisian school track." },
      { property: "og:title", content: "Courses — Edutopia" },
      { property: "og:description", content: "Browse the subjects and chapters published for your class and section." },
    ],
  }),
  component: CoursesIndexPage,
});

function CoursesIndexPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery<StudentSubjectsResponse>({
    queryKey: ["course-subjects"],
    queryFn: async () => {
      const res = await api.get<StudentSubjectsResponse>("/courses/subjects/me");
      return res.data;
    },
  });

  const isSubscriptionBlocked = (error as any)?.response?.data?.code === "SUBSCRIPTION_REQUIRED";
  const needsAcademicTrack = (error as any)?.response?.data?.code === "ACADEMIC_TRACK_REQUIRED";
  const subjects = data?.subjects ?? [];
  const filteredSubjects = subjects.filter((subject) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${subject.name} ${subject.description ?? ""}`.toLowerCase().includes(needle);
  });

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">School curriculum</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mt-3">Your Subjects</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="max-w-xl mx-auto text-primary-foreground/80">
            Enter the subjects published for your class, then open chapters and resources built for your Tunisian track.
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
          <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
            <Badge className="bg-gold/15 text-bordeaux border border-gold/40">Profile incomplete</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-foreground">Choose your class before opening courses</h2>
            <p className="mt-3 text-muted-foreground">
              We need your class and, when required, your section to show only the matieres that match your track.
            </p>
            <div className="mt-6">
              <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90">
                <Link to="/profile">Complete my profile</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search matieres..."
                  className="pl-10 h-11 border-border"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-bordeaux" />
              </div>
            ) : filteredSubjects.length === 0 ? (
              <p className="text-center py-20 text-muted-foreground">No subjects found for this class yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((subject) => (
                  <Link
                    key={subject.track_subject_id}
                    to="/courses/$subjectSlug"
                    params={{ subjectSlug: subject.slug }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-gold/40"
                  >
                    <div
                      className="relative aspect-[16/10] overflow-hidden"
                      style={{ background: subject.color ? `linear-gradient(135deg, ${subject.color}22, #7d1022)` : undefined }}
                    >
                      <div className="absolute inset-0 grid place-items-center bg-gradient-bordeaux/80">
                        <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/40 bg-white/10 font-display text-3xl font-bold text-gold">
                          {subject.name.charAt(0)}
                        </span>
                      </div>
                      <Badge className="absolute top-3 left-3 bg-gold text-gold-foreground hover:bg-gold border-0">
                        {subject.chapter_count} chapitres
                      </Badge>
                    </div>
                    <div className="p-5">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Matiere</p>
                      <h3 className="font-display text-xl font-semibold mt-2 text-foreground group-hover:text-bordeaux transition-colors">
                        {subject.name}
                      </h3>
                      {subject.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{subject.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {subject.chapter_count} chapters</span>
                        <span>{subject.resource_count} resources</span>
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-5 border-t border-border text-sm font-medium text-bordeaux">
                        <span>Open subject</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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