export async function requireSupabaseAuth({ context }: any) {
  return { ...context, userId: 'demo-user-123' };
}
