"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_START_EVENT = "cfi:navigation-start";

export function startTopProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NAV_START_EVENT));
  }
}

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const trickleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);

  function clearAllTimers() {
    if (trickleTimerRef.current) {
      clearInterval(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }

  function start() {
    clearAllTimers();
    isRunningRef.current = true;
    setVisible(true);
    setProgress(18);

    trickleTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const step = prev < 50 ? 12 : prev < 75 ? 6 : 2;
        return Math.min(90, prev + step);
      });
    }, 220);

    safetyTimerRef.current = setTimeout(() => {
      complete();
    }, 12000);
  }

  function complete() {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;
    clearAllTimers();
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  }

  // Finaliza suavemente sempre que a rota ou query string mudar
  useEffect(() => {
    complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Escuta cliques em links internos e eventos programáticos
  useEffect(() => {
    function handleCustomStart() {
      start();
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      try {
        const nextUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);
        if (nextUrl.origin !== currentUrl.origin) return;
        if (
          nextUrl.pathname === currentUrl.pathname &&
          nextUrl.search === currentUrl.search
        ) {
          return;
        }
        start();
      } catch {
        // ignora URLs inválidas
      }
    }

    window.addEventListener(NAV_START_EVENT, handleCustomStart);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener(NAV_START_EVENT, handleCustomStart);
      document.removeEventListener("click", handleDocumentClick, true);
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent print:hidden"
    >
      <div
        className="h-full bg-[#EA1D2C] shadow-[0_0_8px_rgba(234,29,44,0.45)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
