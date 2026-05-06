import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/courses/$subjectSlug")({
  component: SubjectLayout,
})

function SubjectLayout() {
  return <Outlet />
}