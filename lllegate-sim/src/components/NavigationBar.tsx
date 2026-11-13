import { Link, useLocation } from "react-router-dom";
import { Home, Wallet, History, User } from "lucide-react";
import { useNavSection } from "../lib/navigation";

const tabs = [
  { path: "/", label: "Inicio" },
  { path: "/billetera", label: "Billetera" },
  { path: "/historial", label: "Historial" },
  { path: "/perfil", label: "Perfil" },
] as const;

const icons: Record<(typeof tabs)[number]["path"], typeof Home> = {
  "/": Home,
  "/billetera": Wallet,
  "/historial": History,
  "/perfil": User,
};

export function NavigationBar() {
  const location = useLocation();
  const { section } = useNavSection();

  return (
    <nav
      className="flex shrink-0 border-t border-white/10 bg-ink-950/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ path, label }) => {
        const active = location.pathname === path;
        const Icon = icons[path];
        return (
          <Link
            key={path}
            to={path}
            className={`
              flex flex-1 flex-col items-center gap-1 py-3 transition
              ${
                section === "home" && path === "/"
                  ? "text-racing-500"
                  : "text-ink-500 hover:text-ink-300"
              }
            `}
          >
            <Icon className="h-5 w-5" />
            <span
              className={`
                text-[11px] font-bold uppercase tracking-[0.12em] transition
                ${active ? "text-racing-500" : "text-ink-400"}
              `}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
