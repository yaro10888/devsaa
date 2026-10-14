import { sb } from './sb.js';
import { getState, setState, invalidate, isAdmin } from './store.js';
import { api } from './api.js';
import { toast } from '../ui/overlays.js';
import { money, taskNo } from './format.js';

let channel = null;

export function stopRealtime() {
  if (channel) sb.removeChannel(channel);
  channel = null;
}

async function onProfile(payload) {
  const me = getState().profile;
  if (!me) return;
  const row = payload.new ?? {};
  if (row.id !== me.id) {
    invalidate('profiles');
    if (payload.eventType === 'INSERT' && isAdmin(me)) toast.info('طلب انضمام جديد', `${row.display_name} بانتظار التفعيل`);
    return;
  }
  let fresh = { ...me, ...row };
  if (row.rank_id !== me.rank_id) {
    try { fresh = await api.profile(me.id); } catch { /* keep partial */ }
  } else {
    fresh.rank = me.rank;
  }
  const wasPending = me.status === 'pending';
  if (wasPending && fresh.status === 'active') {
    setState({ profile: fresh, gateLeaving: true });
    setTimeout(() => setState({ gateLeaving: false }), 2300);
    return;
  }
  setState({ profile: fresh });
  invalidate('profiles', 'overview');
}

export function startRealtime(profile) {
  stopRealtime();
  const uid = profile.id;
  const staff = isAdmin(profile);

  channel = sb.channel(`live:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onProfile)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (p) => {
      invalidate('tasks', 'overview');
      const t = p.new ?? {};
      if (p.eventType === 'INSERT' && t.assignee_id === uid) toast.info('مهمة جديدة لك', `${taskNo(t.seq)} — ${t.title}`);
      else if (p.eventType === 'INSERT' && t.scope === 'general' && !staff) toast.info('مهمة عامة جديدة', t.title);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (p) => {
      invalidate('submissions', 'tasks', 'overview');
      const s = p.new ?? {};
      if (p.eventType === 'UPDATE' && s.developer_id === uid && s.status === 'approved') toast.ok('تم قبول تسليمك', 'أُضيفت المكافأة إلى مستحقاتك.');
      if (p.eventType === 'UPDATE' && s.developer_id === uid && s.status === 'rejected') toast.warn('التسليم يحتاج تعديل', s.review_note ?? '');
      if (p.eventType === 'INSERT' && staff && s.developer_id !== uid) toast.info('تسليم جديد', 'بانتظار المراجعة');
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'warnings' }, (p) => {
      invalidate('warnings', 'overview', 'ledger');
      const w = p.new ?? {};
      if (p.eventType === 'INSERT' && w.developer_id === uid) {
        (w.kind === 'warning' ? toast.bad : toast.warn)(w.kind === 'warning' ? 'وصلك تحذير' : 'وصلك تنبيه', w.reason);
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ledger_entries' }, (p) => {
      invalidate('ledger', 'overview');
      const e = p.new ?? {};
      if (e.developer_id === uid && (e.kind === 'bonus' || e.kind === 'manual')) toast.ok('أُضيف إلى مستحقاتك', money(e.amount, e.currency));
      if (e.developer_id === uid && e.kind === 'payout') toast.ok('تم صرف مستحقاتك', money(Math.abs(e.amount), e.currency));
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => invalidate('activity'));

  if (staff) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'bot_jobs' }, () => invalidate('jobs'));
  }
  channel.subscribe();
}
