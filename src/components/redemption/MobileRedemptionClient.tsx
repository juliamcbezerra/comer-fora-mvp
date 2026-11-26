"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavButton, SECONDARY_BUTTON_CLASS } from "@/components/ui/NavButton";

interface MobileRedemptionClientProps {
  campaign: {
    id: string;
    restaurant_id: string;
    title: string;
    offer_description: string;
    target_window: string;
    coupon_limit: number;
    cta_text: string;
    recurrence_hook: string;
  };
  restaurant: {
    name: string;
    category: string;
    neighborhood: string;
    city: string;
  };
  initialRedemptionsCount: number;
  source: "qr_scan" | "simulator";
}

export function MobileRedemptionClient({
  campaign,
  restaurant,
  initialRedemptionsCount,
  source,
}: MobileRedemptionClientProps) {
  const [redemptionsCount, setRedemptionsCount] = useState(
    initialRedemptionsCount
  );
  const [recurrenceOptIn, setRecurrenceOptIn] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedCoupon, setIssuedCoupon] = useState<{
    code: string;
    optInRecorded: boolean;
    issuedAt: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const viewLoggedRef = useRef(false);

  useEffect(() => {
    if (viewLoggedRef.current) return;
    viewLoggedRef.current = true;

    void fetch(`/api/public/campaigns/${campaign.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recorded && typeof data.redemptions_count === "number") {
          setRedemptionsCount(data.redemptions_count);
        }
      })
      .catch(() => {
        // Silencioso para não interromper a experiência do cliente
      });
  }, [campaign.id, source]);

  const remainingCoupons = Math.max(0, campaign.coupon_limit - redemptionsCount);
  const isExhausted = remainingCoupons <= 0;

  async function handleRedeem() {
    if (isExhausted || isRedeeming) return;

    setIsRedeeming(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/public/campaigns/${campaign.id}/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recurrence_opt_in: recurrenceOptIn,
            source,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (typeof data.redemptions_count === "number") {
          setRedemptionsCount(data.redemptions_count);
        }
        setErrorMessage(
          data.error ?? "Não foi possível resgatar o benefício agora."
        );
        return;
      }

      setRedemptionsCount(data.redemptions_count);
      setIssuedCoupon({
        code: data.coupon_code,
        optInRecorded: Boolean(data.recurrence_opt_in),
        issuedAt: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } catch {
      setErrorMessage(
        "Erro de conexão ao validar seu resgate. Tente novamente."
      );
    } finally {
      setIsRedeeming(false);
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignora se clipboard não disponível
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-6 sm:py-10">
      <main className="mx-auto max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-[#EA1D2C]" />

        {/* Cabeçalho iFood Comer Fora */}
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
            {restaurant.name}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#717171]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#EA1D2C]" />
            {restaurant.category} • {restaurant.neighborhood}, {restaurant.city}
          </p>
        </div>

        {/* Corpo da Experiência */}
        <div className="p-6">
          <div>
            <h2 className="text-lg font-extrabold leading-snug text-[#1A1A1A]">
              {campaign.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#3F3E3E]">
              {campaign.offer_description}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50 px-3.5 py-2.5 text-xs font-semibold text-[#3F3E3E]">
            <Clock className="h-4 w-4 shrink-0 text-[#EA1D2C]" />
            <span>Validade: {campaign.target_window}</span>
          </div>

          {/* Barra de Estoque */}
          <div className="mt-4 rounded-lg border border-neutral-200/80 bg-white p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#717171]">
                Cupons disponíveis
              </span>
              <span className="font-extrabold text-[#1A1A1A]">
                {remainingCoupons} de {campaign.coupon_limit}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-[#EA1D2C] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (redemptionsCount / Math.max(1, campaign.coupon_limit)) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[#9C050B]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {issuedCoupon ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Benefício ativado!
              </span>

              <p className="mt-3 text-xs text-[#3F3E3E]">
                Mostre este código demonstrativo ao atendente na mesa:
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-white px-4 py-4">
                <Ticket className="h-6 w-6 text-[#EA1D2C]" />
                <span className="font-mono text-3xl font-extrabold tracking-widest text-[#1A1A1A]">
                  {issuedCoupon.code}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleCopyCode(issuedCoupon.code)}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-50"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Código copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar código
                  </>
                )}
              </button>

              {issuedCoupon.optInRecorded ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-left text-xs text-[#3F3E3E]">
                  <Gift className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
                  <span>
                    <strong>Interesse em retorno registrado!</strong> Convite
                    demonstrativo de Giftback contabilizado de forma anônima no
                    painel do restaurante.
                  </span>
                </div>
              ) : null}

              <p className="mt-3 text-[11px] text-[#717171]">
                Emitido às {issuedCoupon.issuedAt} • Cupom demonstrativo.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                {!isExhausted ? (
                  <button
                    type="button"
                    onClick={() => setIssuedCoupon(null)}
                    className={cn(
                      "w-full rounded-lg px-4 py-2.5 text-xs font-bold",
                      SECONDARY_BUTTON_CLASS
                    )}
                  >
                    Simular outro cliente na mesa
                  </button>
                ) : null}

                <NavButton
                  href={`/restaurante/${campaign.restaurant_id}/resultados`}
                  loadingText="Abrindo resultados..."
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#EA1D2C] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
                >
                  Ver impacto no painel de resultados
                </NavButton>
              </div>
            </div>
          ) : isExhausted ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
              <p className="text-sm font-extrabold text-[#1A1A1A]">
                Cupons esgotados para esta campanha
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#3F3E3E]">
                O limite de <strong>{campaign.coupon_limit} resgates</strong>{" "}
                foi atingido para proteger o orçamento do restaurante.
              </p>
              <NavButton
                href={`/restaurante/${campaign.restaurant_id}/resultados`}
                loadingText="Voltando..."
                icon={<BarChart3 className="h-3.5 w-3.5" />}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#EA1D2C] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
              >
                Voltar para resultados
              </NavButton>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4 text-xs leading-relaxed text-[#3F3E3E]">
                <input
                  type="checkbox"
                  checked={recurrenceOptIn}
                  onChange={(e) => setRecurrenceOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#EA1D2C]"
                />
                <span>
                  <strong className="text-[#1A1A1A]">
                    Quero receber benefício de retorno / Giftback
                  </strong>
                  <span className="mt-1 block text-[#717171]">
                    {campaign.recurrence_hook}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    100% anônimo — nenhum dado pessoal é solicitado.
                  </span>
                </span>
              </label>

              <button
                type="button"
                disabled={isRedeeming}
                onClick={() => void handleRedeem()}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-3.5 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando cupom demonstrativo...
                  </>
                ) : (
                  <>
                    <Ticket className="h-4 w-4" />
                    Resgatar benefício demonstrativo
                  </>
                )}
              </button>
            </div>
          )}

          <p className="mt-6 border-t border-neutral-100 pt-4 text-center text-[10px] font-semibold text-[#717171]">
            Protótipo Conceitual • Ambiente de demonstração com dados fictícios
          </p>
        </div>
      </main>
    </div>
  );
}
