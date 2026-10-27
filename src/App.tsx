import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Layout } from "./components/Layout";
import { UIProvider } from "./lib/ui";
import { HomePage } from "./pages/Home";
import { ServiceDetailPage, ServiciosPage } from "./pages/Services";
import { TarifasPage } from "./pages/Tarifas";
import { CoberturaPage } from "./pages/Cobertura";
import { ConductoresPage, PlanesPage, RegistroPage } from "./pages/Conductores";
import { ClubVipPage } from "./pages/ClubVip";
import { SeguridadPage } from "./pages/Seguridad";
import { MercadoPage, PublicarPage, VendorDetailPage } from "./pages/Market";
import { AppDemoPage } from "./pages/AppDemo";
import { IngresarPage } from "./pages/Ingresar";
import { CuentaRegistroPage } from "./pages/CuentaRegistro";
import { EmpresasPage } from "./pages/Empresas";
import { AyudaPage } from "./pages/Ayuda";
import { AliadosPage } from "./pages/Aliados";
import { LegalPage } from "./pages/Legal";
import { NotFoundPage } from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <UIProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/servicios" element={<ServiciosPage />} />
              <Route path="/servicios/:slug" element={<ServiceDetailPage />} />
              <Route path="/tarifas" element={<TarifasPage />} />
              <Route path="/cobertura" element={<CoberturaPage />} />
              <Route path="/conductores" element={<ConductoresPage />} />
              <Route path="/conductores/planes" element={<PlanesPage />} />
              <Route path="/conductores/registro" element={<RegistroPage />} />
              <Route path="/pasajeros/club-vip" element={<ClubVipPage />} />
              <Route path="/seguridad" element={<SeguridadPage />} />
              <Route path="/mercado" element={<MercadoPage />} />
              <Route path="/mercado/negocio/:slug" element={<VendorDetailPage />} />
              <Route path="/mercado/publicar" element={<PublicarPage />} />
              <Route path="/app" element={<AppDemoPage />} />
              <Route path="/ingresar" element={<IngresarPage />} />
              <Route path="/registro" element={<CuentaRegistroPage />} />
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/ayuda" element={<AyudaPage />} />
              <Route path="/nosotros/aliados" element={<AliadosPage />} />
              <Route path="/legal/:doc" element={<LegalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </UIProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
