import { createFileRoute } from "@tanstack/react-router";
import { AutoGlassQuoteWizard } from "@/features/quote/AutoGlassQuoteWizard";

const title = "Auto Glass Quote — Riverbend Autoglass Inc.";
const description =
  "Get a free windshield, side glass, sunroof or mirror quote in about two minutes. SGI-accredited, mobile service across Saskatchewan.";

export const Route = createFileRoute("/get-quote")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AutoGlassQuoteWizard />,
});
