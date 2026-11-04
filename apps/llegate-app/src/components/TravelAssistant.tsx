import { useState } from 'react';
import { Sparkles, ChevronDown, Loader2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useAccount } from './AccountProvider';
import { recommendTravel } from '../lib/recommend.functions';
import { SERVICES, type ServiceId } from '../lib/fare';
export function TravelAssistant({ pickup, onApply }: { pickup: string; onApply: (id: ServiceId, summary: string) => void }) {
  const { profile, update, ready } = useAccount();
  const [open, setOpen] = useState(Boolean(profile.needs));
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy || !ready) return; setBusy(true);
    try {
      const result = await recommendTravel({
        needs: profile.needs,
        pickup,
        destination: 'Las Mercedes, Caracas',
      });
      if (result.recommendation) update({ recommendation: result.recommendation });
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }
  const rec = profile.recommendation;
  const service = SERVICES.find(s => s.id === rec?.service);
  return (
    <div className="border-y border-border py-3">
      <Button variant="ghost" className="h-auto w-full justify-between p-0 text-primary hover:bg-transparent" onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Tu viaje, a tu medida</span><ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && <div className="mt-3 space-y-3">
        <label className="text-sm font-semibold">¿Qué necesitas para tu viaje?</label>
        <Textarea value={profile.needs} maxLength={2000} disabled={busy} placeholder="Ej.: Somos 3 personas, llevamos una maleta y queremos viajar cómodos." onChange={(e: any) => update({ needs: e.target.value, recommendation: null })} />
        <Button className="w-full" disabled={busy || profile.needs.trim().length < 5} onClick={submit}>
          {busy ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {busy ? 'Preparando tu recomendación…' : 'Recomendar servicio'}
        </Button>
        {rec && <div className="space-y-3 border-l-2 border-primary pl-3 text-sm">
          <p className="font-display font-bold text-primary">{service ? service.name : 'Necesitamos más información'}</p>
          <p>{rec.reason}</p>
          <div><p className="mb-1 text-xs text-muted-foreground">Resumen de tu solicitud</p><p>{rec.summary}</p></div>
          {service && !rec.clarification && <Button size="sm" onClick={() => onApply(service.id, rec.summary)}><Check className="h-4 w-4 mr-1" />Elegir {service.name}</Button>}
        </div>}
      </div>}
    </div>
  );
}
