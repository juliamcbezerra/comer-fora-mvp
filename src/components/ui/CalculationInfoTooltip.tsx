"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

export function CalculationInfoTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsPinned(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsPinned(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        if (!isPinned) setIsOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label="Como calculamos seus limites automaticamente"
        onClick={() => {
          setIsPinned((prev) => {
            const next = !prev;
            setIsOpen(next);
            return next;
          });
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          if (
            !isPinned &&
            !containerRef.current?.contains(e.relatedTarget as Node | null)
          ) {
            setIsOpen(false);
          }
        }}
        className="inline-flex shrink-0 cursor-help items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-200/80 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200/80 focus:outline-none focus:ring-2 focus:ring-[#EA1D2C]/25"
      >
        <span>Cálculo automático</span>
        <HelpCircle
          className="h-3.5 w-3.5 shrink-0 text-neutral-500"
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Como calculamos seus limites"
          className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-lg ring-1 ring-black/5 sm:w-80"
        >
          <p className="text-xs font-extrabold text-[#1A1A1A]">
            Como calculamos seus limites
          </p>

          <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#3F3E3E]">
            <li>
              <strong className="text-[#1A1A1A]">Prontidão (0–100):</strong>{" "}
              considera divulgação atual no salão, uso de totem, horários
              tranquilos mapeados e verba mensal.
            </li>
            <li>
              <strong className="text-[#1A1A1A]">Benefício seguro:</strong>{" "}
              aplica seu limite de desconto sobre o ticket médio (com trava
              máxima de segurança de 30%).
            </li>
            <li>
              <strong className="text-[#1A1A1A]">Limite de cupons:</strong>{" "}
              cruza seu orçamento mensal com a capacidade segura de assentos
              para evitar sobrecarga no salão.
            </li>
            <li>
              <strong className="text-[#1A1A1A]">Receita estimada:</strong>{" "}
              projeção demonstrativa do volume ativado (já indicando o valor
              líquido após incentivos).
            </li>
          </ul>

          <p className="mt-2 border-t border-neutral-100 pt-2 text-[11px] leading-snug text-neutral-500">
            Essas travas são calculadas automaticamente pelo sistema — nenhuma
            sugestão pode ultrapassar seu orçamento ou margem.
          </p>
        </div>
      ) : null}
    </div>
  );
}
