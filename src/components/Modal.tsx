import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";

export function Modal({
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  eyebrow,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  eyebrow?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add("modal-open");
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 40);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [onClose]);

  const sizes = {
    sm: "sm:max-w-[440px]",
    md: "sm:max-w-[560px]",
    lg: "sm:max-w-[720px]",
    xl: "sm:max-w-[920px]",
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.9 }}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] border border-asphalt-700 bg-asphalt-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] sm:max-h-[88dvh] sm:rounded-2xl ${sizes[size]}`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 border-b border-asphalt-800 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div>
            {eyebrow && (
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-400">{eyebrow}</p>
            )}
            <h2 id={titleId} className="heading text-[21px] font-bold text-white sm:text-[23px]">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-asphalt-700 text-ink-300 transition hover:border-brand-500/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
