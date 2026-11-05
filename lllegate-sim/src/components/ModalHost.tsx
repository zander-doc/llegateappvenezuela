import { useUI } from "../lib/ui";
import { DownloadModal } from "./modals/DownloadModal";
import { BcvModal } from "./modals/BcvModal";
import { FareModal } from "./modals/FareModal";
import { CoverageModal } from "./modals/CoverageModal";
import { DriverWizard } from "./modals/DriverWizard";
import { PlanModal } from "./modals/PlanModal";
import { LeadModal } from "./modals/LeadModal";

export function ModalHost() {
  const { modal, closeModal } = useUI();
  if (!modal) return null;

  switch (modal.type) {
    case "download":
      return <DownloadModal intent={modal.intent} onClose={closeModal} />;
    case "bcv":
      return <BcvModal onClose={closeModal} />;
    case "fare":
      return <FareModal serviceSlug={modal.serviceSlug} onClose={closeModal} />;
    case "coverage":
      return <CoverageModal city={modal.city} onClose={closeModal} />;
    case "driver":
      return <DriverWizard onClose={closeModal} />;
    case "plan":
      return <PlanModal planId={modal.planId} onClose={closeModal} />;
    case "lead":
      return <LeadModal intent={modal.intent} onClose={closeModal} />;
    default:
      return null;
  }
}
