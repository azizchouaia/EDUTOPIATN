import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/courses")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const user = getStoredUser();
    if (user?.role === "teacher") {
      throw redirect({ to: "/teacher" });
    }
  },
  component: CoursesLayout,
});

function CoursesLayout() {
  return <Outlet />;
}
