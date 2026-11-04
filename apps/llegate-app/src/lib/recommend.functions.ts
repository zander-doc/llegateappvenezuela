export const recommendTravel = async (data: any) => {
  const parsed = {
    needs: String(data.needs || '').trim(),
    pickup: String(data.pickup || ''),
    destination: String(data.destination || ''),
  };
  if (parsed.needs.length < 5) throw new Error('needs must be at least 5 chars');
  const isTaxi =
    parsed.needs.toLowerCase().includes('maleta') ||
    parsed.needs.toLowerCase().includes('tres') ||
    parsed.needs.toLowerCase().includes('3');
  return {
    recommendation: {
      service: isTaxi ? 'taxi' : 'moto',
      reason: isTaxi
        ? 'Detectamos que viajan varias personas o con equipaje.'
        : 'La forma más rápida y económica para 1 persona.',
      summary: `Viaje en ${isTaxi ? 'Taxi Pana' : 'Mototaxi'} desde ${parsed.pickup} hasta ${parsed.destination}.`,
      clarification: null,
    },
  };
};
