import { useLocation } from "react-router-dom";

export type NavigatorSection = "home" | "wallet" | "history" | "profile";

export function useNavSection(): { section: NavigatorSection; path: string } {
  const location = useLocation();

  const sectionMap: Record<string, { section: NavigatorSection; path: string }> = {
    "/": { section: "home", path: "/" },
    "/billetera": { section: "wallet", path: "/billetera" },
    "/historial": { section: "history", path: "/historial" },
    "/perfil": { section: "profile", path: "/perfil" },
  };

  return sectionMap[location.pathname] ?? sectionMap["/"];
}
