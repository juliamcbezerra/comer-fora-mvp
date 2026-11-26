import { NextResponse } from "next/server";
import { calculateDeterministicMetrics } from "@/lib/business-rules";
import {
  listAccessibleRestaurants,
  normalizeRestaurantRow,
} from "@/lib/repositories/restaurants";
import { restaurantInputSchema } from "@/lib/schemas";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const restaurants = await listAccessibleRestaurants(sessionId);

    const response = NextResponse.json({
      restaurants,
      session_active: true,
    });

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os restaurantes.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido. Envie um JSON válido." },
        { status: 400 }
      );
    }

    const parsed = restaurantInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Revise os campos obrigatórios antes de salvar.",
          field_errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        ...parsed.data,
        session_id: sessionId,
        is_demo_seed: false,
        onboarding_completed: true,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? "Falha ao persistir o restaurante no Supabase."
      );
    }

    const restaurant = normalizeRestaurantRow(data as Record<string, unknown>);
    const response = NextResponse.json(
      {
        restaurant,
        deterministic_metrics: calculateDeterministicMetrics(restaurant),
      },
      { status: 201 }
    );

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível salvar o restaurante.";
    return NextResponse.json({ error: message }, { status });
  }
}
