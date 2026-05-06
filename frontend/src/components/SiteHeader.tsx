import { Link, useLocation } from "@tanstack/react-router";
import { GraduationCap, Menu, X, LogOut, LayoutDashboard, Shield, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { useLogout } from "@/hooks/useAuth";
import type { User } from "@/lib/types";

const nav = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/events", label: "Events" },
  { to: "/market", label: "Market" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/team", label: "Team" },
  { to: "/reclamations", label: "Support" },
] as const;

const teacherNav = [
  { to: "/", label: "Home" },
  { to: "/market", label: "Market" },
  { to: "/team", label: "Team" },
  { to: "/reclamations", label: "Support" },
] as const;

const parentNav = [
  { to: "/", label: "Home" },
  { to: "/market", label: "Market" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/team", label: "Team" },
  { to: "/reclamations", label: "Support" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const logout = useLogout();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const workspaceHref = user?.role === "admin" ? "/admin" : user?.role === "teacher" ? "/teacher" : user?.role === "parent" ? "/parent" : "/dashboard";
  const workspaceLabel = user?.role === "admin" ? "Admin" : user?.role === "teacher" ? "Teacher" : user?.role === "parent" ? "Parent" : (user?.first_name ?? "Dashboard");
  const visibleNav = user?.role === "teacher" ? teacherNav : user?.role === "parent" ? parentNav : nav;

  // Re-read auth state after navigation so the header updates immediately after login/logout.
  useEffect(() => {
    setLoggedIn(isAuthenticated());
    setUser(getStoredUser());
  }, [location.pathname]);

  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-3 group">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-bordeaux text-primary-foreground shadow-elegant">
              <GraduationCap className="h-5 w-5 text-gold" />
            </span>
            <div className="font-display text-2xl font-bold tracking-tight text-bordeaux">
              Edu<span className="text-gradient-gold">topia</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-bordeaux">
              <Shield className="h-3.5 w-3.5" />
              {user?.role ?? "admin"}
            </div>
            {loggedIn && (
              <Button
                variant="outline"
                className="border-bordeaux text-bordeaux hover:bg-bordeaux/5"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-bordeaux text-primary-foreground shadow-elegant">
            <GraduationCap className="h-5 w-5 text-gold" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-bordeaux">
            Edu<span className="text-gradient-gold">topia</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-bordeaux after:scale-x-100" }}
              className="relative px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-bordeaux after:absolute after:bottom-1 after:left-4 after:right-4 after:h-[2px] after:origin-left after:scale-x-0 after:bg-gradient-gold after:transition-transform"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {loggedIn ? (
            <>
              <Button asChild variant="ghost" className="text-bordeaux hover:text-bordeaux hover:bg-bordeaux/5">
                <Link to={workspaceHref}>
                  {user?.role === "admin" ? <Shield className="h-4 w-4 mr-1 inline" /> : <LayoutDashboard className="h-4 w-4 mr-1 inline" />}
                  {workspaceLabel}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-bordeaux hover:text-bordeaux hover:bg-bordeaux/5">
                <Link to="/profile"><UserCircle className="h-4 w-4 mr-1 inline" />Profile</Link>
              </Button>
              <Button
                variant="outline"
                className="border-bordeaux text-bordeaux hover:bg-bordeaux/5"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-bordeaux hover:text-bordeaux hover:bg-bordeaux/5">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant">
                <Link to="/login">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-bordeaux"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-bordeaux/5 hover:text-bordeaux"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {loggedIn ? (
                <>
                  <Button asChild variant="outline" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to={workspaceHref} onClick={() => setOpen(false)}>
                      {workspaceLabel}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
                  </Button>
                  <Button className="flex-1 bg-gradient-bordeaux text-primary-foreground" onClick={() => { setOpen(false); logout(); }}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                  </Button>
                  <Button asChild className="flex-1 bg-gradient-bordeaux text-primary-foreground">
                    <Link to="/login" onClick={() => setOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
