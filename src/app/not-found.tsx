import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F7] px-4 py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
                Comer Fora Up
              </span>
            </div>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#717171]">
              404
            </span>
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-[#EA1D2C]">
            <SearchX className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-[#1A1A1A]">
            Página ou campanha não encontrada
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#717171]">
            O endereço informado não existe ou pertence a outra sessão de
            demonstração. Você pode voltar ao início para escolher um
            restaurante de exemplo ou cadastrar o seu.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o início
          </Link>

          <p className="mt-6 border-t border-neutral-100 pt-4 text-[11px] font-semibold text-[#717171]">
            Protótipo Conceitual • Ambiente de demonstração com dados fictícios
          </p>
        </div>
      </main>
    </div>
  );
}
