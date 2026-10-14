import { html, useState, useEffect } from '../../lib/html.js';
import { useQuery, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { errorText } from '../../lib/errors.js';
import { SPECS, CURRENCIES, CURRENCY_KEYS, money, num, taskNo, specAr } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Modal, Button, Field, Input, Select, Textarea, Seg, Switch, Avatar, Skeleton } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { balancesFrom } from '../../ui/domain.js';

export function canManage(me, target) {
  if (!me || !target) return false;
  if (target.role === 'owner') return me.id === target.id;
  if (target.role === 'admin') return me.role === 'owner' || me.id === target.id;
  return true;
}

function useAction(fn, { success, onDone, keys = [] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (...args) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn(...args);
      if (success) toast.ok(success);
      invalidate(...keys);
      admin.kickWorker();
      onDone?.(res);
      return res;
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

const ErrorLine = ({ error }) => error && html`<div class="error-text"><${Icon} name="info" size="14" />${error}</div>`;

function DevPicker({ value, onChange, exclude }) {
  const q = useQuery(() => admin.activeDevelopers(), [], ['profiles']);
  const options = (q.data ?? []).filter((p) => p.role !== 'owner' && p.id !== exclude).map((p) => ({ value: p.id, label: `${p.display_name} — ${specAr(p.specialization)}` }));
  return html`<${Select} value=${value} onChange=${(e) => onChange(e.currentTarget.value)} placeholder=${q.loading ? 'جارٍ التحميل…' : 'اختر المطوّر'} options=${options} />`;
}

// ---------------------------------------------------------------- warning
const PCTS = [0, 10, 15, 20, 25];

export function WarnModal({ developer, onClose }) {
  const [dev, setDev] = useState(developer?.id ?? '');
  const [kind, setKind] = useState('warning');
  const [reason, setReason] = useState('');
  const [pct, setPct] = useState(10);
  const [custom, setCustom] = useState('');
  const [taskIds, setTaskIds] = useState([]);
  const tasks = useQuery(() => (dev ? admin.devTasks(dev) : Promise.resolve([])), [dev]);
  const bal = useQuery(() => (dev ? admin.devBalances(dev) : Promise.resolve([])), [dev]);
  const effectivePct = kind === 'warning' ? (pct === 'custom' ? Number(custom || 0) : pct) : 0;
  const balances = balancesFrom(bal.data);
  const preview = Object.entries(balances).filter(([, v]) => v > 0).map(([c, v]) => [c, Math.round(v * effectivePct) / 100]);
  const act = useAction((close) => admin.warn({ developer_id: dev, kind, reason, task_ids: taskIds, pct: effectivePct }).then(() => close()), {
    success: kind === 'warning' ? 'تم إرسال التحذير' : 'تم إرسال التنبيه', keys: ['warnings', 'ledger', 'activity'],
  });

  const toggle = (id) => setTaskIds(taskIds.includes(id) ? taskIds.filter((x) => x !== id) : [...taskIds, id]);
  const submit = (close) => {
    if (!dev) return act.setError('اختر المطوّر.');
    if (reason.trim().length < 3) return act.setError('اكتب سبب التحذير.');
    if (effectivePct < 0 || effectivePct > 100) return act.setError('النسبة بين 0 و 100.');
    act.run(close);
  };

  return html`<${Modal} title="تحذير / تنبيه" sub="يصل للمطوّر فوراً على الموقع وفي روم «تحذيراتك» بالديسكورد." onClose=${onClose} wide
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant=${kind === 'warning' ? 'danger' : 'primary'} loading=${act.busy} onClick=${() => submit(close)}>إرسال</${Button}>`}>
    <div class="stack">
      ${developer ? html`<div class="row" style="gap:10px"><${Avatar} src=${developer.discord_avatar} name=${developer.display_name} size="sm" /><b>${developer.display_name}</b></div>`
        : html`<${Field} label="المطوّر"><${DevPicker} value=${dev} onChange=${(v) => { setDev(v); setTaskIds([]); }} /></${Field}>`}
      <${Field} label="النوع">
        <${Seg} block value=${kind} onChange=${setKind} options=${[{ value: 'notice', label: 'تنبيه — بدون خصم', icon: 'bell' }, { value: 'warning', label: 'تحذير فعلي', icon: 'alert' }]} />
      </${Field}>
      <${Field} label="السبب"><${Textarea} rows="3" maxLength="1000" value=${reason} onInput=${(e) => setReason(e.currentTarget.value)} placeholder="اشرح سبب التحذير بوضوح…" /></${Field}>
      ${dev && html`<${Field} label="مهام تقاعس عنها" optional>
        ${tasks.loading ? html`<${Skeleton} h=${40} />` : (tasks.data ?? []).length === 0 ? html`<div class="hint">لا توجد مهام لهذا المطوّر.</div>`
          : html`<div class="stack stack-sm" style="max-height:200px;overflow:auto">${(tasks.data ?? []).slice(0, 30).map((t) => html`<label class=${'check' + (taskIds.includes(t.id) ? ' on' : '')}>
              <input type="checkbox" checked=${taskIds.includes(t.id)} onChange=${() => toggle(t.id)} />
              <span class="mono faint" style="font-size:12px">${taskNo(t.seq)}</span><span class="grow">${t.title}</span></label>`)}</div>`}
      </${Field}>`}
      ${kind === 'warning' && html`<${Field} label="الخصم من المستحقات" hint="يُخصم من الرصيد الحالي غير المصروف بكل عملة.">
        <div class="row row-wrap">
          <${Seg} value=${pct} onChange=${setPct} options=${[...PCTS.map((p) => ({ value: p, label: p ? `${p}%` : 'بدون' })), { value: 'custom', label: 'نسبة أخرى' }]} />
          ${pct === 'custom' && html`<div style="width:110px"><${Input} ltr type="number" min="0" max="100" value=${custom} onInput=${(e) => setCustom(e.currentTarget.value)} placeholder="%" /></div>`}
        </div>
        ${effectivePct > 0 && dev && html`<div class="callout warn" style="margin-top:6px"><${Icon} name="coins" /><div>
          ${preview.length ? html`سيتم خصم: ${preview.map(([c, v]) => money(v, c)).join('، ')}` : 'لا يوجد رصيد حالياً — لن يُخصم شيء.'}</div></div>`}
      </${Field}>`}
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- ledger (add / deduct)
export function LedgerModal({ developer, onClose }) {
  const [dev, setDev] = useState(developer?.id ?? '');
  const [kind, setKind] = useState('manual');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ROBUX');
  const [note, setNote] = useState('');
  const act = useAction((close) => admin.addLedger(dev, amount, currency, kind, note).then(() => close()), { success: 'تم الحفظ', keys: ['ledger', 'activity', 'overview'] });
  const submit = (close) => {
    if (!dev) return act.setError('اختر المطوّر.');
    if (!(Number(amount) > 0)) return act.setError('اكتب مبلغاً صحيحاً.');
    act.run(close);
  };
  return html`<${Modal} title="حركة مالية" sub="إضافة مستحقات أو مكافأة أو خصم يدوي." onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant=${kind === 'deduction' ? 'danger' : 'primary'} loading=${act.busy} onClick=${() => submit(close)}>حفظ</${Button}>`}>
    <div class="stack">
      ${developer ? html`<div class="row" style="gap:10px"><${Avatar} src=${developer.discord_avatar} name=${developer.display_name} size="sm" /><b>${developer.display_name}</b></div>`
        : html`<${Field} label="المطوّر"><${DevPicker} value=${dev} onChange=${setDev} /></${Field}>`}
      <${Seg} block value=${kind} onChange=${setKind} options=${[{ value: 'manual', label: 'مستحقات' }, { value: 'bonus', label: 'مكافأة' }, { value: 'deduction', label: 'خصم' }]} />
      <div class="grid-2">
        <${Field} label="المبلغ"><${Input} ltr type="number" min="0" step="0.01" value=${amount} onInput=${(e) => setAmount(e.currentTarget.value)} /></${Field}>
        <${Field} label="العملة"><${Seg} block value=${currency} onChange=${setCurrency} options=${CURRENCY_KEYS.map((c) => ({ value: c, label: CURRENCIES[c].ar }))} /></${Field}>
      </div>
      <${Field} label="ملاحظة" optional><${Input} maxLength="300" value=${note} onInput=${(e) => setNote(e.currentTarget.value)} placeholder="مثال: مكافأة إنجاز مبكر" /></${Field}>
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- payout
export function PayoutModal({ developer, onClose }) {
  const bal = useQuery(() => admin.devBalances(developer.id), [developer.id], ['ledger']);
  const balances = balancesFrom(bal.data);
  const positive = CURRENCY_KEYS.filter((c) => (balances[c] ?? 0) > 0);
  const [currency, setCurrency] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (!currency && positive.length) setCurrency(positive[0]); }, [positive.join()]);
  const act = useAction((close) => admin.payout(developer.id, currency, note).then(() => close()), { success: 'تم تسجيل الصرف', keys: ['ledger', 'activity', 'overview'] });
  return html`<${Modal} title="صرف المستحقات" sub=${`يُصفّر رصيد ${developer.display_name} بالعملة المختارة ويُسجَّل كصرف.`} onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" loading=${act.busy} disabled=${!currency} onClick=${() => act.run(close)}>تأكيد الصرف</${Button}>`}>
    <div class="stack">
      ${bal.loading ? html`<${Skeleton} h=${60} />` : positive.length === 0 ? html`<div class="callout"><${Icon} name="info" /><div>لا يوجد رصيد مستحق لهذا المطوّر.</div></div>`
        : html`<div class="stack stack-sm">${positive.map((c) => html`<label class=${'check' + (currency === c ? ' on' : '')}>
            <input type="radio" name="cur" checked=${currency === c} onChange=${() => setCurrency(c)} />
            <span class="grow">${CURRENCIES[c].ar}</span><b class="mono">${num(balances[c])}</b></label>`)}</div>`}
      <${Field} label="ملاحظة" optional><${Input} maxLength="300" value=${note} onInput=${(e) => setNote(e.currentTarget.value)} placeholder="مثال: تحويل فودافون كاش" /></${Field}>
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- kick
export function KickModal({ developer, onClose }) {
  const [reason, setReason] = useState('');
  const [removeChannels, setRemove] = useState(true);
  const [kickDiscord, setKickDiscord] = useState(false);
  const act = useAction((close) => admin.kick(developer.id, reason, removeChannels, kickDiscord).then(() => close()), { success: 'تم إيقاف الحساب', keys: ['profiles', 'tasks', 'activity'] });
  const submit = (close) => (reason.trim().length < 3 ? act.setError('اكتب سبب الإيقاف.') : act.run(close));
  const pending = developer.status === 'pending';
  return html`<${Modal} title=${pending ? 'رفض الطلب' : 'إيقاف / طرد المطوّر'} sub=${`${developer.display_name} لن يتمكن من الدخول بعد ذلك. يمكنك إعادة تفعيله لاحقاً.`} onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="danger" icon="ban" loading=${act.busy} onClick=${() => submit(close)}>${pending ? 'رفض' : 'إيقاف الحساب'}</${Button}>`}>
    <div class="stack">
      <${Field} label="السبب" hint="يصل للمطوّر في رسالة خاصة من البوت."><${Textarea} rows="3" maxLength="1000" value=${reason} onInput=${(e) => setReason(e.currentTarget.value)} /></${Field}>
      ${!pending && html`<div class="stack stack-sm">
        <${Switch} checked=${removeChannels} onChange=${setRemove} label="حذف الكاتيجوري والرومات الخاصة به" />
        <${Switch} checked=${kickDiscord} onChange=${setKickDiscord} label="طرده من سيرفر الديسكورد أيضاً" />
        <div class="hint">المهام العامة التي استلمها ستعود متاحة للجميع، والمهام المخصّصة له ستُلغى.</div>
      </div>`}
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- edit profile
export function EditProfileModal({ developer, onClose }) {
  const [f, setF] = useState({
    display_name: developer.display_name ?? '', age: developer.age ?? '', specialization: developer.specialization ?? 'builder',
    roblox_username: developer.roblox_username ?? '', discord_username: developer.discord_username ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.currentTarget.value });
  const act = useAction((close) => admin.updateProfile(developer.id, f).then(() => close()), { success: 'تم حفظ البيانات', keys: ['profiles', 'activity'] });
  return html`<${Modal} title="تعديل البيانات" onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" loading=${act.busy} onClick=${() => act.run(close)}>حفظ</${Button}>`}>
    <div class="stack">
      <div class="grid-2">
        <${Field} label="الاسم العام"><${Input} value=${f.display_name} maxLength="32" onInput=${set('display_name')} /></${Field}>
        <${Field} label="العمر" optional><${Input} ltr type="number" min="8" max="99" value=${f.age} onInput=${set('age')} /></${Field}>
      </div>
      <${Field} label="المجال"><${Select} value=${f.specialization} onChange=${set('specialization')} options=${SPECS.map((s) => ({ value: s.key, label: s.ar }))} /></${Field}>
      <div class="grid-2">
        <${Field} label="روبلوكس" optional><${Input} ltr value=${f.roblox_username} onInput=${set('roblox_username')} /></${Field}>
        <${Field} label="ديسكورد (username)" optional hint="عند تغييره يبحث البوت عن العضو في السيرفر ويربطه تلقائياً."><${Input} ltr value=${f.discord_username} onInput=${set('discord_username')} /></${Field}>
      </div>
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

// ---------------------------------------------------------------- rank / role
export function RankModal({ developer, onClose }) {
  const ranks = useQuery(() => api.ranks(), [], ['ranks']);
  const [rank, setRank] = useState(developer.rank_id ?? '');
  const act = useAction((close) => admin.setRank(developer.id, rank).then(() => close()), { success: 'تم تحديث الرتبة', keys: ['profiles', 'activity'] });
  return html`<${Modal} title="الرتبة" sub="إذا كانت الرتبة مربوطة برتبة ديسكورد، يعطيها البوت للعضو تلقائياً." onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" loading=${act.busy} onClick=${() => act.run(close)}>حفظ</${Button}>`}>
    <div class="stack stack-sm">
      <label class=${'check' + (!rank ? ' on' : '')}><input type="radio" checked=${!rank} onChange=${() => setRank('')} /><span class="grow">بدون رتبة</span></label>
      ${(ranks.data ?? []).map((r) => html`<label class=${'check' + (rank === r.id ? ' on' : '')}>
        <input type="radio" checked=${rank === r.id} onChange=${() => setRank(r.id)} />
        <span class="rank-tag" style=${`color:${r.color}`}><${Icon} name="star" size="12" />${r.name}</span>
        <span class="grow"></span>${r.discord_role_id && html`<span class="faint" style="font-size:12px">مربوطة بالديسكورد</span>`}</label>`)}
      ${ranks.data?.length === 0 && html`<div class="hint">لا توجد رتب بعد — أنشئها من صفحة الرتب.</div>`}
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}

export function RoleModal({ developer, onClose }) {
  const [role, setRole] = useState(developer.role === 'admin' ? 'admin' : 'developer');
  const act = useAction((close) => admin.setRole(developer.id, role).then(() => close()), { success: 'تم تحديث الدور', keys: ['profiles', 'activity'] });
  return html`<${Modal} title="الدور في الموقع" sub="المشرف يرى لوحة الإدارة ويدير المطوّرين والمهام، لكنه لا يغيّر إعدادات الديسكورد أو أدوار غيره." onClose=${onClose}
    footer=${(close) => html`<${Button} variant="ghost" onClick=${close}>إلغاء</${Button}><${Button} variant="primary" loading=${act.busy} onClick=${() => act.run(close)}>حفظ</${Button}>`}>
    <div class="stack">
      <${Seg} block value=${role} onChange=${setRole} options=${[{ value: 'developer', label: 'مطوّر', icon: 'user' }, { value: 'admin', label: 'مشرف', icon: 'shield' }]} />
      <${ErrorLine} error=${act.error} />
    </div>
  </${Modal}>`;
}
