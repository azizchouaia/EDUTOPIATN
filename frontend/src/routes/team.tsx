import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Github, Linkedin, Mail } from "lucide-react";
import api from "@/lib/api";
import type { TeamMember } from "@/lib/types";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Our Team — Edutopia" },
      { name: "description", content: "Découvrez l'équipe derrière Edutopia — designers, développeurs et éducateurs créant une expérience d'apprentissage premium." },
      { property: "og:title", content: "Our Team — Edutopia" },
      { property: "og:description", content: "Découvrez les personnes derrière Edutopia." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data: team = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => (await api.get<TeamMember[]>("/team")).data,
  });

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-gold font-semibold">Notre équipe</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold mt-3">L'Équipe Edutopia</h1>
          <div className="gold-divider mx-auto my-6" />
          <p className="max-w-2xl mx-auto text-primary-foreground/80">
            Une équipe passionnée de designers, développeurs et éducateurs —
            unis par une conviction : l'apprentissage doit être beau.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Chargement de l'équipe...</div>
        ) : null}

        {!isLoading && team.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <h2 className="font-display text-3xl text-foreground">L'équipe arrive bientôt</h2>
            <p className="mt-3 text-muted-foreground">
              Le module équipe est actif côté admin. Ajoutez des membres depuis l'interface admin et ils apparaîtront ici automatiquement.
            </p>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((m) => (
            <article
              key={m.id}
              className="group rounded-2xl border border-border bg-card p-8 text-center transition-all hover:-translate-y-1 hover:shadow-elegant hover:border-gold/40"
            >
              <div className={`mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br ${m.gradient_from} ${m.gradient_to} shadow-elegant ring-4 ring-gold/20 transition-all group-hover:ring-gold/50`}>
                <span className="font-display text-3xl font-bold text-gold">{m.initials ?? m.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <h3 className="font-display text-xl font-semibold mt-5 text-foreground">{m.name}</h3>
              <div className="gold-divider mx-auto my-3" />
              <p className="text-sm text-bordeaux font-medium">{m.role}</p>
              {m.bio ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{m.bio}</p> : null}
              <div className="flex justify-center gap-3 mt-5">
                {m.linkedin_url ? (
                  <a
                    href={m.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:border-transparent hover:bg-gradient-bordeaux hover:text-gold"
                    aria-label={`${m.name} LinkedIn`}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                ) : null}
                {m.github_url ? (
                  <a
                    href={m.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:border-transparent hover:bg-gradient-bordeaux hover:text-gold"
                    aria-label={`${m.name} GitHub`}
                  >
                    <Github className="h-4 w-4" />
                  </a>
                ) : null}
                {m.email ? (
                  <a
                    href={`mailto:${m.email}`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:border-transparent hover:bg-gradient-bordeaux hover:text-gold"
                    aria-label={`${m.name} email`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
