import { useState } from "react";
import { ArrowRight, Bike, Car, Truck, Users, Clock } from "lucide-react";
import { Button, ServiceIcon } from "./ui";
import { formatBs } from "../lib/format";
import type { Service } from "../data/services";
import { LAUNCH_SERVICES } from "../data/services";

type Tab = "carro" | "moto" | "envios";

const tabLabels: Record<Tab, string> = {
  carro: "Carro",
  moto: "Moto",
  envios: "Envíos",
};

const tabIcons: Record<Tab, any> = {
  carro: Car,
  moto: Bike,
  envios: Truck,
};

const tabServices: Record<Tab, Service[]> = {
  carro: LAUNCH_SERVICES.filter((s) => s.icon === "car"),
  moto: LAUNCH_SERVICES.filter((s) => s.icon === "bike"),
  envios: LAUNCH_SERVICES.filter((s) => s.icon === "package" || s.icon === "truck"),
};

export function VehicleSelectionSheet({ onSelect }: { onSelect: (service: Service | null) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("carro");

  const services = tabServices[activeTab];
  const Icon = tabIcons[activeTab];

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
        {Object.keys(tabLabels).map((tab) => {
          const active = activeTab === tab;
          const TabIcon = tabIcons[tab as Tab];
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as Tab)}
              className={`flex h-12 shrink-0 items-center justify-center border-b-2 px-4 text-sm font-bold transition ${active ? "border-racing-500 text-white" : "border-transparent text-ink-500 hover:text-white hover:bg-white/5"}`}
            >
              <TabIcon className="h-4 w-4 mr-2" />
              {tabLabels[tab as Tab]}
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
              <VehicleCard key={service.slug} service={service} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface VehicleCardProps {
  service: Service;
  onSelect: (service: Service) => void;
}

function VehicleCard({ service, onSelect }: VehicleCardProps) {
  const rateUSD = service.minFareUSD;

  return (
    <div
      className="card card-hover group relative flex flex-col overflow-hidden border border-white/10 bg-asphalt-900/80 rounded-2xl p-5"
      onClick={() => onSelect(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(service)}
    >

      <div className="relative flex items-start justify-between mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
          <ServiceIcon icon={service.icon as any} className="h-6 w-6" />
        </div>
        <span className="mono text-[11px] font-medium text-ink-600">0{service.routes.length}</span>
      </div>

      <h3 className="heading relative mt-0 mb-1.5 text-[20px] font-bold text-white">{service.name}</h3>
      <p className="relative mb-4 text-[13.5px] leading-snug text-ink-300">{service.short}</p>

      <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {service.eta}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {service.capacity}
        </span>
      </div>

      <div className="relative mt-4 border-t border-white/8 pt-4">
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-white">${rateUSD.toFixed(2)}</span>
          <span className="text-[13px] font-semibold text-ink-400">USD</span>
        </div>
        <p className="text-[12px] font-medium text-racing-500">{formatBs(rateUSD, 887.3)}</p>
      </div>

      <div className="mt-auto flex items-end justify-between border-t border-white/8 pt-4">
        <Button variant="yellow" size="sm" full>
          Solicitar <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
