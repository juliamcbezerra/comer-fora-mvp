import { calculateDeterministicMetrics } from "@/lib/business-rules";
import { canAccessRestaurant, isValidUuid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { DeterministicMetrics, Restaurant } from "@/lib/types";

export interface RestaurantWithSummary extends Restaurant {
  deterministic_metrics: DeterministicMetrics;
  has_diagnostic: boolean;
  active_campaigns_count: number;
}

export function normalizeRestaurantRow(row: Record<string, unknown>): Restaurant {
  return {
    id: String(row.id),
    session_id: row.session_id ? String(row.session_id) : null,
    name: String(row.name),
    category: String(row.category),
    neighborhood: String(row.neighborhood),
    city: String(row.city ?? "São Paulo"),
    avg_ticket: Number(row.avg_ticket),
    seating_capacity: Number(row.seating_capacity),
    opening_hours: String(row.opening_hours),
    low_demand_slots: Array.isArray(row.low_demand_slots)
      ? row.low_demand_slots.map(String)
      : [],
    current_salon_promotion: String(row.current_salon_promotion),
    uses_totem: Boolean(row.uses_totem),
    monthly_promo_budget: Number(row.monthly_promo_budget),
    max_discount_pct: Number(row.max_discount_pct),
    primary_goal: String(row.primary_goal),
    is_demo_seed: Boolean(row.is_demo_seed),
    onboarding_completed: Boolean(row.onboarding_completed),
    created_at: String(row.created_at),
  };
}

export async function listAccessibleRestaurants(
  sessionId: string | null
): Promise<RestaurantWithSummary[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("restaurants")
    .select("*")
    .order("is_demo_seed", { ascending: false })
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.or(`is_demo_seed.eq.true,session_id.eq.${sessionId}`);
  } else {
    query = query.eq("is_demo_seed", true);
  }

  const { data: restaurantRows, error } = await query;

  if (error) {
    throw new Error(`Erro ao carregar restaurantes no Supabase: ${error.message}`);
  }

  const restaurants = (restaurantRows ?? []).map((row) =>
    normalizeRestaurantRow(row as Record<string, unknown>)
  );

  if (restaurants.length === 0) {
    return [];
  }

  const restaurantIds = restaurants.map((r) => r.id);

  let diagQuery = supabase
    .from("diagnostics")
    .select("restaurant_id")
    .in("restaurant_id", restaurantIds);

  let campQuery = supabase
    .from("campaigns")
    .select("restaurant_id, status")
    .in("restaurant_id", restaurantIds)
    .eq("status", "active");

  if (sessionId) {
    diagQuery = diagQuery.or(`session_id.is.null,session_id.eq.${sessionId}`);
    campQuery = campQuery.or(`session_id.is.null,session_id.eq.${sessionId}`);
  } else {
    diagQuery = diagQuery.is("session_id", null);
    campQuery = campQuery.is("session_id", null);
  }

  const [{ data: diagRows }, { data: campRows }] = await Promise.all([
    diagQuery,
    campQuery,
  ]);

  const diagSet = new Set((diagRows ?? []).map((d) => String(d.restaurant_id)));
  const activeCountMap = new Map<string, number>();

  for (const camp of campRows ?? []) {
    const rid = String(camp.restaurant_id);
    activeCountMap.set(rid, (activeCountMap.get(rid) ?? 0) + 1);
  }

  return restaurants.map((restaurant) => ({
    ...restaurant,
    deterministic_metrics: calculateDeterministicMetrics(restaurant),
    has_diagnostic: diagSet.has(restaurant.id),
    active_campaigns_count: activeCountMap.get(restaurant.id) ?? 0,
  }));
}

export async function getAccessibleRestaurantById(
  id: string,
  sessionId: string | null
): Promise<Restaurant | null> {
  if (!isValidUuid(id)) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao consultar restaurante: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const restaurant = normalizeRestaurantRow(data as Record<string, unknown>);
  if (!canAccessRestaurant(restaurant, sessionId)) {
    return null;
  }

  return restaurant;
}
