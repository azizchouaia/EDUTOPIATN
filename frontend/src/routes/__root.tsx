import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LanguageProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center bg-background px-4">
        <div className="max-w-md text-center py-24">
          <h1 className="font-display text-8xl font-bold text-bordeaux">404</h1>
          <div className="gold-divider mx-auto my-6" />
          <h2 className="font-display text-2xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-gradient-bordeaux px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition-opacity hover:opacity-90"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Edutopia — Plateforme e-Éducation Premium" },
      { name: "description", content: "Edutopia : cours en ligne soignés, leçons vidéo & PDF, tests avec corrections, support, et une boutique sélectionnée." },
      { name: "author", content: "Edutopia" },
      { property: "og:title", content: "Edutopia — Plateforme e-Éducation Premium" },
      { property: "og:description", content: "Cours en ligne soignés, tests, boutique et abonnements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-64.png", type: "image/png", sizes: "64x64" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});


function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  // Khlayel is a full-height chat — a footer below it just creates dead scroll space
  const isKhlayelRoute = location.pathname.startsWith("/khlayel");

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className={isAdminRoute ? "flex-1 bg-background bg-[radial-gradient(circle_at_top_left,_rgba(125,16,34,0.07),_transparent_30%)]" : "flex-1"}>
              <div key={location.pathname} className="page-enter">
                <Outlet />
              </div>
            </main>
            {!isAdminRoute && !isKhlayelRoute && <SiteFooter />}
          </div>
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}
