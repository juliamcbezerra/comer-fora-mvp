import { NextResponse } from "next/server";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { getRestaurantResultsData } from "@/lib/repositories/results";
import { attachSessionCookie, getOrCreateSessionId } from "@/lib/session";
import { SupabaseConfigError } from "@/lib/supabase/server";

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

    const results = await getRestaurantResultsData({
      restaurantId: restaurant.id,
      monthlyPromoBudget: restaurant.monthly_promo_budget,
      sessionId,
    });

    const response = NextResponse.json({
      restaurant,
      ...results,
    });

    return shouldSetCookie ? attachSessionCookie(response, sessionId) : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os resultados.";
    return NextResponse.json({ error: message }, { status });
  }
}
