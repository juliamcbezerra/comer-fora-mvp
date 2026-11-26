import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { OnboardingWorkspace } from "@/components/onboarding/OnboardingWorkspace";
import {
  listAccessibleRestaurants,
  type RestaurantWithSummary,
} from "@/lib/repositories/restaurants";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionId = await getSessionId();

  let restaurants: RestaurantWithSummary[] = [];
  let loadError: string | null = null;

  try {
    restaurants = await listAccessibleRestaurants(sessionId);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os restaurantes do Supabase.";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader activeStep="onboarding" />
      <main className="flex-1">
        <OnboardingWorkspace
          initialRestaurants={restaurants}
          loadError={loadError}
        />
      </main>
      <AppFooter />
    </div>
  );
}
