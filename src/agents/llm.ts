// GenSpark LLM Proxy(OpenAI 호환) 최소 클라이언트 — Cloudflare Workers fetch 기반
// SDK 의존성 없이 순수 fetch만 사용 (번들 크기 최소화)

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmEnv {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
}

const DEFAULT_MODEL = "gpt-5-mini";
const TIMEOUT_MS = 12000;

export async function callAgentLlm(
  env: LlmEnv,
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  if (!env.OPENAI_API_KEY || !env.OPENAI_BASE_URL) {
    throw new Error("LLM 환경변수 미설정 (OPENAI_API_KEY / OPENAI_BASE_URL)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_MODEL,
        messages,
        max_completion_tokens: opts.maxTokens ?? 300,
        temperature: 0.7,
        reasoning_effort: "minimal",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM 호출 실패 (${res.status}): ${text.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("LLM 응답 형식 오류");
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}
