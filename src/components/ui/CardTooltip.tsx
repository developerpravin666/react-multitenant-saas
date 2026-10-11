import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface CardTooltipProps {
  detail: ReactNode;
  children: ReactNode;
}

interface TooltipPosition {
  left: number;
  top: number;
  above: boolean;
}

const tooltipWidth = 288;

export function CardTooltip({ detail, children }: CardTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - tooltipWidth - margin));
    const above = rect.bottom + 190 > window.innerHeight && rect.top > 190;
    setPosition({ left, top: above ? rect.top - 8 : rect.bottom + 8, above });
  }, []);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    updatePosition();
    setOpen(true);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const reposition = () => updatePosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
        className="inline-block max-w-full rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-ring)]"
      >
        {children}
      </div>
      {open && position
        ? createPortal(
          <div
            id={id}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              transform: position.above ? "translateY(-100%)" : undefined,
              width: `min(${tooltipWidth}px, calc(100vw - 24px))`,
            }}
            className="pointer-events-auto z-[200] rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-xl shadow-slate-950/15 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/5"
          >
              <div className="max-h-40 overflow-y-auto break-words whitespace-pre-wrap text-sm leading-5 text-slate-800 dark:text-slate-100">
              {detail}
            </div>
            <span
              aria-hidden
              className={`absolute left-4 size-2 rotate-45 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${position.above ? "-bottom-1 border-b border-r" : "-top-1 border-l border-t"}`}
            />
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
