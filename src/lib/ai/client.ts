import { GoogleGenAI, Type, type Schema } from "@google/genai";

export const GEMINI_MODEL = "gemini-flash-lite-latest";

interface OpenAiCompatibleProviderConfig {
  id: string;
  envVar: string;
  endpoint: string;
  models: readonly string[];
  extraHeaders?: Record<string, string>;
}

const OPENAI_COMPATIBLE_PROVIDERS: ReadonlyArray<OpenAiCompatibleProviderConfig> =
  [
    {
      id: "openrouter",
      envVar: "OPENROUTER_API_KEY",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      models: ["openrouter/free", "baidu/ernie-5.5-flash-preview:free"],
      extraHeaders: {
        "HTTP-Referer": "https://comer-fora-impulso.vercel.app",
        "X-Title": "iFood Comer Fora Impulso (Prototipo)",
      },
    },
    {
      id: "mistral",
      envVar: "MISTRAL_API_KEY",
      endpoint: "https://api.mistral.ai/v1/chat/completions",
      models: ["mistral-small-latest"],
    },
    {
      id: "cerebras",
      envVar: "CEREBRAS_API_KEY",
      endpoint: "https://api.cerebras.ai/v1/chat/completions",
      models: ["llama-3.3-70b"],
    },
    {
      id: "groq",
      envVar: "GROQ_API_KEY",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      models: ["llama-3.3-70b-versatile"],
    },
  ];

const GEMINI_RACE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
] as const;

// 25s permite que modelos gratuitos de 11-13s (ex.: OpenRouter ernie-5.5-flash)
// concluam com sucesso sem serem abortados prematuramente, mantendo margem segura na Vercel.
export const AI_TIMEOUT_MS = 25_000;

export const diagnosticResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    "executive_summary",
    "bottlenecks",
    "opportunities",
    "recommended_plans",
  ],
  properties: {
    executive_summary: {
      type: Type.STRING,
      description:
        "Leitura executiva concreta e personalizada (2 a 3 frases, até 480 caracteres) citando dados reais do restaurante.",
    },
    bottlenecks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["title", "impact", "explanation"],
        properties: {
          title: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ["alto", "medio", "baixo"] },
          explanation: { type: Type.STRING },
        },
      },
    },
    opportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["title", "priority", "rationale", "expected_lever"],
        properties: {
          title: { type: Type.STRING },
          priority: { type: Type.INTEGER },
          rationale: { type: Type.STRING },
          expected_lever: { type: Type.STRING },
        },
      },
    },
    recommended_plans: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: [
          "objective",
          "title",
          "target_window",
          "mechanic_summary",
          "suggested_cost_per_redemption",
          "suggested_coupon_limit",
          "why_it_fits",
        ],
        properties: {
          objective: { type: Type.STRING },
          title: { type: Type.STRING },
          target_window: { type: Type.STRING },
          mechanic_summary: { type: Type.STRING },
          suggested_cost_per_redemption: { type: Type.NUMBER },
          suggested_coupon_limit: { type: Type.INTEGER },
          why_it_fits: { type: Type.STRING },
        },
      },
    },
  },
};

export const creativeKitResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    "title",
    "offer_description",
    "promo_copy",
    "table_tent_headline",
    "table_tent_body",
    "staff_script",
    "cta_text",
    "recurrence_hook",
  ],
  properties: {
    title: { type: Type.STRING },
    offer_description: { type: Type.STRING },
    promo_copy: { type: Type.STRING },
    table_tent_headline: {
      type: Type.STRING,
      description: "Título curto de no máximo 60 caracteres para display de mesa.",
    },
    table_tent_body: {
      type: Type.STRING,
      description: "Texto conciso de no máximo 160 caracteres para display de mesa.",
    },
    staff_script: {
      type: Type.STRING,
      description: "Fala natural de ~15 segundos para garçom ou atendente.",
    },
    cta_text: { type: Type.STRING },
    recurrence_hook: { type: Type.STRING },
  },
};

interface GenerateStructuredJsonParams {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: Schema;
  temperature: number;
  timeoutMs?: number;
  validateParsed?: (parsed: unknown) => boolean;
}

export interface GenerateStructuredJsonResult {
  parsed: unknown;
  latencyMs: number;
  model: string;
}

function extractJsonObject(rawText: string, modelLabel: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error(
      `A resposta do modelo ${modelLabel} não pôde ser interpretada como JSON válido.`
    );
  }
}

async function callOpenAiSingleModel(
  provider: OpenAiCompatibleProviderConfig,
  apiKey: string,
  model: string,
  params: GenerateStructuredJsonParams,
  timeoutMs: number
): Promise<{ parsed: unknown; model: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(provider.extraHeaders ?? {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: params.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemInstruction },
          { role: "user", content: params.userPrompt },
        ],
      }),
    });

    if (response.status === 400) {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(provider.extraHeaders ?? {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: params.temperature,
          messages: [
            { role: "system", content: params.systemInstruction },
            { role: "user", content: params.userPrompt },
          ],
        }),
      });
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(
        `${provider.id} HTTP ${response.status} (${model}): ${errBody.slice(0, 140)}`
      );
    }

    const payload = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = payload.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
      throw new Error(`${provider.id} (${model}) retornou resposta vazia.`);
    }

    const resolvedModel = payload.model?.trim() || model;
    const modelTag = `${provider.id}:${resolvedModel}`;
    const parsed = extractJsonObject(rawText, modelTag);

    if (params.validateParsed && !params.validateParsed(parsed)) {
      throw new Error(`${modelTag} retornou JSON fora do contrato esperado.`);
    }

    return { parsed, model: modelTag };
  } finally {
    clearTimeout(timer);
  }
}

async function callSingleGeminiCandidate(
  ai: GoogleGenAI,
  model: string,
  params: GenerateStructuredJsonParams,
  timeoutMs: number
): Promise<{ parsed: unknown; model: string }> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Tempo limite excedido (${Math.round(timeoutMs / 1000)}s) no modelo ${model}.`
        )
      );
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: params.userPrompt,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
        },
      }),
      timeoutPromise,
    ]);

    const rawText = response.text?.trim();
    if (!rawText) {
      throw new Error(`O modelo ${model} retornou resposta vazia.`);
    }

    const modelTag = `gemini:${model}`;
    const parsed = extractJsonObject(rawText, modelTag);

    if (params.validateParsed && !params.validateParsed(parsed)) {
      throw new Error(`${modelTag} retornou JSON fora do contrato esperado.`);
    }

    return { parsed, model: modelTag };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Gateway Multi-Provider em Corrida Paralela Única (*Hedged* via Promise.any):
 * Dispara simultaneamente todos os modelos saudáveis configurados (OpenRouter Free +
 * Gemini Flash) sem corte artificial intermediário. Quem responder primeiro com JSON
 * 100% válido no contrato Zod vence imediatamente.
 */
export async function generateStructuredJson(
  params: GenerateStructuredJsonParams
): Promise<GenerateStructuredJsonResult> {
  const totalBudgetMs = params.timeoutMs ?? AI_TIMEOUT_MS;
  const startedAt = Date.now();

  const configuredOpenAiProviders = OPENAI_COMPATIBLE_PROVIDERS.map(
    (provider) => ({
      provider,
      apiKey: process.env[provider.envVar]?.trim() ?? "",
    })
  ).filter((entry) => entry.apiKey.length > 0);

  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

  if (configuredOpenAiProviders.length === 0 && !geminiKey) {
    throw new Error(
      "Nenhuma chave de IA configurada no servidor (defina OPENROUTER_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY, GROQ_API_KEY ou GEMINI_API_KEY)."
    );
  }

  const racePromises: Array<Promise<{ parsed: unknown; model: string }>> = [];

  for (const { provider, apiKey } of configuredOpenAiProviders) {
    for (const model of provider.models) {
      racePromises.push(
        callOpenAiSingleModel(provider, apiKey, model, params, totalBudgetMs)
      );
    }
  }

  if (geminiKey) {
    const geminiClient = new GoogleGenAI({ apiKey: geminiKey });
    for (const model of GEMINI_RACE_MODELS) {
      racePromises.push(
        callSingleGeminiCandidate(geminiClient, model, params, totalBudgetMs)
      );
    }
  }

  try {
    const winner = await Promise.any(racePromises);
    return {
      parsed: winner.parsed,
      latencyMs: Date.now() - startedAt,
      model: winner.model,
    };
  } catch (err) {
    const errors = err instanceof AggregateError ? err.errors : [err];
    const summary = errors
      .slice(0, 2)
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join(" | ");

    throw new Error(summary || "Provedores de IA indisponíveis no momento.");
  }
}
