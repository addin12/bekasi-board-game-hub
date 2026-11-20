import { MapPin } from "lucide-react";
import { Form, Link } from "react-router";
import { Field, selectClass } from "@/components/field";
import { MeetTabs } from "@/components/meet-tabs";
import { Button } from "@/components/ui/button";
import { DISTRICT_GROUPS, DISTRICTS } from "@/lib/districts";
import { getDb } from "@/lib/.server/db";
import { listPlaces } from "@/lib/.server/places";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/places";

export const meta = () => {
  const description = "Cafes, shops and community spaces around Bekasi where board gamers meet";
  return [{ title: "Places to play · Bekasi Board Game Hub" }, { name: "description", content: description }, { property: "og:title", content: "Places to play in Bekasi" }, { property: "og:description", content: description }];
};

// Public: places are the part of the hub worth finding through a search engine.
export async function loader({ request }: Route.LoaderArgs) {
  const district = new URL(request.url).searchParams.get("district");
  const v = await getViewer(request);
  const d = district && DISTRICTS.includes(district) ? district : null;
  return { places: await listPlaces(getDb(), d), district: d, member: Boolean(v?.profile) };
}

export default function Places({ loaderData }: Route.ComponentProps) {
  const { places, district, member } = loaderData;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Places to play</h1>
        {member && <Button asChild><Link to="/places/new">Add a place</Link></Button>}
      </div>
      {member && <MeetTabs />}
      <Form method="get" className="max-w-xs">
        <Field id="district" label="District">
          <select id="district" name="district" defaultValue={district ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()} className={selectClass}>
            <option value="">All of Bekasi</option>
            {DISTRICT_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
          </select>
        </Field>
      </Form>
      {places.length === 0 ? (
        <section className="panel grid gap-3 p-6">
          <h2 className="text-lg font-extrabold">{district ? `No places in ${district} yet` : "No places yet"}</h2>
          <p className="text-muted-foreground">Know a cafe or space where people play? Add it so others can find it.</p>
          {member ? <Button asChild variant="outline" className="w-fit"><Link to="/places/new">Add a place</Link></Button> : <Button asChild variant="outline" className="w-fit"><Link to="/sign-in?next=/places/new">Sign in to add one</Link></Button>}
        </section>
      ) : (
        <ul className="panel grid divide-y divide-line">
          {places.map((p) => (
            <li key={p.id}>
              <Link to={`/places/${p.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted">
                <span className="grid gap-0.5">
                  <span className="font-extrabold">{p.name}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="icon" aria-hidden />{p.district}{p.address ? ` · ${p.address}` : ""}</span>
                </span>
                {Number(p.plays) > 0 && <span className="text-sm font-semibold tabular-nums">{p.plays} {Number(p.plays) === 1 ? "play" : "plays"} logged</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
