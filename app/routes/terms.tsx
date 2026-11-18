import { Link } from "react-router";
import { Legal } from "@/components/legal";
import { SITE_DEFAULTS } from "@/lib/site-text";
import { useShell } from "./shell";

export const meta = () => [{ title: "Terms · Bekasi Board Game Hub" }, { name: "description", content: "The rules for using Bekasi Board Game Hub." }];

export default function Terms() {
  const contact = useShell()?.site.contact ?? SITE_DEFAULTS.contact; // edited in Admin > Site
  return (
    <Legal title="Terms" updated="18 November 2026">
      <p>By using Bekasi Board Game Hub you agree to these rules. They are short on purpose.</p>

      <section className="grid gap-2">
        <h2>Be a good neighbor</h2>
        <ul>
          <li>Be respectful. No harassment, hate or threats.</li>
          <li>One account per person, with your real name or the name your friends know you by.</li>
          <li>Only post what is true: real plays, real tables, real games for sale.</li>
          <li>Don't post other people's private details, or pictures of people without their say-so.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Trading games</h2>
        <p>The hub helps members find each other. It is not a shop and not a party to any deal. We don't hold money, check the games, or guarantee anyone. You agree the price and the handover with the other person, outside the site. Read the <Link className="font-semibold underline underline-offset-4" to="/safety">safety tips</Link> before you meet.</p>
        <p>The verified badge means someone entered the community passcode. It does not mean a deal is safe.</p>
      </section>

      <section className="grid gap-2">
        <h2>What you post</h2>
        <p>You keep what you write and the pictures you upload. You let the hub show them to its members, and publicly where this site says so (cards, game pages, tables and places). Post only what you have the right to share.</p>
      </section>

      <section className="grid gap-2">
        <h2>Admins</h2>
        <p>Admins can remove posts, tables, places and accounts that break these rules or that members report. Use the Report button when something is wrong; reports go to the admins, not to the person you report.</p>
      </section>

      <section className="grid gap-2">
        <h2>No promises</h2>
        <p>The hub is run by volunteers and offered as it is. It can go down or change. We are not responsible for what members do, for games bought or sold, or for what happens at a meetup.</p>
      </section>

      <p className="text-sm text-muted-foreground">See also the <Link className="font-semibold underline underline-offset-4" to="/privacy">privacy page</Link>. Questions: {contact}</p>
    </Legal>
  );
}
