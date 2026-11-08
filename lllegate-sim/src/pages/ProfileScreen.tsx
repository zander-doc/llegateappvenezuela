import { useState } from "react"
import { User, Shield, MapPin, Clock, Settings, LogOut } from "lucide-react"
import { Button } from "../components/ui"
import { useNavSection } from "../lib/navigation"

export function ProfileScreen() {
  useNavSection()
  const [isVerified, setIsVerified] = useState(false)
  const [showKYC, setShowKYC] = useState(false)

  const user = {
    name: "Wilmer Rondón",
    email: "wilmer@leglete.ve",
    phone: "0414-1234567",
    avatar: "WR",
    rating: 4.98,
    trips: 128,
    verified: isVerified,
  }

  return (
    <div className="min-h-screen bg-asphalt-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
            <p className="text-white/60 text-sm">Cuenta verificada y lista para usar</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="https://ui-avatars.com/api?name=Wilmer+Rondón&background=1A1D2E&color=FFD200&size=128&bold=true"
                alt="Wilmer Rondón"
                className="w-20 h-20 rounded-full object-cover border border-white/10"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-racing-500 border border-asphalt-950 border-2"></div>
            </div>
            <div>
              <p className="text-white font-medium">Wilmer Rondón</p>
              <p className="text-white/60 text-sm">wilmer@leglete.ve</p>
            </div>
          </div>
        </header>

        {/* Verified Chip */}
        {user.verified && (
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-racing-500 text-sm" />
            <span className="text-white font-medium">Autenticado</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-asphalt-900 rounded p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider">Carreras completadas</p>
            <p className="text-3xl font-bold text-white">{user.trips}</p>
          </div>
          <div className="bg-asphalt-900 rounded p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider">Calificación</p>
            <p className="text-3xl font-bold text-racing-500">{user.rating}★</p>
          </div>
          <div className="bg-asphalt-900 rounded p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider">Viajes seguros</p>
            <p className="text-3xl font-bold text-white">98%</p>
          </div>
          <div className="bg-asphalt-900 rounded p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider">Puntos favoritos</p>
            <p className="text-3xl font-bold text-white">5</p>
          </div>
        </div>

        {/* Action Menu */}
        <nav className="space-y-2">
          <Button variant="outline" className="w-full text-left">
            <Settings className="mr-2 h-4 w-4" /> Configuración de cuenta
          </Button>
          <Button variant="outline" className="w-full text-left">
            <Clock className="mr-2 h-4 w-4" /> Historial de viajes
          </Button>
          <Button variant="outline" className="w-full text-left">
            <MapPin className="mr-2 h-4 w-4" /> Direcciones favoritas
          </Button>
          <Button
            variant="destructive"
            className="w-full text-left"
            onClick={() => setShowKYC(true)}
          >
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </nav>

        {/* KYC Modal */}
        {showKYC && (
          <div className="fixed inset-0 bg-asphalt-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-asphalt-900 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-white mb-4">Verificación KYC</h3>
              <p className="text-white/60 mb-6">
                Completa tu verificación para acceder a funciones premium
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Cédula de Identidad
                  </label>
                  <input
                    type="text"
                    placeholder="V-12345678"
                    className="w-full rounded bg-asphalt-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-racing-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    placeholder="0414-1234567"
                    className="w-full rounded bg-asphalt-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-racing-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Tipo de documento
                  </label>
                  <select
                    className="w-full rounded bg-asphalt-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-racing-500"
                  >
                    <option>Cédula de Identidad (V/E)</option>
                    <option>Permiso de Enfermedad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    País de emisión
                  </label>
                  <select
                    className="w-full rounded bg-asphalt-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-racing-500"
                  >
                    <option>Venezuela</option>
                    <option>Otros</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowKYC(false)}
                  className="flex-1 rounded bg-asphalt-900 px-4 py-2 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => { setIsVerified(true); setShowKYC(false) }}
                  className="flex-1 rounded bg-racing-500 px-4 py-2 text-asphalt-950 font-medium text-sm hover:bg-yellow-400 transition-colors"
                >
                  Verificar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}