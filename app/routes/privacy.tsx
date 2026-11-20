import { Link } from "react-router";
import { Legal } from "@/components/legal";
import { SITE_DEFAULTS } from "@/lib/site-text";
import { useShell } from "./shell";

export const meta = () => [{ title: "Privacy · Bekasi Board Game Hub" }, { name: "description", content: "What Bekasi Board Game Hub stores about you and who can see it." }];

export default function Privacy() {
  const contact = useShell()?.site.contact ?? SITE_DEFAULTS.contact; // edited in Admin > Site
  return (
    <Legal title="Privacy" updated="20 November 2026">
      <p>Bekasi Board Game Hub is run by volunteers from the Bekasi board game community. This page says what we keep about you, who can see it, and how to remove it.</p>

      <section className="grid gap-2">
        <h2>What we keep</h2>
        <ul>
          <li><strong>Your account:</strong> your email address, and the name, username, district, photo and short bio you choose to fill in. If you sign in with Google we receive your name, email and picture from Google, and nothing else.</li>
          <li><strong>Your card:</strong> the games you list as favorites, wanted, owned, for sale or wanted to buy, with the prices you enter, and the result of the play-style quiz if you take it.</li>
          <li><strong>What you do here:</strong> plays you log or are added to, tables you open or join, posts, comments, likes, places you add, reports you send, and notifications for you.</li>
          <li><strong>BoardGameGeek:</strong> if you enter your BGG username, we read your public collection and plays from BoardGameGeek to fill in your card.</li>
          <li><strong>Your pictures:</strong> before we store a picture, we remove its location, camera details, and comments.</li>
          <li><strong>Your device:</strong> one cookie that keeps you signed in. If you turn on phone notifications, we also keep an address and two keys that your browser gives us for that device. We delete them when you turn notifications off or delete your account. The site shows no ads and uses no tracking pixels or analytics.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Who can see it</h2>
        <ul>
          <li><strong>Anyone with the link:</strong> your player card (name, username, district, bio, photo, game lists, badges), game pages that list members, places, and table pages.</li>
          <li><strong>Signed-in members only:</strong> the feed, plays, search, and the member directory.</li>
          <li><strong>Nobody but you and the admins:</strong> your email address. Other members never see it.</li>
        </ul>
        <p>We show your district, never an address. Only add a place or a photo you are happy for others to see. A picture in a post opens for anyone who has its exact link, even without signing in, so share links with care.</p>
      </section>

      <section className="grid gap-2">
        <h2>Who handles the data</h2>
        <p>We do not sell it or share it for advertising. The site runs on Cloudflare, which stores the data and keeps short technical logs. Game details come from BoardGameGeek. Email sign-in codes are sent from a Gmail account of the community, so Google handles that mail. Phone notices pass through the push service of your browser (Google, Apple, or Mozilla).</p>
      </section>

      <section className="grid gap-2">
        <h2>Your choices</h2>
        <ul>
          <li>Change or remove anything on your card at any time from <Link className="font-semibold underline underline-offset-4" to="/me/edit">Edit your card</Link>.</li>
          <li>Delete your account in <Link className="font-semibold underline underline-offset-4" to="/settings">Settings</Link>. This removes your card, photo, posts, comments, likes and the tables you host, and takes you off plays you were part of. It cannot be undone.</li>
          <li>For anything else: {contact}</li>
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">The hub is for people aged 13 and over. If this page changes in a way that matters, we say so in the community group.</p>
    </Legal>
  );
}
