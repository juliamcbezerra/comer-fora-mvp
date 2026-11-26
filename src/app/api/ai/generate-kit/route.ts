import { NextResponse } from "next/server";
import {
  ConstraintViolationError,
  runCreativeActivatorAgent,
} from "@/lib/ai/orchestrator";
import {
  checkRateLimit,
  formatRetryAfterPtBr,
  getClientIp,
} from "@/lib/rate-limit";
import { getDiagnosticById } from "@/lib/repositories/diagnostics";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { campaignPlanInputSchema } from "@/lib/schemas";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { SupabaseConfigError } from "@/lib/supabase/server";

export const maxDuration = 30;

const GENERATE_KIT_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000, // 10 minutos
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = campaignPlanInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Revise os parâmetros do plano antes de gerar o kit.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const rateKey = `generate-kit:${sessionId || getClientIp(request)}`;
    const rateCheck = checkRateLimit(rateKey, GENERATE_KIT_RATE_LIMIT);
    if (!rateCheck.allowed) {
      const rateLimitResponse = NextResponse.json(
        {
          error: `Você atingiu o limite temporário de geração de kits (10 a cada 10 minutos). Aguarde ${formatRetryAfterPtBr(
            rateCheck.retryAfterSeconds
          )} para tentar novamente.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      );
      return shouldSetCookie
        ? attachSessionCookie(rateLimitResponse, sessionId)
        : rateLimitResponse;
    }

    const restaurant = await getAccessibleRestaurantById(
      parsed.data.restaurant_id,
      sessionId
    );

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado nesta sessão." },
        { status: 404 }
      );
    }

    let validDiagnosticId: string | null = null;
    if (parsed.data.diagnostic_id) {
      const diag = await getDiagnosticById(parsed.data.diagnostic_id, sessionId);
      if (diag && diag.restaurant_id === restaurant.id) {
        validDiagnosticId = diag.id;
      }
    }

    const result = await runCreativeActivatorAgent({
      restaurant,
      diagnosticId: validDiagnosticId,
      plan: {
        objective: parsed.data.objective,
        target_window: parsed.data.target_window,
        budget_limit: parsed.data.budget_limit,
        estimated_cost_per_redemption: parsed.data.estimated_cost_per_redemption,
        coupon_limit: parsed.data.coupon_limit,
        mechanic_notes: parsed.data.mechanic_notes,
      },
      sessionId,
    });

    const response = NextResponse.json(result, { status: 201 });
    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    if (error instanceof ConstraintViolationError) {
      return NextResponse.json(
        {
          error: error.message,
          validation: error.validation,
        },
        { status: 400 }
      );
    }

    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o kit de ativação.";
    return NextResponse.json({ error: message }, { status });
  }
}
