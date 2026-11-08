import { Link } from "react-router-dom";
import { Plus, Wallet } from "lucide-react";
import { Button, Money } from "./ui";

export function WalletQuickCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-asphalt-900/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-400">Saldo disponible</p>
            <p className="text-lg font-bold text-white truncate">
              <Money usd={12.5} size="lg" showBoth={true} />
            </p>
          </div>
        </div>
        <Link to="/billetera">
          <Button variant="yellow" size="sm">
            <Plus className="h-4 w-4" /> Recargar
          </Button>
        </Link>
      </div>
    </div>
  );
}
