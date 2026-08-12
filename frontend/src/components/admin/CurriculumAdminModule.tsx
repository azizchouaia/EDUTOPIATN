import { useQuery } from "@tanstack/react-query"
import { BookMarked, BookOpen, FileText, Layers, Link2, Loader2, UserCheck } from "lucide-react"
import { useState } from "react"
import api from "@/lib/api"
import { AdminPageIntro } from "@/routes/admin"
import { AdminCurriculumResponse } from "./curriculum/shared"
import { AcademicTracksSection } from "./curriculum/AcademicTracksSection"
import { SubjectsSection } from "./curriculum/SubjectsSection"
import { TrackAssignmentsSection } from "./curriculum/TrackAssignmentsSection"
import { ChaptersSection } from "./curriculum/ChaptersSection"
import { ResourcesSection } from "./curriculum/ResourcesSection"
import { TeacherAssignmentsSection } from "./curriculum/TeacherAssignmentsSection"

const TABS = [
  { id: "tracks",    label: "Filières",              icon: BookOpen  },
  { id: "subjects",  label: "Matières",              icon: Layers    },
  { id: "assign",    label: "Affectations",          icon: Link2     },
  { id: "chapters",  label: "Chapitres",             icon: BookMarked },
  { id: "resources", label: "Ressources",            icon: FileText  },
  { id: "teachers",  label: "Enseignants",           icon: UserCheck },
] as const

type TabId = typeof TABS[number]["id"]

export function CurriculumAdminModule() {
  const [activeTab, setActiveTab] = useState<TabId>("tracks")

  const { data, isLoading } = useQuery<AdminCurriculumResponse>({
    queryKey: ["admin-curriculum"],
    queryFn: async () => (await api.get<AdminCurriculumResponse>("/courses/admin/curriculum")).data,
  })

  const tracks       = data?.tracks       ?? []
  const subjects     = data?.subjects     ?? []
  const trackSubjects = data?.track_subjects ?? []
  const chapters     = data?.chapters     ?? []
  const resources    = data?.resources    ?? []

  return (
    <div className="space-y-6">
      <AdminPageIntro
        eyebrow="Cours"
        title="Gestionnaire de curriculum"
        description="Gérez les matières tunisiennes, affectez-les aux filières, créez des chapitres et attachez des ressources pédagogiques."
      />

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? "border-bordeaux text-bordeaux"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du curriculum...
        </div>
      ) : (
        <>
          {activeTab === "tracks"    && <AcademicTracksSection tracks={tracks} />}
          {activeTab === "subjects"  && <SubjectsSection subjects={subjects} />}
          {activeTab === "assign"    && <TrackAssignmentsSection tracks={tracks} subjects={subjects} trackSubjects={trackSubjects} />}
          {activeTab === "chapters"  && <ChaptersSection tracks={tracks} trackSubjects={trackSubjects} chapters={chapters} />}
          {activeTab === "resources" && <ResourcesSection tracks={tracks} chapters={chapters} resources={resources} />}
          {activeTab === "teachers"  && <TeacherAssignmentsSection />}
        </>
      )}
    </div>
  )
}
