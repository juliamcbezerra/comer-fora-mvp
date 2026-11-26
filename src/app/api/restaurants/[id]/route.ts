import { NextResponse } from "next/server";
import { calculateDeterministicMetrics } from "@/lib/business-rules";
import {
  getAccessibleRestaurantById,
  normalizeRestaurantRow,
} from "@/lib/repositories/restaurants";
import { restaurantInputSchema } from "@/lib/schemas";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const restaurant = await getAccessibleRestaurantById(id, sessionId);

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado nesta sessão." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      restaurant,
      deterministic_metrics: calculateDeterministicMetrics(restaurant),
    });

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar o restaurante.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const parsed = restaurantInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Revise os campos obrigatórios antes de atualizar.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const existing = await getAccessibleRestaurantById(id, sessionId);

    if (!existing) {
      return NextResponse.json(
        { error: "Restaurante não encontrado ou sem permissão nesta sessão." },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Se o usuário editar um restaurante demo compartilhado, clonamos para sua sessão
    // para preservar o seed intacto para outros avaliadores.
    if (existing.is_demo_seed) {
      const { data: cloned, error } = await supabase
        .from("restaurants")
        .insert({
          ...parsed.data,
          session_id: sessionId,
          is_demo_seed: false,
          onboarding_completed: true,
        })
        .select("*")
        .single();

      if (error || !cloned) {
        throw new Error(
          error?.message ?? "Falha ao salvar cópia personalizada do restaurante."
        );
      }

      const restaurant = normalizeRestaurantRow(cloned as Record<string, unknown>);
      const response = NextResponse.json({
        restaurant,
        cloned_from_demo: true,
        deterministic_metrics: calculateDeterministicMetrics(restaurant),
      });

      return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
    }

    const { data: updated, error } = await supabase
      .from("restaurants")
      .update({
        ...parsed.data,
        onboarding_completed: true,
      })
      .eq("id", existing.id)
      .eq("session_id", sessionId)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(
        error?.message ?? "Falha ao atualizar o restaurante no Supabase."
      );
    }

    const restaurant = normalizeRestaurantRow(updated as Record<string, unknown>);
    const response = NextResponse.json({
      restaurant,
      cloned_from_demo: false,
      deterministic_metrics: calculateDeterministicMetrics(restaurant),
    });

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o restaurante.";
    return NextResponse.json({ error: message }, { status });
  }
}
