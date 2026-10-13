import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/server/db";
import { models } from "@/server/agent/client";
import ModelsManager from "@/components/admin/ModelsManager";

export default async function ModelsPage() {
  const admin = await requireAdmin();
  const available = await models(admin.id)
    .then((m) => m.available)
    .catch(() => [] as string[]);

  return (
    <ModelsManager
      initial={{ main: getSetting("default_model"), review: getSetting("review_model") }}
      available={available}
      env={{ main: process.env.DOTS_MODEL ?? null, review: process.env.DOTS_REVIEW_MODEL ?? null }}
      description="Deployment-wide fallbacks. Precedence per dot: its own choice → the user's Settings default → this admin default → env → best available. Clearing a field restores env behavior."
    />
  );
}
