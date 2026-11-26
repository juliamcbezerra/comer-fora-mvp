import { NextResponse } from "next/server";
import { z } from "zod";
import { runDiagnosticAgent } from "@/lib/ai/orchestrator";
import { getRestaurantPerformanceSummary } from "@/lib/repositories/diagnostics";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { SupabaseConfigError } from "@/lib/supabase/server";

export const maxDuration = 30;

const diagnoseRequestSchema = z.object({
  restaurant_id: z.string().uuid("ID de restaurante inválido."),
  include_performance: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = diagnoseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Informe um restaurant_id válido para gerar o diagnóstico.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
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

    const performanceSummary = parsed.data.include_performance
      ? await getRestaurantPerformanceSummary(restaurant.id, sessionId)
      : null;

    const result = await runDiagnosticAgent({
      restaurant,
      sessionId,
      performanceSummary:
        performanceSummary && performanceSummary.total_campaigns > 0
          ? performanceSummary
          : null,
    });

    const response = NextResponse.json(result, { status: 201 });
    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar o diagnóstico.";
    return NextResponse.json({ error: message }, { status });
  }
}
