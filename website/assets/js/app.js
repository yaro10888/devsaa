import { html, render, useEffect } from './lib/html.js';
import { sb, CFG } from './lib/sb.js';
import { getState, setState, useAppState } from './lib/store.js';
import { useRoute, navigate } from './lib/router.js';
import { api } from './lib/api.js';
import { startRealtime, stopRealtime } from './lib/realtime.js';
import { ToastHost, DialogHost, LightboxHost, toast } from './ui/overlays.js';
import { AuthView } from './views/auth.js';
import { PendingGate, KickedScreen } from './views/gate.js';
import { Shell } from './views/layout.js';

// ---------------------------------------------------------------- session bootstrap
let loadingFor = null;

async function loadProfile(session) {
  const uid = session?.user?.id;
  if (!uid) {
    stopRealtime();
    setState({ session: null, profile: null, ready: true });
    return;
  }
  if (loadingFor === uid && getState().profile?.id === uid) {
    setState({ session });
    return;
  }
  loadingFor = uid;
  setState({ session });
  try {
    const profile = await api.profile(uid);
    setState({ profile, ready: true });
    startRealtime(profile);
  } catch (e) {
    console.error(e);
    loadingFor = null;
    await sb.auth.signOut();
    setState({ session: null, profile: null, ready: true });
    toast.bad('تعذّر تحميل الحساب', 'سجّل الدخول من جديد.');
  }
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    loadingFor = null;
    stopRealtime();
    setState({ session: null, profile: null, ready: true, gateLeaving: false });
    return;
  }
  if (event === 'TOKEN_REFRESHED') {
    setState({ session });
    return;
  }
  // Defer to avoid running Supabase calls inside the auth callback lock.
  setTimeout(() => loadProfile(session), 0);
});

api.publicSettings().then((settings) => {
  setState({ settings });
  if (settings?.brand_name) document.title = settings.brand_name;
}).catch(() => {});

// Spotlight hover for .spot cards
document.addEventListener('pointermove', (e) => {
  const el = e.target?.closest?.('.spot');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

// ---------------------------------------------------------------- root
function Boot() {
  return html`<div class="boot"><svg class="boot-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 42 14v20L24 44 6 34V14z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 24 42 14M24 24v20M24 24 6 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" opacity=".55"/></svg></div>`;
}

function App() {
  const st = useAppState();
  const route = useRoute();
  const authRoute = route.path === '/login' || route.path === '/signup';

  useEffect(() => {
    if (!st.ready) return;
    if (!st.session && !authRoute) navigate('/login', { replace: true });
    if (st.session && st.profile && !st.authBusy && authRoute) navigate('/', { replace: true });
  }, [st.ready, st.session, st.profile, st.authBusy, authRoute]);

  let view;
  if (!st.ready) view = html`<${Boot} />`;
  else if (!st.session || st.authBusy || (authRoute && !st.profile)) view = html`<${AuthView} mode=${route.path === '/signup' ? 'signup' : 'login'} />`;
  else if (!st.profile) view = html`<${Boot} />`;
  else if (st.profile.status === 'kicked') view = html`<${KickedScreen} profile=${st.profile} />`;
  else {
    const gated = st.profile.status === 'pending' || st.gateLeaving;
    view = html`<${Shell} route=${route} blurred=${st.profile.status === 'pending'} />${gated && html`<${PendingGate} profile=${st.profile} leaving=${st.gateLeaving} />`}`;
  }

  return html`${view}<${ToastHost} /><${DialogHost} /><${LightboxHost} />`;
}

if (CFG.BRAND) document.title = CFG.BRAND;
const root = document.getElementById('app');
root.textContent = '';
render(html`<${App} />`, root);

sb.auth.getSession().then(({ data }) => {
  if (!data.session) setState({ ready: true });
});
