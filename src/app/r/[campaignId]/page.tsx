import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldAlert } from "lucide-react";
import { MobileRedemptionClient } from "@/components/redemption/MobileRedemptionClient";
import { isValidUuid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ source?: string }>;
}

export default async function PublicRedemptionPage({
  params,
  searchParams,
}: PageProps) {
  const { campaignId } = await params;
  const resolvedSearch = await searchParams;

  if (!isValidUuid(campaignId)) {
    notFound();
  }

  const supabase = getSupabaseAdmin();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, restaurant_id, title, offer_description, target_window, coupon_limit, cta_text, recurrence_hook, status"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const [{ data: restaurant }, { count: redemptionsCount }] = await Promise.all([
    supabase
      .from("restaurants")
      .select("name, category, neighborhood, city")
      .eq("id", campaign.restaurant_id)
      .maybeSingle(),
    supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "redemption"),
  ]);

  if (campaign.status !== "active") {
    return (
      <div className="min-h-screen bg-[#F7F7F7] px-4 py-8">
        <main className="mx-auto max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-[#EA1D2C]" />
          <div className="border-b border-neutral-100 px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/ifood-logo.webp"
                  alt="iFood"
                  className="h-6 w-auto object-contain"
                />
                <span aria-hidden="true" className="h-4 w-px bg-neutral-200" />
                <span className="text-xs font-bold text-[#3F3E3E]">
                  Comer Fora
                </span>
              </div>
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#717171]">
                Demonstração
              </span>
            </div>
            <h1 className="mt-4 text-xl font-extrabold leading-tight text-[#1A1A1A]">
              {restaurant?.name ?? "Restaurante Parceiro"}
            </h1>
            {restaurant ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-[#717171]">
                <MapPin className="h-3.5 w-3.5 text-[#EA1D2C]" />
                {restaurant.category} • {restaurant.neighborhood},{" "}
                {restaurant.city}
              </p>
            ) : null}
          </div>

          <div className="p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#3F3E3E]">
              <p className="flex items-center gap-2 font-extrabold text-[#1A1A1A]">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
                Campanha aguardando aprovação
              </p>
              <p className="mt-2 text-xs leading-relaxed">
                Esta campanha ainda está em rascunho. O resgate pelo cliente só
                é liberado após a revisão e aprovação na tela do restaurante.
              </p>
              <Link
                href={`/campanha/${campaign.id}/revisao`}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#EA1D2C] px-4 py-2 text-xs font-bold text-white hover:bg-[#A02331]"
              >
                Voltar para revisão e aprovação
              </Link>
            </div>

            <p className="mt-6 border-t border-neutral-100 pt-4 text-center text-[11px] font-semibold text-[#717171]">
              Protótipo Conceitual • Ambiente de demonstração com dados
              fictícios
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <MobileRedemptionClient
      campaign={{
        id: String(campaign.id),
        restaurant_id: String(campaign.restaurant_id),
        title: String(campaign.title),
        offer_description: String(campaign.offer_description),
        target_window: String(campaign.target_window),
        coupon_limit: Number(campaign.coupon_limit),
        cta_text: String(campaign.cta_text),
        recurrence_hook: String(campaign.recurrence_hook),
      }}
      restaurant={{
        name: restaurant?.name ?? "Restaurante Parceiro",
        category: restaurant?.category ?? "Gastronomia",
        neighborhood: restaurant?.neighborhood ?? "Centro",
        city: restaurant?.city ?? "São Paulo",
      }}
      initialRedemptionsCount={redemptionsCount ?? 0}
      source={resolvedSearch.source === "simulator" ? "simulator" : "qr_scan"}
    />
  );
}
