import { GoogleGenAI, Type, type Schema } from "@google/genai";

export const GEMINI_MODEL = "gemini-flash-lite-latest";

/**
 * Cadeia governada exclusivamente por modelos oficiais da Google Gemini API:
 * - Primário Flash ativo + 1 modelo Flash oficial secundário para contingência de 503/rate limit.
 * - Sem fallback para provedores gratuitos de terceiros (OpenRouter/Baidu etc.) por governança de dados.
 */
export const GEMINI_OFFICIAL_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
] as const;

// Orçamento total controlado de 15s: evita travar a demonstração;
// se ambos os modelos oficiais da Gemini falharem ou atingirem timeout,
// o orquestrador cai diretamente para o fallback determinístico local validado pelo Zod.
export const AI_TIMEOUT_MS = 15_000;

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
        "Leitura estratégica de consultor comercial sênior (2 a 3 frases densas, até 520 caracteres), sem parafrasear o cadastro, cruzando culinária, bairro/turno e alavanca gastronômica de baixo CMV.",
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
 * Gateway governado exclusivamente pela Google Gemini API (`@google/genai`):
 * Executa em paralelo (*hedged* via Promise.any) os 2 modelos oficiais Gemini Flash
 * dentro do orçamento controlado de 15s. Quem responder primeiro com JSON 100% válido
 * no contrato Zod vence imediatamente; caso ambos falhem ou excedam o tempo, o
 * orquestrador cai diretamente no fallback determinístico local.
 */
export async function generateStructuredJson(
  params: GenerateStructuredJsonParams
): Promise<GenerateStructuredJsonResult> {
  const totalBudgetMs = params.timeoutMs ?? AI_TIMEOUT_MS;
  const startedAt = Date.now();

  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

  if (!geminiKey) {
    throw new Error(
      "Chave GEMINI_API_KEY não configurada no servidor. Acionando fallback determinístico local."
    );
  }

  const geminiClient = new GoogleGenAI({ apiKey: geminiKey });
  const racePromises = GEMINI_OFFICIAL_MODELS.map((model) =>
    callSingleGeminiCandidate(geminiClient, model, params, totalBudgetMs)
  );

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

    throw new Error(summary || "Gemini API indisponível no momento.");
  }
}
