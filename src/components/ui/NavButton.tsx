"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startTopProgress } from "@/components/TopProgressBar";
import { cn } from "@/lib/utils";

export const SECONDARY_BUTTON_CLASS =
  "bg-white border border-neutral-200 text-neutral-800 transition-colors duration-150 hover:bg-neutral-100 hover:border-neutral-300 hover:text-neutral-950 active:bg-neutral-200/80 cursor-pointer";

interface NavButtonProps {
  href: string;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export function NavButton({
  href,
  children,
  loadingText,
  className,
  icon,
  trailingIcon,
  disabled = false,
  ariaLabel,
}: NavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);

  const busy = isPending || isNavigating;

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => setIsNavigating(false), 10000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  function handleClick() {
    if (disabled || busy) return;

    const currentSearch =
      typeof window !== "undefined" ? window.location.search : "";
    const currentFull = `${pathname}${currentSearch}`;
    if (href === currentFull) return;

    setIsNavigating(true);
    startTopProgress();
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-busy={busy}
      aria-label={ariaLabel}
      className={cn(
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>{loadingText ?? "Carregando..."}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{children}</span>
          {trailingIcon}
        </>
      )}
    </button>
  );
}
