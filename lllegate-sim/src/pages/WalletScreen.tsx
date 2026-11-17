import { Link } from "react-router-dom";
import { RealWallet } from "../components/RealWallet";
import { loadSession, realAuthEnabled } from "../lib/api";
import { useNavSection } from "../lib/navigation";

// Billetera real: saldo y recargas salen de la API (la misma base que la app).
export function WalletScreen() {
  useNavSection();
  const conSesion = realAuthEnabled && loadSession() !== null;

  return (
    <div className="min-h-screen bg-asphalt-950 p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-white">Billetera Llégate</h2>
        {conSesion ? (
          <RealWallet />
        ) : (
          <div className="mt-4 rounded-2xl border border-asphalt-800 bg-asphalt-900/70 p-5 text-[14px] leading-relaxed text-ink-300">
            <p>
              {realAuthEnabled
                ? "Entra a tu cuenta para ver tu saldo y recargar. La billetera es la misma en la web y en la app."
                : "La billetera real se activa cuando el sitio está conectado a la API de Llégate."}
            </p>
            {realAuthEnabled && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/ingresar" className="font-semibold text-brand-400 hover:text-brand-300">
                  Ingresar
                </Link>
                <Link to="/registro" className="font-semibold text-brand-400 hover:text-brand-300">
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
