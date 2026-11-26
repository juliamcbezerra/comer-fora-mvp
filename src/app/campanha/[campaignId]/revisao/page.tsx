import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { CampaignReviewWorkspace } from "@/components/campaign/CampaignReviewWorkspace";
import { getAccessibleCampaignById } from "@/lib/repositories/diagnostics";
import { getAccessibleRestaurantById } from "@/lib/repositories/restaurants";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ fallback?: string }>;
}

export default async function CampaignRevisaoPage({
  params,
  searchParams,
}: PageProps) {
  const { campaignId } = await params;
  const resolvedSearch = await searchParams;
  const sessionId = await getSessionId();

  const campaign = await getAccessibleCampaignById(campaignId, sessionId);
  if (!campaign) {
    notFound();
  }

  const restaurant = await getAccessibleRestaurantById(
    campaign.restaurant_id,
    sessionId
  );
  if (!restaurant) {
    notFound();
  }

  const headerStore = await headers();
  const forwardedHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  const isLocalHost =
    !forwardedHost ||
    forwardedHost.includes("localhost") ||
    forwardedHost.includes("127.0.0.1");

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const hasPublicEnvUrl =
    Boolean(envAppUrl) &&
    !envAppUrl.includes("localhost") &&
    !envAppUrl.includes("127.0.0.1");

  const configuredAppUrl = !isLocalHost
    ? `${forwardedProto}://${forwardedHost}`
    : hasPublicEnvUrl
      ? envAppUrl
      : "https://comer-fora-up.vercel.app";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <AppHeader
          activeStep="revisao"
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          campaignId={campaign.id}
        />
      </div>

      <main className="flex-1">
        <CampaignReviewWorkspace
          initialCampaign={campaign}
          restaurant={restaurant}
          configuredAppUrl={configuredAppUrl}
          generatedByFallback={resolvedSearch.fallback === "1"}
        />
      </main>

      <div className="print:hidden">
        <AppFooter />
      </div>
    </div>
  );
}
