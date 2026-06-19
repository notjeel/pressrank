// Provider-agnostic AI interface.
// Any free AI API (Gemini, Groq, OpenRouter, local) is plugged in by
// implementing this interface in an adapter and selecting it via AI_PROVIDER.

export interface ChannelEnrichment {
  medium?: "youtube" | "instagram" | "tv" | "web" | "other";
  entity_type?: "org" | "individual";
  content_type?: "hardnews" | "explainer" | "commentary" | "satire" | "opinion";
  language?: string;
  country?: string;
  official_url?: string;
  logo_url?: string;
  // best-effort reach when no platform API is available
  approx_followers?: number;
}

export interface ExtractedStatement {
  text: string;
  context?: string;
}

export interface AIProvider {
  readonly name: string;

  /** Free-form JSON-returning completion. Implementations must return parsed JSON. */
  json<T = unknown>(prompt: string, opts?: { system?: string }): Promise<T>;

  /** Look up public facts about a channel and return structured metadata. */
  enrichChannel(input: {
    name: string;
    handle?: string | null;
    medium?: string | null;
    official_url?: string | null;
  }): Promise<ChannelEnrichment>;

  /**
   * Extract short, verbatim, context-preserved statements from a source text
   * (e.g. a transcript). Representative, not cherry-picked. Used for the
   * rated-statement corpus.
   */
  extractStatements(input: {
    sourceText: string;
    channelName: string;
    maxStatements: number;
  }): Promise<ExtractedStatement[]>;
}
