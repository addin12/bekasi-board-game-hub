import { eq } from "drizzle-orm";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Button } from "@/components/ui/button";
import { profile } from "@/db/schema";
import { isStyle, QUESTIONS, scoreQuiz, STYLES } from "@/lib/play-style";
import { getDb } from "@/lib/.server/db";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/me.style";

export const meta = () => [{ title: "Play style quiz · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const saved = new URL(request.url).searchParams.get("saved") === "1";
  return { style: isStyle(v.profile.playStyle) ? v.profile.playStyle : null, handle: v.profile.handle, saved };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const form = await request.formData();
  // The browser sends the index of each picked answer. Anything that is not a full, valid set is refused.
  const style = scoreQuiz(QUESTIONS.map((_, i) => Number(form.get(`q${i}`) ?? NaN)));
  if (!style) return { ok: false as const, message: "Answer every question" };
  await getDb().update(profile).set({ playStyle: style, updatedAt: new Date() }).where(eq(profile.userId, v.user.id));
  return redirect("/me/style?saved=1");
}

export default function PlayStyleQuiz({ loaderData, actionData }: Route.ComponentProps) {
  const { style, handle, saved } = loaderData;
  const busy = useNavigation().state === "submitting";
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Play style quiz</h1>

      {style && (
        <section aria-label="Your play style" className="panel grid gap-2 p-5">
          <p className="text-sm font-bold uppercase text-muted-foreground">{saved ? "Saved. Your play style is" : "Your play style"}</p>
          <p className="text-2xl font-extrabold">{STYLES[style].name}</p>
          <p>{STYLES[style].line}</p>
          <p className="text-muted-foreground">It shows on your card. Find ranks members with the same style higher.</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild><Link to={`/p/${handle}`}>View my card</Link></Button>
            <Button asChild variant="outline"><Link to="/find">Find players</Link></Button>
          </div>
        </section>
      )}

      <p className="text-muted-foreground">{style ? "Take the quiz again to change it." : "Six questions, one minute. Pick the answer that sounds most like you."}</p>

      <Form method="post" className="grid gap-4">
        {QUESTIONS.map((q, i) => (
          <div key={q.id} role="radiogroup" aria-labelledby={`${q.id}-label`} className="panel grid gap-1 p-5">
            <p id={`${q.id}-label`} className="pb-2 text-lg font-extrabold">{i + 1}. {q.text}</p>
            {q.answers.map((a, j) => (
              <label key={a.label} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted">
                <input type="radio" name={`q${i}`} value={j} required className="size-5 shrink-0 accent-ink" />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
        ))}
        {actionData && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save my play style"}</Button>
        </div>
      </Form>
    </div>
  );
}
