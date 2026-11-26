"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";
import { startTopProgress } from "@/components/TopProgressBar";
import { cn } from "@/lib/utils";

export type JourneyStep =
  | "onboarding"
  | "diagnostico"
  | "planejar"
  | "revisao"
  | "resultados";

const DEFAULT_DEMO_RESTAURANT_ID = "11111111-1111-4111-8111-111111111102";

interface AppHeaderProps {
  activeStep?: JourneyStep;
  restaurantId?: string;
  restaurantName?: string;
  campaignId?: string;
}

export function AppHeader({
  activeStep = "onboarding",
  restaurantId,
  restaurantName,
  campaignId,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => setPendingHref(null), 10000);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  const isBusy = isPending || pendingHref !== null;

  function navigateTo(href: string) {
    if (isBusy) return;
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    if (href === `${pathname}${currentSearch}`) return;

    setPendingHref(href);
    startTopProgress();
    startTransition(() => {
      router.push(href);
    });
  }

  const steps: Array<{
    key: JourneyStep;
    label: string;
    href: string | null;
  }> = [
    {
      key: "onboarding",
      label: "1. Perfil",
      href: "/",
    },
    {
      key: "diagnostico",
      label: "2. Diagnóstico",
      href: restaurantId ? `/restaurante/${restaurantId}/diagnostico` : null,
    },
    {
      key: "planejar",
      label: "3. Planejamento",
      href: restaurantId ? `/restaurante/${restaurantId}/planejar` : null,
    },
    {
      key: "revisao",
      label: "4. Kit & QR Code",
      href: campaignId ? `/campanha/${campaignId}/revisao` : null,
    },
    {
      key: "resultados",
      label: "5. Resultados",
      href: restaurantId ? `/restaurante/${restaurantId}/resultados` : null,
    },
  ];

  const auditHref = `/restaurante/${restaurantId ?? DEFAULT_DEMO_RESTAURANT_ID}/resultados?tab=ecosystem`;

  return (
    <header className="sticky top-0 z-30">
      {/* Faixa utilitária institucional */}
      <div className="bg-[#1E1E1E] text-white">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between gap-2 px-4 text-[11px] sm:gap-3 sm:px-6 sm:text-xs">
          <span className="min-w-0 truncate text-white/90">
            Protótipo Conceitual • Ambiente de demonstração com dados fictícios
          </span>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => navigateTo(auditHref)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 font-medium text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingHref === auditHref ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : null}
            <span className="sm:hidden">Auditoria IA</span>
            <span className="hidden sm:inline">
              Visão Ecossistema &amp; Auditoria IA
            </span>
          </button>
        </div>
      </div>

      {/* Header Principal Branco */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col justify-between gap-2 px-4 sm:px-6 lg:h-16 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 pt-3 lg:pt-0">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-3 focus:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ifood-logo.webp"
                alt="iFood"
                className="h-7 w-auto object-contain"
              />
              <span
                aria-hidden="true"
                className="h-5 w-px bg-neutral-200"
              />
              <span className="inline-flex items-baseline gap-1 text-sm font-bold tracking-tight text-[#1A1A1A] sm:text-base">
                <span>Comer Fora</span>
                <span className="inline-flex items-center gap-0.5 text-base font-extrabold text-[#EA1D2C] sm:text-lg">
                  Up
                  <ArrowUp
                    className="h-4 w-4 shrink-0 stroke-[2.75]"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Link>

            {restaurantName ? (
              <span className="hidden truncate rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-[#3F3E3E] xl:inline-flex">
                {restaurantName}
              </span>
            ) : null}
          </div>

          <nav
            aria-label="Etapas da jornada"
            className="-mb-px flex items-center gap-5 overflow-x-auto lg:h-16"
          >
            {steps.map((step) => {
              const isActive = step.key === activeStep;
              const isStepLoading = Boolean(
                step.href && pendingHref === step.href
              );
              const baseClasses = cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors lg:h-full lg:py-0 sm:text-sm",
                isActive
                  ? "border-[#EA1D2C] text-[#EA1D2C]"
                  : step.href
                    ? "cursor-pointer border-transparent text-[#3F3E3E] hover:border-neutral-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                    : "cursor-not-allowed border-transparent text-neutral-300"
              );

              if (!step.href) {
                return (
                  <span
                    key={step.key}
                    aria-disabled="true"
                    className={baseClasses}
                  >
                    {step.label}
                  </span>
                );
              }

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={isBusy}
                  onClick={() => navigateTo(step.href!)}
                  className={baseClasses}
                >
                  {isStepLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EA1D2C]" />
                  ) : null}
                  {step.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
