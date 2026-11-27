import { NextResponse } from "next/server";
import { verifyAutomationApiAuth } from "@/lib/automation/auth";
import { campaignMonitorQuerySchema } from "@/lib/automation/schemas";
import {
  checkRateLimit,
  formatRetryAfterPtBr,
  getClientIp,
} from "@/lib/rate-limit";
import { listMonitoredCampaignsForSession } from "@/lib/repositories/campaign-monitor";
import { SupabaseConfigError } from "@/lib/supabase/server";

const MONITOR_RATE_LIMIT = {
  limit: 60,
  windowMs: 10 * 60 * 1000, // 10 minutos
};

export async function GET(request: Request) {
  try {
    const auth = verifyAutomationApiAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(
      `internal-monitor-get:${clientIp}`,
      MONITOR_RATE_LIMIT
    );
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Limite temporário de consultas excedido. Tente novamente em ${formatRetryAfterPtBr(
            rateCheck.retryAfterSeconds
          )}.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const url = new URL(request.url);
    const rawParams = {
      session_id: url.searchParams.get("session_id") ?? "",
      campaign_id: url.searchParams.get("campaign_id") ?? undefined,
      only_actionable: url.searchParams.get("only_actionable") ?? undefined,
    };

    const parsed = campaignMonitorQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Parâmetros de consulta inválidos.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Garantia estrita de isolamento: no MVP, apenas a sessão controlada pode ser consultada.
    if (parsed.data.session_id !== auth.allowedSessionId) {
      return NextResponse.json(
        {
          error:
            "Acesso negado: session_id fora do escopo autorizado para automação.",
        },
        { status: 403 }
      );
    }

    const payload = await listMonitoredCampaignsForSession({
      sessionId: parsed.data.session_id,
      campaignId: parsed.data.campaign_id,
      onlyActionable: parsed.data.only_actionable,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar campanhas monitoradas.";
    return NextResponse.json({ error: message }, { status });
  }
}
