/**
 * A private, two-person quest deck. A world's ID changes the daily prompts,
 * so separate couples do not get identical adventures every day.
 * Keep this module deterministic and free of browser/server dependencies.
 */
export type CoupleQuest = {
  key: string;
  title: string;
  prompt: string;
  category: 'discover' | 'dream' | 'care';
  icon: string;
};

const DECK: readonly CoupleQuest[] = [
  { key: 'hidden-place', title: 'A secret place', prompt: 'Where should we travel together, real or imaginary, and what would we do first?', category: 'discover', icon: '🗺️' },
  { key: 'first-spark', title: 'The first spark', prompt: 'What small moment made you smile when we first met?', category: 'discover', icon: '✨' },
  { key: 'little-details', title: 'The little things', prompt: 'What detail about us would you put in a tiny museum?', category: 'discover', icon: '🔎' },
  { key: 'soundtrack', title: 'Our soundtrack', prompt: 'Which song or sound belongs in our world, and why?', category: 'discover', icon: '🎶' },
  { key: 'dream-home', title: 'Home among clouds', prompt: 'What is one unusual room or garden our future home should have?', category: 'dream', icon: '🏡' },
  { key: 'future-postcard', title: 'Postcard from tomorrow', prompt: 'Send a postcard from a day you hope we will share in the future.', category: 'dream', icon: '💌' },
  { key: 'our-mascot', title: 'A magical companion', prompt: 'What pet or imaginary creature should explore Narinyland with us?', category: 'dream', icon: '🐾' },
  { key: 'festival', title: 'Our own festival', prompt: 'If our world had a celebration named after us, what would happen there?', category: 'dream', icon: '🎐' },
  { key: 'kindness', title: 'A tiny kindness', prompt: 'What is one small thing we can do for each other this week?', category: 'care', icon: '🌷' },
  { key: 'good-memory', title: 'A memory lantern', prompt: 'Which ordinary day together would you love to experience again?', category: 'care', icon: '🏮' },
  { key: 'quiet-joy', title: 'Quiet joy', prompt: 'What is your favorite simple thing we do when nothing special is planned?', category: 'care', icon: '☕' },
  { key: 'thank-you', title: 'A thank-you note', prompt: 'What is something you appreciate about your partner that you do not say often?', category: 'care', icon: '💗' },
];

const CATEGORIES: CoupleQuest['category'][] = ['discover', 'dream', 'care'];

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** UTC ensures that both members see the same day regardless of device clocks. */
export function coupleDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailyCoupleQuests(configId: string, dayKey: string): CoupleQuest[] {
  return CATEGORIES.map((category) => {
    const options = DECK.filter((quest) => quest.category === category);
    return options[stableHash(configId + ':' + dayKey + ':' + category) % options.length];
  });
}

export type QuestEntry = {
  dayKey: string;
  questKey: string;
  partnerId: string;
  answer: string;
};

export type QuestView = CoupleQuest & {
  mineDone: boolean;
  partnerDone: boolean;
  revealed: boolean;
  answers: Array<{ name: string; answer: string }>;
};

export function coupleQuestChapter(completedMoments: number): { title: string; description: string; nextAt: number | null } {
  if (completedMoments >= 14) return { title: 'Our Constellation', description: 'Every shared moment adds another star to your sky.', nextAt: null };
  if (completedMoments >= 5) return { title: 'Starlit Home', description: 'Your memories are lighting up the night.', nextAt: 14 };
  if (completedMoments >= 1) return { title: 'Blossom Path', description: 'Your first shared story is already growing.', nextAt: 5 };
  return { title: 'First Light', description: 'Two adventurers, one world waiting to come alive.', nextAt: 1 };
}

/**
 * Answers are private until both members independently contribute.
 * Completed pairs become permanent story lanterns; no streak punishment.
 */
export function buildCoupleQuestView(
  configId: string,
  dayKey: string,
  members: Array<{ id: string; name: string }>,
  meId: string,
  entries: QuestEntry[],
) {
  if (members.length < 1 || members.length > 2 || !members.some((m) => m.id === meId)) {
    throw new Error('Couple quests require one or two verified members');
  }
  const memberIds = new Set(members.map((member) => member.id));
  const validEntries = entries.filter((entry) => memberIds.has(entry.partnerId));
  const group = new Map<string, Set<string>>();
  for (const entry of validEntries) {
    const key = entry.dayKey + ':' + entry.questKey;
    if (!group.has(key)) group.set(key, new Set());
    group.get(key)!.add(entry.partnerId);
  }
  const completedMoments = members.length === 2
    ? [...group.values()].filter((ids) => ids.size === 2).length
    : 0;
  const quests: QuestView[] = dailyCoupleQuests(configId, dayKey).map((quest) => {
    const answers = validEntries.filter((entry) => entry.dayKey === dayKey && entry.questKey === quest.key);
    const mineDone = answers.some((entry) => entry.partnerId === meId);
    const partnerDone = answers.some((entry) => entry.partnerId !== meId);
    const revealed = members.length === 2 && mineDone && partnerDone;
    return {
      ...quest, mineDone, partnerDone, revealed,
      answers: revealed ? members.map((member) => ({
        name: member.name || 'Partner',
        answer: answers.find((entry) => entry.partnerId === member.id)!.answer,
      })) : [],
    };
  });
  return { dayKey, partnerCount: members.length, completedMoments, chapter: coupleQuestChapter(completedMoments), quests };
}
