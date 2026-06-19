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
    this.model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  async json<T = unknown>(
    prompt: string,
    opts?: { system?: string }
  ): Promise<T> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
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
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseJsonLoose<T>(text);
  }
}
