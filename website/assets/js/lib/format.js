export const SPECS = [
  { key: 'builder', ar: 'بناء', en: 'Builder', icon: 'cube' },
  { key: 'scripter', ar: 'برمجة', en: 'Scripter', icon: 'code' },
  { key: 'modeler', ar: 'مودلنج', en: 'Modeler', icon: 'shapes' },
  { key: 'ui', ar: 'واجهات UI', en: 'UI Designer', icon: 'layout' },
  { key: 'animator', ar: 'أنيميشن', en: 'Animator', icon: 'film' },
  { key: 'vfx', ar: 'مؤثرات VFX', en: 'VFX Artist', icon: 'flame' },
  { key: 'gfx', ar: 'تصاميم GFX', en: 'GFX Designer', icon: 'image' },
  { key: 'sound', ar: 'صوتيات', en: 'Sound Designer', icon: 'music' },
  { key: 'other', ar: 'أخرى', en: 'Developer', icon: 'dots' },
];
export const specAr = (k) => SPECS.find((s) => s.key === k)?.ar ?? k ?? '—';
export const specIcon = (k) => SPECS.find((s) => s.key === k)?.icon ?? 'cube';

export const CURRENCIES = {
  ROBUX: { ar: 'روبوكس', short: 'R$' },
  EGP: { ar: 'جنيه', short: 'ج.م' },
  SAR: { ar: 'ريال', short: 'ر.س' },
};
export const CURRENCY_KEYS = Object.keys(CURRENCIES);

export const TASK_STATUS = {
  open: { ar: 'متاحة', tone: 'accent' },
  in_progress: { ar: 'قيد التنفيذ', tone: 'info' },
  submitted: { ar: 'قيد المراجعة', tone: 'warn' },
  completed: { ar: 'مكتملة', tone: 'ok' },
  cancelled: { ar: 'ملغاة', tone: '' },
};
export const ACCOUNT_STATUS = {
  pending: { ar: 'بانتظار التفعيل', tone: 'warn' },
  active: { ar: 'مفعّل', tone: 'ok' },
  kicked: { ar: 'موقوف', tone: 'bad' },
};
export const ROLES = { owner: 'المالك', admin: 'مشرف', developer: 'مطوّر' };
export const LEDGER_KIND = {
  task: 'مهمة مكتملة',
  bonus: 'مكافأة',
  manual: 'إضافة يدوية',
  deduction: 'خصم',
  payout: 'صرف',
  reversal: 'استرجاع',
};

const NUM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const num = (n) => NUM.format(Number(n || 0));
export const money = (amount, cur) => `${num(amount)} ${CURRENCIES[cur]?.ar ?? cur ?? ''}`.trim();
export const signed = (amount) => (Number(amount) > 0 ? '+' : Number(amount) < 0 ? '−' : '') + num(Math.abs(Number(amount)));
export const taskNo = (seq) => '#' + String(seq ?? 0).padStart(4, '0');

const DATE = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
const DATETIME = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const REL = new Intl.RelativeTimeFormat('ar-u-nu-latn', { numeric: 'auto' });
export const date = (iso) => (iso ? DATE.format(new Date(iso)) : '—');
export const dateTime = (iso) => (iso ? DATETIME.format(new Date(iso)) : '—');

export function ago(iso, now = Date.now()) {
  if (!iso) return '—';
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'الآن';
  if (abs < 3600) return REL.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return REL.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return REL.format(Math.round(diff / 86400), 'day');
  return date(iso);
}

function plural(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}
// Arabic count phrase: count(3, ['مهمة واحدة','مهمتان','مهام','مهمة']) → "3 مهام"
export function count(n, [one, two, few, many], zero) {
  n = Number(n || 0);
  if (n === 0) return zero ?? `0 ${few}`;
  return plural(n, one, two, few, many);
}

export function duration(mins) {
  if (!mins) return 'بدون مدة';
  if (mins % 1440 === 0) return plural(mins / 1440, 'يوم واحد', 'يومان', 'أيام', 'يوماً');
  if (mins % 60 === 0) return plural(mins / 60, 'ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة');
  return plural(mins, 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة');
}

export function remaining(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now;
  const late = ms < 0;
  const m = Math.floor(Math.abs(ms) / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  let text;
  if (d > 0) text = `${d}ي ${h}س`;
  else if (h > 0) text = `${h}س ${mm}د`;
  else text = `${mm}د`;
  return { late, text, soon: !late && ms < 6 * 3600 * 1000 };
}

export function fileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'سهرة سعيدة';
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'نهارك سعيد';
  return 'مساء الخير';
}

export const initials = (name = '') => name.trim().slice(0, 1).toUpperCase() || '?';

export function safeName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^A-Za-z0-9]/g, '').slice(0, 10) : '';
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file';
  return ext ? `${base}.${ext}` : base;
}
