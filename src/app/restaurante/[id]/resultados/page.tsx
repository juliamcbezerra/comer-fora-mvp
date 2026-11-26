import { notFound } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ResultsDashboardClient } from "@/components/results/ResultsDashboardClient";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { getRestaurantResultsData } from "@/lib/repositories/results";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ResultadosPage({
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

  const initialData = await getRestaurantResultsData({
    restaurantId: restaurant.id,
    monthlyPromoBudget: restaurant.monthly_promo_budget,
    sessionId,
  });

  const initialTab =
    resolvedSearch.tab === "ecosystem" ? "ecosystem" : "restaurant";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        activeStep="resultados"
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />
      <main className="flex-1">
        <ResultsDashboardClient
          restaurant={restaurant}
          initialData={initialData}
          initialTab={initialTab}
        />
      </main>
      <AppFooter />
    </div>
  );
}
