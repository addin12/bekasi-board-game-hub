/**
 * The play-style quiz: 6 questions, 5 styles. Pure data and one scoring function, so the server and the browser share it.
 * Every answer votes for exactly one style. The style with the most votes wins. A tie goes to the style that was voted for first.
 */
export const STYLE_CODES = ["strategist", "socializer", "teamplayer", "storyteller", "competitor"] as const;
export type StyleCode = (typeof STYLE_CODES)[number];

export const STYLES: Record<StyleCode, { name: string; line: string }> = {
  strategist: { name: "Strategist", line: "You plan ahead and enjoy a puzzle with a long payoff" },
  socializer: { name: "Socializer", line: "You play for the table: the talk, the bluffs, the laughs" },
  teamplayer: { name: "Team player", line: "You like to win together and rescue each other" },
  storyteller: { name: "Storyteller", line: "You play for the world, the theme and the moments people retell" },
  competitor: { name: "Competitor", line: "You like a duel, a race and a clear winner" },
};

export const isStyle = (v: unknown): v is StyleCode => typeof v === "string" && (STYLE_CODES as readonly string[]).includes(v);

export type Question = { id: string; text: string; answers: { label: string; style: StyleCode }[] };

export const QUESTIONS: Question[] = [
  {
    id: "table",
    text: "It's game night. Which table do you walk to?",
    answers: [
      { label: "The one with a big box and a thick rulebook", style: "strategist" },
      { label: "The one that is already laughing", style: "socializer" },
      { label: "The one setting up a cooperative game", style: "teamplayer" },
      { label: "The one with the game that has a story", style: "storyteller" },
      { label: "The one starting a head-to-head duel", style: "competitor" },
    ],
  },
  {
    id: "length",
    text: "How long should a good game take?",
    answers: [
      { label: "Two hours is fine if every choice matters", style: "strategist" },
      { label: "Under 30 minutes, then another one", style: "socializer" },
      { label: "Until we win together", style: "teamplayer" },
      { label: "As long as the story needs", style: "storyteller" },
      { label: "About an hour, with a clear winner", style: "competitor" },
    ],
  },
  {
    id: "happy",
    text: "What makes you happiest in a game?",
    answers: [
      { label: "Finding the perfect move", style: "strategist" },
      { label: "Making the table laugh", style: "socializer" },
      { label: "Beating the game together", style: "teamplayer" },
      { label: "A moment people retell later", style: "storyteller" },
      { label: "Beating the best player at the table", style: "competitor" },
    ],
  },
  {
    id: "newbie",
    text: "A new player joins. What do you do?",
    answers: [
      { label: "Give a short plan for their first turns", style: "strategist" },
      { label: "Pick an easy game so everyone can talk", style: "socializer" },
      { label: "Pair them with a teammate", style: "teamplayer" },
      { label: "Explain the theme first", style: "storyteller" },
      { label: "Say good luck and play to win", style: "competitor" },
    ],
  },
  {
    id: "words",
    text: "Which words match your favorite game?",
    answers: [
      { label: "Engine, optimize, combo", style: "strategist" },
      { label: "Bluff, negotiate, shout", style: "socializer" },
      { label: "Rescue, survive, together", style: "teamplayer" },
      { label: "Explore, discover, character", style: "storyteller" },
      { label: "Duel, race, take that", style: "competitor" },
    ],
  },
  {
    id: "loss",
    text: "You lost. What do you do next?",
    answers: [
      { label: "Replay my choices in my head", style: "strategist" },
      { label: "Laugh and ask for the next game", style: "socializer" },
      { label: "Ask the team what we can change", style: "teamplayer" },
      { label: "Ask to read the cards we missed", style: "storyteller" },
      { label: "Ask for a rematch right now", style: "competitor" },
    ],
  },
];

/**
 * `picks` holds one answer index for each question, in order. Returns null when the input is not a full, valid set of picks:
 * the server must not trust the browser.
 */
export function scoreQuiz(picks: unknown): StyleCode | null {
  if (!Array.isArray(picks) || picks.length !== QUESTIONS.length) return null;
  const votes = new Map<StyleCode, { count: number; first: number }>();
  for (let i = 0; i < QUESTIONS.length; i++) {
    const pick = picks[i];
    const answer = Number.isInteger(pick) ? QUESTIONS[i].answers[pick as number] : undefined;
    if (!answer) return null;
    const v = votes.get(answer.style) ?? { count: 0, first: i };
    votes.set(answer.style, { count: v.count + 1, first: v.first });
  }
  return [...votes.entries()].sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)[0][0];
}
