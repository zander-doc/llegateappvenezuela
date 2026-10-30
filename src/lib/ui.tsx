import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ModalState =
  | { type: "download"; intent?: "download" | "signin" }
  | { type: "bcv" }
  | { type: "driver" }
  | { type: "plan"; planId: string }
  | { type: "vendor"; vendorSlug: string }
  | { type: "fare"; serviceSlug?: string }
  | { type: "coverage"; city?: string }
  | { type: "lead"; intent: "empresa" | "aliado" | "contacto" }
  | { type: "publish" }
  | null;

export interface Toast {
  id: number;
  message: string;
  tone: "success" | "info";
}

interface UIContextValue {
  modal: ModalState;
  openModal: (modal: NonNullable<ModalState>) => void;
  closeModal: () => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

let toastId = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const closeModal = useCallback(() => setModal(null), []);

  const openModal = useCallback((next: NonNullable<ModalState>) => {
    setModal(next);
  }, []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId;
    setToasts((list) => [...list, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(
    () => ({ modal, openModal, closeModal, toasts, notify }),
    [modal, openModal, closeModal, toasts, notify]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: "smooth" });
}
