import { env } from "../utils/env";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLLM(
  messages: LLMMessage[],
  options?: { temperature?: number }
): Promise<string> {
  const temperature = options?.temperature ?? 0.3;

  if (env.LLM_PROVIDER === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `OpenAI API error: ${response.status} - ${response.statusText} - ${text}`
      );
    }

    const data: any = await response.json();
    const content =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      JSON.stringify(data);
    return content;
  }

  // GROQ (OpenAI-compatible API)
  if (env.LLM_PROVIDER === "groq") {
    if (!env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set");
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          messages,
          temperature,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Groq API error: ${response.status} - ${response.statusText} - ${text}`
      );
    }

    const data: any = await response.json();
    const content =
      data.choices?.[0]?.message?.content ??
      data.choices?.[0]?.text ??
      JSON.stringify(data);
    return content;
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${env.LLM_PROVIDER}`);
}