import { Link, useLocation } from "@tanstack/react-router";
import { GraduationCap, Menu, X, LogOut, LayoutDashboard, Shield, UserCircle, Moon, Sun, BrainCircuit } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { isAuthenticated, getStoredUser } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { useLogout } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { assetUrl } from "@/lib/api";
import type { User } from "@/lib/types";

const navDefs = [
  { to: "/",             key: "nav_home" as const },
  { to: "/courses",      key: "nav_courses" as const },
  { to: "/events",       key: "nav_events" as const },
  { to: "/bac",          key: "nav_bac" as const },
  { to: "/khlayel",      key: "nav_khlayel" as const },
  { to: "/market",       key: "nav_market" as const },
  { to: "/subscriptions",key: "nav_subscriptions" as const },
  { to: "/team",         key: "nav_team" as const },
  { to: "/reclamations", key: "nav_support" as const },
];

const teacherNavDefs = [
  { to: "/",            key: "nav_home" as const },
  { to: "/market",      key: "nav_market" as const },
  { to: "/team",        key: "nav_team" as const },
  { to: "/reclamations",key: "nav_support" as const },
];

const parentNavDefs = [
  { to: "/",             key: "nav_home" as const },
  { to: "/market",       key: "nav_market" as const },
  { to: "/subscriptions",key: "nav_subscriptions" as const },
  { to: "/team",         key: "nav_team" as const },
  { to: "/reclamations", key: "nav_support" as const },
];

function UserAvatar({ user }: { user: User }) {
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
  if (user.avatar_url) {
    return (
      <img
        src={assetUrl(user.avatar_url) ?? undefined}
        alt={`${user.first_name} ${user.last_name}`}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-gold/40"
      />
    );
  }
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-bordeaux text-xs font-bold text-gold ring-2 ring-gold/30">
      {initials || <UserCircle className="h-4 w-4" />}
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logout = useLogout();
  const location = useLocation();
  const { lang, setLang, t, isRTL } = useLanguage();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const workspaceHref  = user?.role === "admin" ? "/admin" : user?.role === "teacher" ? "/teacher" : user?.role === "parent" ? "/parent" : "/dashboard";
  const workspaceLabel = user?.role === "admin" ? "Admin" : user?.role === "teacher" ? t("nav_dashboard") : user?.role === "parent" ? t("nav_dashboard") : (user?.first_name ?? t("nav_dashboard"));
  const visibleNavDefs = user?.role === "teacher" ? teacherNavDefs : user?.role === "parent" ? parentNavDefs : navDefs;

  // Dark mode — read persisted preference (or system) on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    setUser(getStoredUser());
  }, [location.pathname]);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (isAdminRoute) {
    return (
      <header
        className={`sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md transition-shadow duration-300 ${scrolled ? "shadow-elegant" : ""}`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/admin" className="flex items-center gap-3 group">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-bordeaux text-primary-foreground shadow-elegant transition-transform group-hover:scale-105">
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
            {user && <UserAvatar user={user} />}
            {loggedIn && (
              <Button
                variant="outline"
                size="sm"
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
    <header
      ref={menuRef}
      className={`sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all duration-300 ${scrolled ? "shadow-[0_4px_24px_-8px_oklch(0.36_0.13_18_/_0.12)]" : ""}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gradient-bordeaux text-primary-foreground shadow-elegant transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-gold" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-bordeaux">
            Edu<span className="text-gradient-gold">topia</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleNavDefs.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-bordeaux font-semibold after:scale-x-100" }}
              className="relative px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-bordeaux after:absolute after:bottom-1 after:left-4 after:right-4 after:h-[2px] after:origin-left after:scale-x-0 after:bg-gradient-gold after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {loggedIn && <NotificationBell />}
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground/70 transition-all hover:text-bordeaux hover:border-bordeaux/40 hover:bg-bordeaux/5"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="dark-toggle-icon">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
          </button>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:text-bordeaux hover:border-bordeaux/40 transition-all"
            title={lang === "en" ? "Switch to Arabic" : "Switch to English"}
          >
            {lang === "en" ? (
              <><span className="text-base leading-none">🇹🇳</span> عربي</>
            ) : (
              <><span className="text-base leading-none">🇬🇧</span> EN</>
            )}
          </button>

          {loggedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="text-bordeaux hover:text-bordeaux hover:bg-bordeaux/5 gap-2">
                <Link to={workspaceHref}>
                  {user?.role === "admin" ? <Shield className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                  {workspaceLabel}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="p-1.5 text-bordeaux hover:bg-bordeaux/5">
                <Link to="/profile">
                  {user ? <UserAvatar user={user} /> : <UserCircle className="h-5 w-5" />}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-bordeaux/40 text-bordeaux hover:bg-bordeaux/5 hover:border-bordeaux"
                onClick={logout}
              >
                <LogOut className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} /> {t("nav_logout")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-bordeaux hover:text-bordeaux hover:bg-bordeaux/5">
                <Link to="/login" search={{ tab: "signin" }}>{t("nav_signin")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-bordeaux text-primary-foreground hover:opacity-90 shadow-elegant">
                <Link to="/login" search={{ tab: "signup" }}>{t("nav_get_started")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: bell + burger */}
        <div className="md:hidden flex items-center gap-2">
          {loggedIn && <NotificationBell />}
        <button
          className="rounded-md p-2 text-bordeaux transition-colors hover:bg-bordeaux/5"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span
            className="block transition-all duration-300"
            style={{ transform: open ? "rotate(90deg)" : "none" }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
        </div>
      </div>

      {/* Mobile backdrop — dims the page behind the open menu */}
      {open && (
        <div
          className="md:hidden fixed inset-0 top-16 -z-10 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu — slide + fade */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="border-t border-border bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {visibleNavDefs.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: `bg-bordeaux/5 text-bordeaux font-semibold ${isRTL ? "border-r-2 border-gold border-l-0" : "border-l-2 border-gold"}` }}
                className={`rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-bordeaux/5 hover:text-bordeaux transition-colors ${isRTL ? "border-r-2 border-transparent text-right" : "border-l-2 border-transparent"}`}
              >
                {t(item.key)}
              </Link>
            ))}
            {/* Mobile language toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className={`mt-1 flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-foreground/70 hover:bg-bordeaux/5 hover:text-bordeaux transition-colors ${isRTL ? "justify-end" : ""}`}
            >
              {lang === "en" ? (<><span>🇹🇳</span> عربي</>) : (<><span>🇬🇧</span> English</>)}
            </button>
            {/* Mobile dark mode toggle */}
            <button
              onClick={toggleDark}
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-foreground/70 hover:bg-bordeaux/5 hover:text-bordeaux transition-colors ${isRTL ? "justify-end" : ""}`}
            >
              <span className="dark-toggle-icon">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <div className="flex gap-2 pt-3 border-t border-border mt-2">
              {loggedIn ? (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to={workspaceHref} onClick={() => setOpen(false)}>{workspaceLabel}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to="/profile" onClick={() => setOpen(false)}>{t("nav_profile")}</Link>
                  </Button>
                  <Button size="sm" className="flex-1 bg-gradient-bordeaux text-primary-foreground" onClick={() => { setOpen(false); logout(); }}>
                    {t("nav_logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className="flex-1 border-bordeaux text-bordeaux">
                    <Link to="/login" search={{ tab: "signin" }} onClick={() => setOpen(false)}>{t("nav_signin")}</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 bg-gradient-bordeaux text-primary-foreground">
                    <Link to="/login" search={{ tab: "signup" }} onClick={() => setOpen(false)}>{t("nav_get_started")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
