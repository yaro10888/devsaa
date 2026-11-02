export const CFG = window.APP_CONFIG || {};

if (!window.supabase?.createClient) {
  throw new Error('Supabase library failed to load');
}

export const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'studio-auth',
  },
  realtime: { params: { eventsPerSecond: 8 } },
});
