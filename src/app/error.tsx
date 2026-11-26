"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F7] px-4 py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-[#EA1D2C]" />

        <div className="border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ifood-logo.webp"
              alt="iFood"
              className="h-6 w-auto object-contain"
            />
            <span aria-hidden="true" className="h-4 w-px bg-neutral-200" />
            <span className="text-xs font-bold text-[#3F3E3E]">
              Comer Fora Impulso
            </span>
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-[#1A1A1A]">
            Algo não saiu como esperado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#717171]">
            Ocorreu uma instabilidade temporária ao carregar esta tela. Tente
            novamente ou volte para a página inicial.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331]"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-[#3F3E3E] transition-colors hover:bg-neutral-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Início
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
