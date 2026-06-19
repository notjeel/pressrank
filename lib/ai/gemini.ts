import { BaseProvider, parseJsonLoose } from "./base";

// Google Gemini adapter (free tier via AI Studio).
export class GeminiProvider extends BaseProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor() {
    super();
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    this.apiKey = key;
    this.model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  }

  async json<T = unknown>(
    prompt: string,
    opts?: { system?: string }
  ): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(opts?.system
        ? { systemInstruction: { parts: [{ text: opts.system }] } }
        : {}),
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    };

    // Retry on transient overload/rate-limit (503/429) with backoff —
    // gemini-flash-latest periodically returns 503 "high demand".
    const MAX = 4;
    let lastErr = "";
    for (let attempt = 0; attempt < MAX; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Header auth matches the AI Studio key format (incl. AQ.* keys).
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return parseJsonLoose<T>(text);
      }
      lastErr = `${res.status}: ${await res.text()}`;
      if (res.status !== 503 && res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    throw new Error(`Gemini error ${lastErr}`);
  }
}
