import { notFound } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosticView } from "@/components/diagnostic/DiagnosticView";
import { calculateDeterministicMetrics } from "@/lib/business-rules";
import {
  getLatestDiagnosticForRestaurant,
  getRestaurantPerformanceSummary,
} from "@/lib/repositories/diagnostics";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autorun?: string }>;
}

export default async function DiagnosticoPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const sessionId = await getSessionId();
  const restaurant = await getAccessibleRestaurantById(id, sessionId);

  if (!restaurant) {
    notFound();
  }

  const [latestDiagnostic, performanceSummary] = await Promise.all([
    getLatestDiagnosticForRestaurant(restaurant.id, sessionId),
    getRestaurantPerformanceSummary(restaurant.id, sessionId),
  ]);

  const metrics = calculateDeterministicMetrics(restaurant);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        activeStep="diagnostico"
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
      <main className="flex-1">
        <DiagnosticView
          restaurant={restaurant}
          metrics={metrics}
          initialDiagnostic={latestDiagnostic}
          performanceSummary={performanceSummary}
          autoRun={resolvedSearchParams.autorun === "1"}
        />
      </main>
      <AppFooter />
    </div>
  );
}
