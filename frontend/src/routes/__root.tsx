import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
              Back to home
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
      { title: "Edutopia — Premium e-Education Platform" },
      { name: "description", content: "Edutopia: refined online courses, video & PDF lessons, tests with corrections, support, and a curated marketplace." },
      { name: "author", content: "Edutopia" },
      { property: "og:title", content: "Edutopia — Premium e-Education Platform" },
      { property: "og:description", content: "Refined online courses, tests, marketplace and subscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className={isAdminRoute ? "flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(125,16,34,0.07),_transparent_30%),linear-gradient(180deg,#fffdf9_0%,#f8f3ea_100%)]" : "flex-1"}>
          <Outlet />
        </main>
        {!isAdminRoute && <SiteFooter />}
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
