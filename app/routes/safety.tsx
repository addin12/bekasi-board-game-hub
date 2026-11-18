import { Legal } from "@/components/legal";

export const meta = () => [{ title: "Safety tips · Bekasi Board Game Hub" }, { name: "description", content: "How to meet and trade safely with people from Bekasi Board Game Hub." }];

export default function Safety() {
  return (
    <Legal title="Safety tips">
      <p>Most meetups and trades go fine. A few habits keep it that way.</p>

      <section className="grid gap-2">
        <h2>Buying and selling a game</h2>
        <ul>
          <li>Meet in a public place with other people around, like a cafe or a mall, in daylight if you can.</li>
          <li>Check the game before you pay: count the pieces, look at the cards, compare it with the listing.</li>
          <li>Pay when you hand over the game, not before. Be careful with anyone who asks for money in advance or pushes you to hurry.</li>
          <li>Agree on the price in writing in the chat before you meet.</li>
          <li>Prices you see on a card are what the member typed. Check them against what the game really costs.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Joining a table</h2>
        <ul>
          <li>Tables at a listed place are the safest. Be careful with a table at a private home you don't know.</li>
          <li>Tell a friend where you are going and when.</li>
          <li>The hub only shows districts, never home addresses. Share yours only when you are comfortable.</li>
          <li>You can leave a table at any time, and the host can cancel one.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>If something feels wrong</h2>
        <ul>
          <li>Leave. A game isn't worth it.</li>
          <li>Use the Report button on the post, table, place or play. It goes to the admins, not to the other person.</li>
          <li>For anything urgent, contact the local authorities first.</li>
        </ul>
      </section>
    </Legal>
  );
}
