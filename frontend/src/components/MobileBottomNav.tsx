import { Link, useLocation } from "@tanstack/react-router";
import {
  Home, BookOpen, BrainCircuit, LayoutDashboard, UserCircle,
  ShoppingBag, Shield, Briefcase, GraduationCap,
} from "lucide-react";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";

// Shown only on mobile (md:hidden handled by parent)
// Hidden on admin, khlayel (they have their own chrome)

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

function getNavItems(user: User | null, loggedIn: boolean): NavItem[] {
  if (!loggedIn || !user) {
    return [
      { to: "/",             label: "Accueil",   icon: <Home className="h-5 w-5" />, exact: true },
      { to: "/courses",      label: "Cours",     icon: <BookOpen className="h-5 w-5" /> },
      { to: "/khlayel",      label: "Khlayel",   icon: <BrainCircuit className="h-5 w-5" /> },
      { to: "/market",       label: "Boutique",  icon: <ShoppingBag className="h-5 w-5" /> },
      { to: "/login",        label: "Connexion", icon: <UserCircle className="h-5 w-5" /> },
    ];
  }

  if (user.role === "admin") {
    return [
      { to: "/",       label: "Accueil",    icon: <Home className="h-5 w-5" />, exact: true },
      { to: "/admin",  label: "Admin",      icon: <Shield className="h-5 w-5" /> },
      { to: "/khlayel",label: "Khlayel",   icon: <BrainCircuit className="h-5 w-5" /> },
      { to: "/market", label: "Boutique",   icon: <ShoppingBag className="h-5 w-5" /> },
      { to: "/profile",label: "Profil",     icon: <UserCircle className="h-5 w-5" /> },
    ];
  }

  if (user.role === "teacher") {
    return [
      { to: "/",        label: "Accueil",  icon: <Home className="h-5 w-5" />, exact: true },
      { to: "/teacher", label: "Espace",   icon: <GraduationCap className="h-5 w-5" /> },
      { to: "/khlayel", label: "Khlayel",  icon: <BrainCircuit className="h-5 w-5" /> },
      { to: "/market",  label: "Boutique", icon: <ShoppingBag className="h-5 w-5" /> },
      { to: "/profile", label: "Profil",   icon: <UserCircle className="h-5 w-5" /> },
    ];
  }

  if (user.role === "commercial") {
    return [
      { to: "/",           label: "Accueil",    icon: <Home className="h-5 w-5" />, exact: true },
      { to: "/commercial", label: "Commercial", icon: <Briefcase className="h-5 w-5" /> },
      { to: "/khlayel",    label: "Khlayel",    icon: <BrainCircuit className="h-5 w-5" /> },
      { to: "/market",     label: "Boutique",   icon: <ShoppingBag className="h-5 w-5" /> },
      { to: "/profile",    label: "Profil",     icon: <UserCircle className="h-5 w-5" /> },
    ];
  }

  // student / parent
  return [
    { to: "/",          label: "Accueil",  icon: <Home className="h-5 w-5" />, exact: true },
    { to: "/courses",   label: "Cours",    icon: <BookOpen className="h-5 w-5" /> },
    { to: "/khlayel",   label: "Khlayel",  icon: <BrainCircuit className="h-5 w-5" /> },
    { to: "/market",    label: "Boutique", icon: <ShoppingBag className="h-5 w-5" /> },
    { to: "/profile",   label: "Profil",   icon: <UserCircle className="h-5 w-5" /> },
  ];
}

export function MobileBottomNav() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    setUser(getStoredUser());
  }, [location.pathname]);

  const navItems = getNavItems(user, loggedIn);

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-bottom-nav-item ${isActive ? "mobile-bottom-nav-active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
