import { createFileRoute } from "@tanstack/react-router";
import { CommercialOverview } from "./commercial.$module";

export const Route = createFileRoute("/commercial/")({
  component: CommercialOverview,
});
