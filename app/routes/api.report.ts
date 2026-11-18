import { getDb } from "@/lib/.server/db";
import { createReport } from "@/lib/.server/moderation";
import { requireMember } from "@/lib/.server/viewer";
import { reportSchema } from "@/lib/validate";
import type { Route } from "./+types/api.report";

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const f = await request.formData();
  const parsed = reportSchema.safeParse({ targetType: f.get("targetType"), targetId: f.get("targetId"), reason: f.get("reason") });
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Check the report" }, { status: 400 });
  const res = await createReport(getDb(), v.user.id, parsed.data);
  return Response.json(res, { status: res.ok ? 200 : 429 });
}
