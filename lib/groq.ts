import Groq from "groq-sdk";
import type { AiModerationResult, Category } from "./types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

interface ModerationInput {
  name: string;
  description: string;
  inviteLink: string;
  categories: Category[];
  recentGroupNames: string[]; // last ~200 names for duplicate detection
}

/**
 * Reviews a submitted group listing. Returns a structured decision.
 * Falls back to "manual_review" (never silent-approve, never silent-reject)
 * if the AI call fails or returns something unparseable — same defensive
 * contract as the digest pipeline's Phase 1 reliability rules.
 */
export async function moderateGroupSubmission(
  input: ModerationInput
): Promise<AiModerationResult> {
  const fallback: AiModerationResult = {
    decision: "manual_review",
    category_slug: null,
    is_adult: false,
    is_spam: false,
    is_duplicate: false,
    ai_description: input.description.slice(0, 140),
    flags: ["ai_unavailable"],
    reason: "AI moderation call failed or was unparseable; routed to manual review.",
  };

  try {
    const categoryList = input.categories.map((c) => c.slug).join(", ");

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are the moderation AI for InstaGroups AI, a directory of Instagram/Telegram/Discord chat group invites.
For each submission, respond ONLY with a JSON object, no preamble, no markdown fences, matching exactly this shape:
{
  "decision": "approve" | "reject" | "manual_review",
  "category_slug": one of [${categoryList}] or null,
  "is_adult": boolean,
  "is_spam": boolean,
  "is_duplicate": boolean,
  "ai_description": string (max 140 chars, SEO-friendly, factual, no hype/emoji spam),
  "flags": string[] (short machine tags e.g. "spam_language", "possible_duplicate", "adult_content", "fake_link_pattern"),
  "reason": string (one sentence, for the admin queue)
}

Rules:
- reject only for obvious spam, scam links, or clearly fake/gibberish submissions.
- is_adult=true and category_slug="adult" for sexual/18+ content — do not reject these, just tag and categorize correctly.
- is_duplicate=true if the name closely matches one of the recent group names provided.
- If you are not confident, use "manual_review" rather than guessing.
- Never invent an invite link or claim to have visited it; judge only from the text given.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            group_name: input.name,
            description: input.description,
            invite_link_domain: safeDomain(input.inviteLink),
            recent_group_names: input.recentGroupNames,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return fallback;

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as AiModerationResult;

    // sanity-check required fields before trusting it
    if (!parsed.decision || typeof parsed.ai_description !== "string") {
      return fallback;
    }

    return parsed;
  } catch (err) {
    console.error("Groq moderation error:", err);
    return fallback;
  }
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
}
