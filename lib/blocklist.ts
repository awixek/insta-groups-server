// Pre-AI content filter (cheap, deterministic, runs before any LLM call).
//
// Text is NORMALISED before matching so common bypasses stop working:
//   p0rn, n.u.d.e.s, p o r n, ｐｏｒｎ, pоrn (Cyrillic о), zero-width chars, leet-speak, stretched letters.
// Two views of the text are checked (each with and without leet-speak decoding):
//   words    -> "p0rn hub" => "porn hub"   (whole-word terms, e.g. "cp", "sex")
//   squashed -> "pornhub" / "nudes"        (substring terms, for long unambiguous words)
// Hindi (Devanagari) and Hinglish terms are included.
// One place to maintain: add terms to the lists below.

// Long, unambiguous terms: matched as a substring of the squashed text.
const SUBSTRING_TERMS = [
  // sexual / adult
  "porn", "xvideos", "xnxx", "nudes", "onlyfans", "sexchat", "sexting", "hentai", "camgirl", "nsfw",
  "adultgroup", "adultchat", "18plus", "sexvideo", "sexstory", "sexstories", "chudai", "bhabhisex", "desisex",
  "randichat", "callgirl", "escortservice",
  // child safety (never allowed in any form)
  "childporn", "childabuse", "lolicon", "pedophil", "paedophil", "jailbait", "underagesex", "teennudes", "kidnudes",
  // scams / abuse
  "hackaccount", "accounthack", "instahack", "darkweb", "freerobux", "freevbucks", "freefollowers", "buyfollowers",
  "getfollowers", "investmentguaranteed", "doubleyourmoney", "forexsignalsguaranteed",
  // strong Hindi / Hinglish profanity (long enough to be safe as substrings)
  "madarchod", "behenchod", "bhenchod", "bhosdi", "bhosad", "chutiya",
];

// Short / ambiguous terms: whole-word match only (so "operandi" / "discarding" style false positives don't happen).
const WORD_TERMS = [
  "cp", "loli", "shota", "pedo", "nude", "nudes", "porn", "sex", "xxx", "mms", "cvv", "carding",
  "dalla", "chut", "gand", "gandu", "randi", "lund", "lauda", "harami", "bsdk", "bkl", "mkc", "horny", "rape", "raped",
  "18+",
];

// Devanagari terms (matched as substrings of the raw lowercase text).
const DEVANAGARI_TERMS = ["सेक्स", "पोर्न", "नंगी", "नंगे", "चुदाई", "लंड", "रंडी", "भोसड", "मादरचोद", "बहनचोद", "चूतिया", "गांडू"];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "i",
};

// Common look-alike letters (Cyrillic / Greek) -> latin
const HOMOGLYPHS: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h",
  "ο": "o", "α": "a", "ε": "e", "ρ": "p", "ν": "v", "κ": "k", "τ": "t",
};

function baseNormalise(text: string): string {
  let t = text.normalize("NFKD").toLowerCase();
  t = t.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00ad]/g, ""); // zero-width / bidi / soft hyphen
  t = t.replace(/[\u0300-\u036f]/g, ""); // strip combining accents (Devanagari is a different block, untouched)
  return Array.from(t).map((c) => HOMOGLYPHS[c] ?? c).join("");
}

function deLeet(text: string): string {
  return Array.from(text).map((c) => LEET[c] ?? c).join("");
}

interface View {
  words: string;
  squashed: string;
}

function makeView(t: string): View {
  // words: keep letters / digits / "+" / Devanagari; everything else becomes a space
  const words = ` ${t.replace(/[^a-z0-9+\u0900-\u097f]+/g, " ").replace(/\s+/g, " ").trim()} `;
  // squashed: only letters and digits; 3+ repeated letters collapse to 2 ("nuuuudes" -> "nuudes")
  const squashed = t.replace(/[^a-z0-9\u0900-\u097f]+/g, "").replace(/(.)\1{2,}/g, "$1$1");
  return { words, squashed };
}

function collapseRepeats(s: string): string {
  return s.replace(/(.)\1+/g, "$1");
}

/** Returns the matched term (for server logs only — never show it to the user) or null. */
export function findBlockedTerm(text: string): string | null {
  const raw = baseNormalise(text);

  for (const term of DEVANAGARI_TERMS) {
    if (raw.includes(term)) return term;
  }

  const views: View[] = [makeView(raw), makeView(deLeet(raw))];
  for (const v of views) {
    for (const term of WORD_TERMS) {
      if (v.words.includes(` ${term} `)) return term;
    }
    const collapsed = collapseRepeats(v.squashed);
    for (const term of SUBSTRING_TERMS) {
      if (v.squashed.includes(term)) return term;
      if (collapsed.includes(collapseRepeats(term))) return term;
    }
  }
  return null;
}

/** Personal handles / phone numbers / profile links should not sit in a public directory. */
export function findPersonalInfo(text: string): "handle" | "link" | "phone" | "email" | null {
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return "email";
  if (/(^|[\s(])@(?!everyone\b|here\b)[a-z0-9._]{3,30}/i.test(text)) return "handle";
  if (/(instagram\.com|ig\.me|t\.me|telegram\.me|discord\.gg|discord\.com)\/\S+/i.test(text)) return "link";
  if (/(\+\d{1,3}[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/.test(text)) return "phone";
  return null;
}

/** Crude prompt-injection detector: such listings never auto-approve. */
export function looksLikePromptInjection(text: string): boolean {
  return /(ignore (all |any |the )?(previous|prior|above|earlier)|disregard (the |all )?(rules|instructions)|system prompt|you are now|new instructions|"?decision"?\s*[:=]|approve this|auto[- ]?approve|json object)/i.test(
    text
  );
}
