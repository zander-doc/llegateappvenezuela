import { useState } from "react";
import { ArrowRight, Bike, Car, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ServiceIcon } from "./ui";
import { formatBs } from "../lib/format";
import type { Service } from "../data/services";
import { LAUNCH_SERVICES } from "../data/services";

type Tab = "carro" | "moto" | "envios";

const tabLabels: Record<Tab, string> = {
  carro: "Carro",
  moto: "Moto",
  envios: "Envíos",
};

const tabIcons: Record<Tab, LucideIcon> = {
  carro: Car,
  moto: Bike,
  envios: Truck,
};

const tabServices: Record<Tab, Service[]> = {
  carro: LAUNCH_SERVICES.filter((s) => s.icon === "car"),
  moto: LAUNCH_SERVICES.filter((s) => s.icon === "bike"),
  envios: LAUNCH_SERVICES.filter((s) => s.icon === "package" || s.icon === "truck"),
};

const tabAccent: Record<
  Tab,
  {
    tab: string;
    selectedCard: string;
    selectedIcon: string;
    idleIcon: string;
  }
> = {
  carro: {
    tab: "border-racing-500",
    selectedCard: "border-2 border-racing-500 bg-racing-50/50 shadow-lg shadow-racing-500/15",
    selectedIcon: "bg-racing-500 text-asphalt-950",
    idleIcon: "bg-racing-500/10 text-racing-600 border border-racing-500/20",
  },
  moto: {
    tab: "border-emerald-500",
    selectedCard: "border-2 border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/15",
    selectedIcon: "bg-emerald-500 text-asphalt-950",
    idleIcon: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  },
  envios: {
    tab: "border-brand-500",
    selectedCard: "border-2 border-brand-500 bg-brand-50/50 shadow-lg shadow-brand-500/15",
    selectedIcon: "bg-brand-500 text-asphalt-950",
    idleIcon: "bg-brand-500/10 text-brand-600 border border-brand-500/20",
  },
};

const tabs: Tab[] = ["carro", "moto", "envios"];

export function VehicleSelectionSheet({ onSelect }: { onSelect: (service: Service | null) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("moto");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const services = tabServices[activeTab];
  const Icon = tabIcons[activeTab];
  const accent = tabAccent[activeTab];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-asphalt-950">

      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-300 hover:bg-white/8 hover:text-white transition"
        >
          <ArrowRight className="h-5 w-5 rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-white">Selecciona tu vehículo</h2>
        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-asphalt-900/50">
        <div className="flex px-6">
        {tabs.map((tab) => {
          const active = activeTab === tab;
          const TabIcon = tabIcons[tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSelectedService(null);
              }}
              className={`flex h-12 shrink-0 items-center justify-center border-b-2 px-4 text-sm font-bold transition ${active ? `${tabAccent[tab].tab} text-white` : "border-transparent text-ink-500 hover:text-white hover:bg-white/5"}`}
            >
              <TabIcon className="h-4 w-4 mr-2" />
              {tabLabels[tab]}
            </button>
          );
        })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-400 mb-4">
              <Icon className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Próximamente</h3>
            <p className="mt-2 text-[14px] text-ink-400">
              Esta categoría estará disponible en la próxima fase.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <VehicleCard
                key={service.slug}
                service={service}
                accent={accent}
                isSelected={selectedService?.slug === service.slug}
                onSelect={() => {
                  setSelectedService(service);
                  onSelect(service);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type VehicleAccent = (typeof tabAccent)[Tab];

interface VehicleCardProps {
  service: Service;
  accent: VehicleAccent;
  isSelected: boolean;
  onSelect: (service: Service) => void;
}

function VehicleCard({ service, accent, isSelected, onSelect }: VehicleCardProps) {
  const rateUSD = service.minFareUSD;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={`w-full text-left cursor-pointer transition-all duration-200 rounded-2xl p-4 flex items-center justify-between group ${
        isSelected
          ? accent.selectedCard
          : "border border-white/10 bg-asphalt-900/80 hover:border-white/20 hover:bg-asphalt-850/80"
      }`}
      onClick={() => onSelect(service)}
    >
      {/* Lado izquierdo: icono e información */}
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isSelected ? accent.selectedIcon : accent.idleIcon
          }`}
        >
          <ServiceIcon icon={service.icon} className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h4 className={`font-bold ${isSelected ? "text-white" : "text-ink-100"}`}>{service.name}</h4>
          <p className={`text-xs ${isSelected ? "text-ink-400" : "text-ink-500"}`}>{service.eta}</p>
        </div>
      </div>

      {/* Lado derecho: precio destacado */}
      <div className="text-right">
        <span className={`font-extrabold ${isSelected ? "text-white" : "text-ink-900"}`}>
          {formatBs(rateUSD, 887.3)}
        </span>
        <p className={`text-xs ${isSelected ? "text-ink-400" : "text-ink-500"}`}>USD {rateUSD.toFixed(2)}</p>
      </div>
    </button>
  );
}
