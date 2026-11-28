import type { Platform } from "./platforms";

export interface Faq {
  q: string;
  a: string;
}

interface PlatformSeo {
  /** page H1 */
  h1: string;
  /** <title> */
  title: string;
  description: string;
  /** harmless for Google (ignored), still used by some smaller engines */
  keywords: string[];
  intro: string[];
  faqs: Faq[];
}

export const HOME_SEO = {
  intro: [
    "Random group chats is a free directory of Instagram, Telegram and Discord group invite links. Whether you want a random Instagram GC to chat with new people, a Telegram group for study notes and tech, or a Discord server to game with friends, you can browse by category and join in one tap — no account needed to join.",
    "Every listing is checked by AI before it goes live, groups are ranked by real votes from real people, and a daily link checker removes expired Telegram and Discord invites. Found a dead or full group? Report it and we clean it up.",
  ],
  faqs: [
    {
      q: "What is Random group chats?",
      a: "A free directory where people share and discover Instagram, Telegram and Discord group invite links — casual hangouts, philosophy GCs, memes, study groups, gaming servers, Hindi/Hinglish chats and more.",
    },
    {
      q: "Do I need an account to join a group?",
      a: "No. Tap Join on any group and you land on the platform's own invite page. You only need to log in (with Google) to vote, save groups, report a group or add your own.",
    },
    {
      q: "Random GC kaise join karein?",
      a: "Platform chuno (Instagram, Telegram ya Discord), apni category select karo, aur kisi bhi group par Join dabao. Invite link khulega — wahan se group join kar lo. Join karne ke liye us app mein tumhara account hona chahiye.",
    },
    {
      q: "Are these groups official or run by you?",
      a: "No. Every group is created and managed by its own admin. We are an independent directory and are not affiliated with Instagram, Meta, Telegram or Discord.",
    },
    {
      q: "How do I add my group?",
      a: "Tap “Add group”, pick the platform, paste your invite link and write a short description. AI reviews it automatically and most groups go live within a minute.",
    },
  ] satisfies Faq[],
};

export const PLATFORM_SEO: Record<Platform, PlatformSeo> = {
  instagram: {
    h1: "Random Instagram groups & GC links",
    title: "Random Instagram Groups & Insta GC Links — Join Instagram Group Chats",
    description:
      "Join random Instagram groups and insta GC: philosophy, memes, study, gaming, Hindi/Hinglish and more. Free invite links, AI-checked and ranked by votes.",
    keywords: [
      "random insta groups", "random instagram groups", "instagram group chat links", "random insta gc",
      "random gc", "random igc", "insta gc join", "instagram groups link", "random insta rooms",
      "how to join random insta groups", "instagram group links india", "hindi insta gc",
    ],
    intro: [
      "Looking for a random Instagram group to chat in? Here you'll find active Instagram group chats (GC) by category — philosophy and deep talks, memes, study and board-exam prep, gaming, anime, music, college and Hindi/Hinglish chats.",
      "Tap Join to open the group's Instagram invite. Groups are ranked by votes, so the best, most active GCs rise to the top, and groups that fill up or break are marked or removed.",
    ],
    faqs: [
      {
        q: "How do I join random Instagram groups?",
        a: "Browse the list, pick a category you like and tap Join. Instagram opens the group's invite link — tap Join in the Instagram app. You need an Instagram account, and the group must still have free spots.",
      },
      {
        q: "Random insta GC kaise join karein?",
        a: "Is page par kisi bhi category ka group chuno aur Join dabao. Instagram ka invite khulega, wahan se join kar lo. Agar group full hai ya link kaam nahi kar raha, ⋮ menu se report kar do.",
      },
      {
        q: "Are random Instagram group chats safe?",
        a: "We AI-check listings, but you're still talking to strangers: don't share personal details, photos or money, and leave any group that makes you uncomfortable. You can report a group from the ⋮ menu.",
      },
      {
        q: "How do I add my Instagram group chat here?",
        a: "Create an invite link for your group in Instagram, then tap Add group, choose Instagram, paste the link and add a short description. It goes live after a quick AI review.",
      },
    ] satisfies Faq[],
  },
  telegram: {
    h1: "Telegram group links & random Telegram groups",
    title: "Telegram Group Links — Random Telegram Groups & Channels to Join",
    description:
      "Find Telegram group links and random Telegram groups: chat, tech, study, crypto, movies, jobs, Hindi and more. Free, AI-checked, dead links removed daily.",
    keywords: [
      "telegram group links", "random telegram groups", "telegram group chats", "telegram groups to join",
      "join telegram groups", "telegram channel links", "telegram group link hindi", "study telegram groups",
      "tech telegram groups", "movies telegram groups",
    ],
    intro: [
      "Browse Telegram groups and channels by topic — casual chat, tech and coding, study and exam prep, jobs, movies and series, memes, music, gaming and Hindi communities. Each listing has a working t.me invite link you can open with one tap.",
      "We check Telegram links every day and take down expired or invalid invites, and the member count is shown where Telegram makes it public, so you can pick active groups.",
    ],
    faqs: [
      {
        q: "How do I join a Telegram group from a link?",
        a: "Tap Join on any group — the t.me invite opens in Telegram. Tap “Join Group” (or “Join Channel”). You need the Telegram app or Telegram Web logged in.",
      },
      {
        q: "Telegram group link kahan milenge?",
        a: "Isi page par category ke hisaab se Telegram group links milte hain — study, tech, movies, jobs, Hindi aur bahut kuch. Join dabao aur seedha Telegram mein khul jayega.",
      },
      {
        q: "Are Telegram groups safe? What about crypto and “signals” groups?",
        a: "Be careful with any group promising guaranteed profits, free money or investment tips — these are common scams. Never share OTPs, passwords or payment details, and report suspicious groups.",
      },
      {
        q: "How do I add my Telegram group?",
        a: "Copy your group's invite link (t.me/+… or t.me/yourname), tap Add group, choose Telegram and paste it. Links that Telegram reports as invalid are rejected.",
      },
    ] satisfies Faq[],
  },
  discord: {
    h1: "Discord servers & random Discord invite links",
    title: "Discord Server Invite Links — Join Random Discord Servers",
    description:
      "Discover Discord servers and invite links: gaming, anime, coding, study, art, roleplay and Hindi communities. Free, AI-checked, expired invites removed daily.",
    keywords: [
      "discord server links", "random discord servers", "discord invite links", "discord servers to join",
      "join discord servers", "gaming discord servers", "anime discord servers", "hindi discord servers",
    ],
    intro: [
      "Find Discord servers for gaming, anime, coding and dev, art and design, study, music, roleplay and chill hangouts. Every listing has a discord.gg invite you can open with one tap.",
      "Expired invites are removed automatically — we verify Discord invites daily and show the server's member count, so you can jump into servers that are alive.",
    ],
    faqs: [
      {
        q: "How do I join a Discord server with an invite link?",
        a: "Tap Join on any server — the discord.gg invite opens in Discord. Tap “Accept Invite”. You need a free Discord account.",
      },
      {
        q: "Discord server link kaise milega?",
        a: "Is page par category ke hisaab se Discord servers ke invite links hain — gaming, anime, coding, Hindi aur aur bhi. Join dabao, Discord khulega, Accept Invite kar do.",
      },
      {
        q: "Are public Discord servers safe?",
        a: "Most are fine, but never click unknown links in DMs, never share your token or password, and be careful with “free Nitro” offers. Report a server if something looks wrong.",
      },
      {
        q: "How do I add my Discord server?",
        a: "Create a permanent invite link (set it to never expire) in your server, then tap Add group, choose Discord and paste it.",
      },
    ] satisfies Faq[],
  },
};

export function categoryIntro(platformLabel: string, categoryName: string): string {
  return `Browse ${categoryName.toLowerCase()} ${platformLabel} groups. These ${categoryName.toLowerCase()} ${platformLabel} group chats are submitted by their admins, checked by AI and ranked by votes — tap Join to open the invite link. Can't find the right one? Add your own ${categoryName.toLowerCase()} group in a minute.`;
}

/**
 * Search results, shuffle, re-sorted lists and page 2+ are near-duplicates of the main list.
 * They stay crawlable (links on them are followed) but must not be indexed.
 */
export function isFilteredView(sp: { search?: string; shuffle?: string; page?: string; sort?: string }): boolean {
  return !!(sp.search || sp.shuffle || sp.sort || (sp.page && Number(sp.page) > 1));
}

export const NOINDEX_FOLLOW = { robots: { index: false, follow: true } } as const;
