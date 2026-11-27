import { NextResponse } from "next/server";
import { verifyAutomationApiAuth } from "@/lib/automation/auth";
import { campaignAlertInputSchema } from "@/lib/automation/schemas";
import {
  checkRateLimit,
  formatRetryAfterPtBr,
  getClientIp,
} from "@/lib/rate-limit";
import { recordCampaignAutomationAlert } from "@/lib/repositories/campaign-monitor";
import { SupabaseConfigError } from "@/lib/supabase/server";

const ALERTS_RATE_LIMIT = {
  limit: 60,
  windowMs: 10 * 60 * 1000, // 10 minutos
};

export async function POST(request: Request) {
  try {
    const auth = verifyAutomationApiAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(
      `internal-monitor-alerts:${clientIp}`,
      ALERTS_RATE_LIMIT
    );
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Limite temporário de registro de alertas excedido. Tente novamente em ${formatRetryAfterPtBr(
            rateCheck.retryAfterSeconds
          )}.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const parsed = campaignAlertInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload de alerta inválido.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Garantia estrita de isolamento: impede gravação em sessão fora do escopo autorizado.
    if (parsed.data.session_id !== auth.allowedSessionId) {
      return NextResponse.json(
        {
          error:
            "Acesso negado: session_id fora do escopo autorizado para automação.",
        },
        { status: 403 }
      );
    }

    const result = await recordCampaignAutomationAlert(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        recorded: result.recorded,
        deduplicated: result.deduplicated,
        log: result.log,
      },
      { status: result.status }
    );
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível registrar o alerta de monitoramento.";
    return NextResponse.json({ error: message }, { status });
  }
}
