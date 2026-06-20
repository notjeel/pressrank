import type {
  AIProvider,
  ChannelEnrichment,
  ExtractedStatement,
} from "./types";

// Strip markdown code fences and parse JSON robustly. LLMs love to wrap JSON.
export function parseJsonLoose<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fall back to the first {...} or [...] block.
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const obj = s.match(/[{[][\s\S]*[}\]]/);
    if (obj) s = obj[0];
  }
  return JSON.parse(s) as T;
}

// Shared enrich/extract logic so each adapter only implements `json()`.
export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  abstract json<T = unknown>(
    prompt: string,
    opts?: { system?: string }
  ): Promise<T>;

  async enrichChannel(input: {
    name: string;
    handle?: string | null;
    medium?: string | null;
    official_url?: string | null;
  }): Promise<ChannelEnrichment> {
    const prompt = `You are building a factual directory of news-spreading channels.
Return ONLY a JSON object describing this channel based on widely-known public facts.

Channel name: ${input.name}
Known handle: ${input.handle ?? "unknown"}
Known medium: ${input.medium ?? "unknown"}
Known URL: ${input.official_url ?? "unknown"}

JSON shape (omit any field you are not confident about):
{
  "medium": "youtube|instagram|tv|web|other",
  "entity_type": "org|individual",
  "content_type": "hardnews|explainer|commentary|satire|opinion",
  "language": "ISO 639-1 code, e.g. en, hi",
  "country": "ISO 3166-1 alpha-2, e.g. US, IN",
  "official_url": "https://...",
  "approx_followers": 0
}
Do not invent facts. If unsure, omit the field.`;
    return this.json<ChannelEnrichment>(prompt);
  }

  async extractStatements(input: {
    sourceText: string;
    channelName: string;
    maxStatements: number;
  }): Promise<ExtractedStatement[]> {
    const prompt = `From the transcript/text below (from "${input.channelName}"), extract up to ${input.maxStatements} short, VERBATIM excerpts suitable for blind quality rating.

Rules:
- Each excerpt must be copied EXACTLY from the text (no paraphrasing, no editing).
- The excerpt must represent actual NEWS, FACTUAL CLAIMS, or SUBSTANTIVE EDITORIAL OPINION on politics, current affairs, economics, technology, science, or public policy.
- STRICTLY EXCLUDE:
  * Self-help, career growth, productivity tips, or workplace advice (e.g. "3 signs you're not growing at work").
  * Podcast episode introductions, titles, guest/channel self-promotions, descriptions, or generic interview setups.
  * School textbook summaries, NCERT syllabus, exam preparation guidance, or general study tutorials.
  * Personal vlogs, gaming, pet behavior, relationship advice, motivational quotes, cooking, or general banter.
  * Contact details, business inquiries, email addresses, phone numbers, websites, social media links (WhatsApp, Telegram, Patreon), boilerplate text, sponsor reads, or calls to action (like "subscribe").
- 1-3 sentences each; long enough to carry meaning, short enough to read on a phone.
- Choose a REPRESENTATIVE spread across the text — do NOT cherry-pick only the best or worst.
- Strip station-specific sign-offs/tags/catchphrases that would reveal the source.
- Include brief surrounding "context" so the excerpt is fair (not a gotcha fragment).

Return ONLY a JSON array: [{"text": "...", "context": "..."}]

TEXT:
${input.sourceText.slice(0, 12000)}`;
    const out = await this.json<ExtractedStatement[] | { statements: ExtractedStatement[] }>(
      prompt
    );
    if (Array.isArray(out)) return out;
    if (out && Array.isArray((out as any).statements))
      return (out as any).statements;
    return [];
  }
}
