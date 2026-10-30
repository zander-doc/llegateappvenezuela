import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { Layout } from "./components/Layout";
import { UIProvider } from "./lib/ui";
import { HomePage } from "./pages/Home";

const ServiciosPage = lazy(() => import("./pages/Services").then((m) => ({ default: m.ServiciosPage })));
const ServiceDetailPage = lazy(() => import("./pages/Services").then((m) => ({ default: m.ServiceDetailPage })));
const TarifasPage = lazy(() => import("./pages/Tarifas").then((m) => ({ default: m.TarifasPage })));
const CoberturaPage = lazy(() => import("./pages/Cobertura").then((m) => ({ default: m.CoberturaPage })));
const ConductoresPage = lazy(() => import("./pages/Conductores").then((m) => ({ default: m.ConductoresPage })));
const PlanesPage = lazy(() => import("./pages/Conductores").then((m) => ({ default: m.PlanesPage })));
const RegistroPage = lazy(() => import("./pages/Conductores").then((m) => ({ default: m.RegistroPage })));
const ClubVipPage = lazy(() => import("./pages/ClubVip").then((m) => ({ default: m.ClubVipPage })));
const SeguridadPage = lazy(() => import("./pages/Seguridad").then((m) => ({ default: m.SeguridadPage })));
const MercadoPage = lazy(() => import("./pages/Market").then((m) => ({ default: m.MercadoPage })));
const PublicarPage = lazy(() => import("./pages/Market").then((m) => ({ default: m.PublicarPage })));
const VendorDetailPage = lazy(() => import("./pages/Market").then((m) => ({ default: m.VendorDetailPage })));
const AppDemoPage = lazy(() => import("./pages/AppDemo").then((m) => ({ default: m.AppDemoPage })));
const IngresarPage = lazy(() => import("./pages/Ingresar").then((m) => ({ default: m.IngresarPage })));
const CuentaRegistroPage = lazy(() => import("./pages/CuentaRegistro").then((m) => ({ default: m.CuentaRegistroPage })));
const EmpresasPage = lazy(() => import("./pages/Empresas").then((m) => ({ default: m.EmpresasPage })));
const AyudaPage = lazy(() => import("./pages/Ayuda").then((m) => ({ default: m.AyudaPage })));
const AliadosPage = lazy(() => import("./pages/Aliados").then((m) => ({ default: m.AliadosPage })));
const LegalPage = lazy(() => import("./pages/Legal").then((m) => ({ default: m.LegalPage })));
const NotFoundPage = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage })));

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
