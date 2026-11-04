import { Modal } from "../Modal";
import { FareEstimator } from "../FareEstimator";
import { useUI } from "../../lib/ui";

export function FareModal({ serviceSlug, onClose }: { serviceSlug?: string; onClose: () => void }) {
  const { openModal } = useUI();

  return (
    <Modal
      onClose={onClose}
      title="Calcula tu viaje"
      subtitle="Elige el servicio y ajusta la distancia para ver el precio en dólares y bolívares."
      eyebrow="Tarifas"
      size="lg"
    >
      <FareEstimator
        initialService={serviceSlug}
        compact
        primaryLabel="Quiero pedirlo"
        onPrimary={() => openModal({ type: "download" })}
      />
    </Modal>
  );
}
