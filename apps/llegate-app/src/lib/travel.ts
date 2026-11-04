import { z } from 'zod';
export const recommendationSchema = z.object({ service: z.enum(['moto', 'taxi', 'delivery']).nullable(), reason: z.string(), summary: z.string(), clarification: z.string().nullable() }).strict();
export type Recommendation = z.infer<typeof recommendationSchema>;
export const profileSchema = z.object({ display_name: z.string().max(80), mode: z.enum(['pasajero', 'piloto']), service: z.enum(['moto', 'taxi', 'delivery']), meeting: z.string().max(100), payment: z.enum(['pm', 'usd']), needs: z.string().max(2000), request_summary: z.string().max(4000), recommendation: recommendationSchema.nullable() });
export type TravelProfile = z.infer<typeof profileSchema>;
export const emptyProfile: TravelProfile = { display_name: '', mode: 'pasajero', service: 'moto', meeting: '', payment: 'pm', needs: '', request_summary: '', recommendation: null };
