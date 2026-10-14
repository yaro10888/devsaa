import { sb, CFG } from './sb.js';
import { AppError } from './errors.js';
import { safeName } from './format.js';

const unwrap = async (promise) => {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
};
const rpc = (fn, args) => unwrap(sb.rpc(fn, args));

// ---------------------------------------------------------------- bot (Edge Function)
export async function callBot(action, payload = {}) {
  const { data, error } = await sb.functions.invoke(CFG.FUNCTION_NAME, { body: { action, ...payload } });
  if (error) {
    let code = 'SERVER_ERROR';
    const res = error.context;
    if (error.name === 'FunctionsFetchError') code = 'NETWORK';
    if (res && typeof res.json === 'function') {
      if (res.status === 404) code = 'FUNCTION_MISSING';
      try {
        const body = await res.json();
        if (body?.error) code = body.error;
      } catch { /* not json */ }
    }
    throw new AppError(code);
  }
  if (data && data.ok === false) throw new AppError(data.error, data);
  return data;
}

// ---------------------------------------------------------------- shared
export const api = {
  publicSettings: () => rpc('get_public_settings'),
  profile: (id) => unwrap(sb.from('profiles').select('*, rank:ranks(*)').eq('id', id).single()),
  overview: () => rpc('my_overview'),

  myTasks: (uid) => unwrap(sb.from('tasks').select('*').eq('assignee_id', uid).order('created_at', { ascending: false }).limit(200)),
  openTasks: () => unwrap(sb.from('tasks').select('*').eq('scope', 'general').eq('status', 'open').order('created_at', { ascending: false })),
  task: (id) => unwrap(sb.from('tasks').select('*').eq('id', id).single()),
  taskSubmissions: (taskId) => unwrap(sb.from('submissions').select('*').eq('task_id', taskId).order('created_at', { ascending: false })),
  myWarnings: (uid) => unwrap(sb.from('warnings').select('*').eq('developer_id', uid).order('created_at', { ascending: false })),
  myLedger: (uid) => unwrap(sb.from('ledger_entries').select('*').eq('developer_id', uid).order('created_at', { ascending: false }).limit(300)),
  myActivity: (uid, limit = 60) => unwrap(sb.from('activity_log').select('*').eq('target_id', uid).order('created_at', { ascending: false }).limit(limit)),
  ranks: () => unwrap(sb.from('ranks').select('*').order('position', { ascending: false }).order('name')),
  tasksByIds: (ids) => (ids?.length ? unwrap(sb.from('tasks').select('id, seq, title').in('id', ids)) : Promise.resolve([])),

  claim: (taskId) => rpc('claim_task', { p_task: taskId }),
  submit: (taskId, files, note) => rpc('submit_task', { p_task: taskId, p_files: files, p_note: note || null }),
  changePassword: (password) => unwrap(sb.auth.updateUser({ password })),

  async imageUrls(paths, bucket = 'task-images') {
    if (!paths?.length) return [];
    const data = await unwrap(sb.storage.from(bucket).createSignedUrls(paths, 3600));
    return data.map((d) => d.signedUrl).filter(Boolean);
  },
  async fileUrl(path, name) {
    const data = await unwrap(sb.storage.from('submissions').createSignedUrl(path, 600, { download: name || true }));
    return data.signedUrl;
  },
};

// Upload with progress (XHR) straight to Supabase Storage.
export async function uploadFile(bucket, path, file, onProgress) {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AppError('UNAUTHORIZED');
  const url = `${CFG.SUPABASE_URL}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', CFG.SUPABASE_KEY);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let code = 'UPLOAD_FAILED';
      if (xhr.status === 413 || /maximum allowed size|too large/i.test(xhr.responseText)) code = 'FILE_TOO_BIG';
      reject(new AppError(code));
    };
    xhr.onerror = () => reject(new AppError('NETWORK'));
    xhr.send(file);
  });
  return path;
}

export function submissionPath(uid, taskId, file, i) {
  return `${uid}/${taskId}/${Date.now()}-${i}-${safeName(file.name)}`;
}

// ---------------------------------------------------------------- admin
export const admin = {
  dashboard: () => rpc('admin_dashboard'),
  settings: () => unwrap(sb.from('app_settings').select('*').eq('id', 1).single()),
  saveSettings: (patch) => rpc('admin_update_settings', { p: patch }),

  profiles: () => unwrap(sb.from('profiles').select('*, rank:ranks(*)').order('created_at', { ascending: false })),
  activeDevelopers: () => unwrap(sb.from('profiles').select('id, display_name, specialization, discord_avatar, role').eq('status', 'active').order('display_name')),
  balances: () => unwrap(sb.from('balances').select('*')),
  devBalances: (uid) => unwrap(sb.from('balances').select('*').eq('developer_id', uid)),
  devTasks: (uid) => unwrap(sb.from('tasks').select('*').eq('assignee_id', uid).order('created_at', { ascending: false })),
  devWarnings: (uid) => unwrap(sb.from('warnings').select('*').eq('developer_id', uid).order('created_at', { ascending: false })),
  devLedger: (uid) => unwrap(sb.from('ledger_entries').select('*').eq('developer_id', uid).order('created_at', { ascending: false }).limit(200)),
  devActivity: (uid) => unwrap(sb.from('activity_log').select('*').eq('target_id', uid).order('created_at', { ascending: false }).limit(100)),

  tasks: () => unwrap(sb.from('tasks').select('*').order('created_at', { ascending: false }).limit(500)),
  pendingSubmissions: () => unwrap(sb.from('submissions').select('*, task:tasks(id, seq, title, price_amount, price_currency), developer:profiles!submissions_developer_id_fkey(id, display_name, discord_avatar)').eq('status', 'pending').order('created_at')),
  warnings: () => unwrap(sb.from('warnings').select('*, developer:profiles!warnings_developer_id_fkey(id, display_name, discord_avatar)').order('created_at', { ascending: false }).limit(300)),
  ledger: () => unwrap(sb.from('ledger_entries').select('*, developer:profiles!ledger_entries_developer_id_fkey(id, display_name)').order('created_at', { ascending: false }).limit(100)),
  activity: (limit = 150) => unwrap(sb.from('activity_log').select('*, actor:profiles!activity_log_actor_id_fkey(id, display_name), target:profiles!activity_log_target_id_fkey(id, display_name)').order('created_at', { ascending: false }).limit(limit)),
  jobs: () => unwrap(sb.from('bot_jobs').select('*').order('id', { ascending: false }).limit(150)),

  activate: (id) => rpc('admin_activate_account', { p_user: id }),
  kick: (id, reason, removeChannels, kickDiscord) => rpc('admin_kick_account', { p_user: id, p_reason: reason, p_remove_channels: removeChannels, p_kick_discord: kickDiscord }),
  updateProfile: (id, f) => rpc('admin_update_profile', {
    p_user: id, p_display_name: f.display_name, p_age: f.age === '' || f.age == null ? null : Number(f.age),
    p_specialization: f.specialization, p_roblox_username: f.roblox_username || null, p_discord_username: f.discord_username || null,
  }),
  setRole: (id, role) => rpc('admin_set_role', { p_user: id, p_role: role }),
  setRank: (id, rank) => rpc('admin_set_rank', { p_user: id, p_rank: rank || null }),
  saveRank: (r) => rpc('admin_save_rank', { p_id: r.id || null, p_name: r.name, p_color: r.color, p_discord_role_id: r.discord_role_id || null, p_position: Number(r.position || 0) }),
  deleteRank: (id) => rpc('admin_delete_rank', { p_id: id }),
  createTask: (t) => rpc('admin_create_task', {
    p_title: t.title, p_type: t.task_type, p_description: t.description, p_price: Number(t.price || 0), p_currency: t.currency,
    p_duration_minutes: t.duration_minutes, p_images: t.images, p_scope: t.scope, p_assignee: t.assignee || null,
  }),
  cancelTask: (id, reason) => rpc('admin_cancel_task', { p_task: id, p_reason: reason || null }),
  review: (id, decision, note) => rpc('admin_review_submission', { p_submission: id, p_decision: decision, p_note: note || null }),
  warn: (w) => rpc('admin_issue_warning', { p_user: w.developer_id, p_kind: w.kind, p_reason: w.reason, p_task_ids: w.task_ids || [], p_deduction_pct: Number(w.pct || 0) }),
  revokeWarning: (id, reason) => rpc('admin_revoke_warning', { p_warning: id, p_reason: reason || null }),
  addLedger: (id, amount, currency, kind, note) => rpc('admin_add_ledger', { p_user: id, p_amount: Number(amount), p_currency: currency, p_kind: kind, p_note: note || null }),
  payout: (id, currency, note) => rpc('admin_payout', { p_user: id, p_currency: currency, p_note: note || null }),
  retryJob: (id) => rpc('admin_retry_job', { p_job: id }),
  repairChannels: (id) => rpc('admin_repair_channels', { p_user: id }),

  bot: (op, extra = {}) => callBot('admin', { op, ...extra }),
  kickWorker: () => callBot('admin', { op: 'kick_worker' }).catch(() => null),
};
