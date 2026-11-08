import { useState } from "react"
import { Wallet } from "lucide-react"
import { Button } from "../components/ui"
import { usePilotWallet } from "../lib/pilotWallet"
import { DEMO_BCV_RATE, formatBs, formatUSD } from "../lib/format"
import { useNavSection } from "../lib/navigation"

export function WalletScreen() {
  useNavSection()
  const wallet = usePilotWallet()
  const [activeTab, setActiveTab] = useState<"pm" | "zelle" | "c2p">("pm")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [copied, setCopied] = useState(false)

  const balanceUSD = wallet.balance
  const balanceBs = balanceUSD * DEMO_BCV_RATE

  /* --- Tabs UI --- */
  const tabButtons = (
    <div className="flex bg-asphalt-900 rounded border border-white/10 mb-6">
      <button
        onClick={() => setActiveTab("pm")}
        className={`py-3 px-4 text-sm font-medium ${
          activeTab === "pm"
            ? "text-racing-500 border-b-2 border-racing-500"
            : "text-white/70 border-b-2 transparent"
        }`}
      >
        Pago Móvil
      </button>
      <button
        onClick={() => setActiveTab("zelle")}
        className={`py-3 px-4 text-sm font-medium ${
          activeTab === "zelle"
            ? "text-racing-500 border-b-2 border-racing-500"
            : "text-white/70 border-b-2 transparent"
        }`}
      >
        Zelle
      </button>
      <button
        onClick={() => setActiveTab("c2p")}
        className={`py-3 px-4 text-sm font-medium ${
          activeTab === "c2p"
            ? "text-racing-500 border-b-2 border-racing-500"
            : "text-white/70 border-b-2 transparent"
        }`}
      >
        Débito C2P
      </button>
    </div>
  )

  /* --- Content per tab --- */
  const pmContent = (
    <section key="pm" className="space-y-4">
      <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Pago Móvil</h3>
      <p className="text-sm text-white/50">Disponible en bancos participantes</p>
    </section>
  )

  const zelleContent = (
    <section key="zelle" className="space-y-4">
      <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Zelle</h3>
      <p className="text-sm text-white/50">Correo oficial para conciliación</p>
    </section>
  )

  const c2pContent = (
    <section key="c2p" className="space-y-4">
      <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider">Débito Inmediato / C2P</h3>
      <p className="text-sm text-white/50">Transferencia bancaria inmediata</p>
    </section>
  )

  /* --- Manejadores --- */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleRecharge = () => {
    const amt = parseFloat(amount)
    if (!isNaN(amt) && amt > 0) {
      wallet.requestRecharge(amt)
      setAmount("")
      setReference("")
    }
  }

  return (
    <div className="min-h-screen bg-asphalt-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Billetera Llégate</h2>
            <p className="text-white/60 text-sm">Saldo disponible</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-racing-500">
              {formatUSD(balanceUSD)} $
            </span>
            <span className="text-white/60 text-sm"> / {formatBs(balanceBs)} Bs</span>
          </div>
        </header>

        <div className="flex items-center justify-between mb-6">
          {tabButtons}
        </div>

        <div className="space-y-4">
          {activeTab === "pm" && pmContent}
          {activeTab === "zelle" && zelleContent}
          {activeTab === "c2p" && c2pContent}
        </div>
      </div>
    </div>
  )
}