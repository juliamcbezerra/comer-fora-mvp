import { notFound } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CampaignPlannerView } from "@/components/planner/CampaignPlannerView";
import { calculateDeterministicMetrics } from "@/lib/business-rules";
import {
  getDiagnosticById,
  getLatestDiagnosticForRestaurant,
} from "@/lib/repositories/diagnostics";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ diagnosticId?: string; planIndex?: string }>;
}

export default async function PlanejarPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = await getSessionId();

  const restaurant = await getAccessibleRestaurantById(id, sessionId);
  if (!restaurant) {
    notFound();
  }

  let diagnostic = resolvedSearch.diagnosticId
    ? await getDiagnosticById(resolvedSearch.diagnosticId, sessionId)
    : null;

  if (!diagnostic || diagnostic.restaurant_id !== restaurant.id) {
    diagnostic = await getLatestDiagnosticForRestaurant(
      restaurant.id,
      sessionId
    );
  }

  const parsedIndex =
    resolvedSearch.planIndex !== undefined
      ? Number.parseInt(resolvedSearch.planIndex, 10)
      : null;
  const validPlanIndex =
    parsedIndex !== null && !Number.isNaN(parsedIndex) && parsedIndex >= 0
      ? parsedIndex
      : null;

  const metrics = calculateDeterministicMetrics(restaurant);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        activeStep="planejar"
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
      <main className="flex-1">
        <CampaignPlannerView
          restaurant={restaurant}
          metrics={metrics}
          diagnostic={diagnostic}
          initialPlanIndex={validPlanIndex}
        />
      </main>
      <AppFooter />
    </div>
  );
}
