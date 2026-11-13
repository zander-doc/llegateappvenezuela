import { useState } from "react"
import { Clock, LogOut, MapPin, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui"
import { logout } from "../lib/api"
import { useNavSection } from "../lib/navigation"

export function ProfileScreen() {
  useNavSection()
  const navigate = useNavigate()
  const [cerrandoSesion, setCerrandoSesion] = useState(false)

  const user = {
    name: "Wilmer Rondón",
    email: "wilmer@leglete.ve",
    phone: "0414-1234567",
    avatar: "WR",
    rating: 4.98,
    trips: 128,
  }

  async function cerrarSesion() {
    setCerrandoSesion(true)
    try {
      await logout()
      navigate("/ingresar", { replace: true })
    } finally {
      setCerrandoSesion(false)
    }
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
          <div aria-disabled="true" className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-5 text-ink-400">
            <span><Settings className="mr-2 inline h-4 w-4" /> Configuración de cuenta</span>
            <span className="text-xs">Próximamente</span>
          </div>
          <Button to="/historial" variant="outline" className="w-full text-left">
            <Clock className="mr-2 h-4 w-4" /> Historial de viajes
          </Button>
          <div aria-disabled="true" className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-5 text-ink-400">
            <span><MapPin className="mr-2 inline h-4 w-4" /> Direcciones favoritas</span>
            <span className="text-xs">Próximamente</span>
          </div>
          <Button
            variant="destructive"
            className="w-full text-left"
            onClick={cerrarSesion}
            disabled={cerrandoSesion}
          >
            <LogOut className="mr-2 h-4 w-4" /> {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </nav>
      </div>
    </div>
  )
}