import { BaseProvider, parseJsonLoose } from "./base";

// OpenAI-compatible chat-completions adapter.
// Works with Groq, OpenRouter, Together, local servers, etc. — set
// OPENAI_COMPAT_BASE_URL / _API_KEY / _MODEL.
export class OpenAICompatProvider extends BaseProvider {
  readonly name = "openai-compat";
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    super();
    const base = process.env.OPENAI_COMPAT_BASE_URL;
    const key = process.env.OPENAI_COMPAT_API_KEY;
    const model = process.env.OPENAI_COMPAT_MODEL;
    if (!base || !key || !model) {
      throw new Error(
        "OpenAI-compatible provider requires OPENAI_COMPAT_BASE_URL, OPENAI_COMPAT_API_KEY and OPENAI_COMPAT_MODEL"
      );
    }
    this.baseUrl = base.replace(/\/$/, "");
    this.apiKey = key;
    this.model = model;
  }

  async json<T = unknown>(
    prompt: string,
    opts?: { system?: string }
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              opts?.system ??
              "You are a precise assistant that replies ONLY with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI-compat error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return parseJsonLoose<T>(text);
  }
}
