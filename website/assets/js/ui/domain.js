import { html, useState, useEffect } from '../lib/html.js';
import { api } from '../lib/api.js';
import { useNow } from '../lib/store.js';
import {
  TASK_STATUS, CURRENCIES, CURRENCY_KEYS, LEDGER_KIND, money, num, signed, taskNo, specAr, date, dateTime, ago, fileSize,
} from '../lib/format.js';
import { Icon } from './icons.js';
import { Badge, Due, Avatar, Button, Empty } from './components.js';
import { openLightbox, toast } from './overlays.js';

// ---------------------------------------------------------------- tasks
export function isLate(t) {
  return t.status === 'in_progress' && t.due_at && new Date(t.due_at).getTime() < Date.now();
}

export function TaskStatus({ task }) {
  if (isLate(task)) return html`<${Badge} tone="bad" pulse>متأخرة</${Badge}>`;
  const s = TASK_STATUS[task.status] ?? { ar: task.status, tone: '' };
  return html`<${Badge} tone=${s.tone} pulse=${task.status === 'submitted'}>${s.ar}</${Badge}>`;
}

export function Price({ amount, currency }) {
  if (!Number(amount)) return html`<span class="price"><small>بدون مقابل</small></span>`;
  return html`<span class="price">${num(amount)}<small>${CURRENCIES[currency]?.ar ?? currency}</small></span>`;
}

export function TaskCard({ task, i = 0, onOpen, action, showAssignee }) {
  return html`<article class="card task-card spot lift clickable" style=${`--i:${i}`} onClick=${() => onOpen?.(task)} tabIndex="0"
    onKeyDown=${(e) => e.key === 'Enter' && onOpen?.(task)}>
    <div class="top"><span class="no">${taskNo(task.seq)}</span><${TaskStatus} task=${task} /></div>
    <h3>${task.title}</h3>
    <p class="desc">${task.description}</p>
    <div class="meta">
      <span class="chip"><${Icon} name="tag" />${specAr(task.task_type)}</span>
      <span class="chip"><${Icon} name=${task.scope === 'general' ? 'market' : 'user'} />${task.scope === 'general' ? 'عامة' : 'مخصّصة'}</span>
      ${task.images?.length > 0 && html`<span class="chip"><${Icon} name="image" />${task.images.length}</span>`}
      ${showAssignee && task.assignee_name && html`<span class="chip"><${Icon} name="user" />${task.assignee_name}</span>`}
    </div>
    <div class="foot">
      <${Price} amount=${task.price_amount} currency=${task.price_currency} />
      ${action ?? html`<${Due} task=${task} compact />`}
    </div>
  </article>`;
}

export function TaskImages({ paths }) {
  const [urls, setUrls] = useState(null);
  useEffect(() => {
    let alive = true;
    api.imageUrls(paths).then((u) => alive && setUrls(u)).catch(() => alive && setUrls([]));
    return () => { alive = false; };
  }, [(paths ?? []).join('|')]);
  if (!paths?.length) return null;
  if (!urls) return html`<div class="thumbs">${paths.map(() => html`<div class="thumb sk"></div>`)}</div>`;
  return html`<div class="thumbs">${urls.map((u) => html`<div class="thumb"><img src=${u} alt="" loading="lazy" onClick=${() => openLightbox(u)} /></div>`)}</div>`;
}

export function TaskFacts({ task }) {
  return html`<div class="kv">
    <div><span>المكافأة</span><b>${Number(task.price_amount) ? money(task.price_amount, task.price_currency) : 'بدون مقابل'}</b></div>
    <div><span>النوع</span><b>${specAr(task.task_type)}</b></div>
    <div><span>المدة</span><b>${task.duration_minutes ? html`<${Due} task=${task} />` : 'بدون مدة محددة'}</b></div>
    <div><span>${task.scope === 'general' ? 'المستلم' : 'المطوّر'}</span><b>${task.assignee_name ?? (task.scope === 'general' ? 'لم تُستلم بعد' : '—')}</b></div>
    <div><span>تاريخ النشر</span><b>${dateTime(task.created_at)}</b></div>
    <div><span>${task.due_at ? 'الموعد النهائي' : 'آخر تحديث'}</span><b>${dateTime(task.due_at ?? task.updated_at)}</b></div>
  </div>`;
}

// ---------------------------------------------------------------- submissions
const SUB_STATUS = { pending: ['قيد المراجعة', 'warn'], approved: ['مقبول', 'ok'], rejected: ['يحتاج تعديل', 'bad'] };

export function FileLink({ file }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const url = await api.fileUrl(file.path, file.name);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.bad('تعذّر فتح الملف');
    } finally {
      setBusy(false);
    }
  };
  return html`<div class="file">
    <span class="ico"><${Icon} name=${/^image\//.test(file.type ?? '') ? 'image' : 'file'} /></span>
    <div class="meta"><div class="n">${file.name}</div><div class="s">${fileSize(file.size)}</div></div>
    <${Button} size="sm" icon="arrowDown" loading=${busy} onClick=${open}>تحميل</${Button}>
  </div>`;
}

export function SubmissionCard({ sub, actions }) {
  const [label, tone] = SUB_STATUS[sub.status] ?? [sub.status, ''];
  return html`<div class="card card-pad stack stack-sm">
    <div class="row between">
      <div class="row" style="gap:8px"><${Badge} tone=${tone}>${label}</${Badge}><span class="faint" style="font-size:12.5px">${sub.source === 'discord' ? 'عبر الديسكورد' : 'عبر الموقع'} · ${dateTime(sub.created_at)}</span></div>
    </div>
    ${sub.note && html`<div class="prose" style="font-size:13.5px">${sub.note}</div>`}
    <div class="files">${(sub.files ?? []).map((f) => html`<${FileLink} file=${f} />`)}</div>
    ${sub.review_note && html`<div class=${'callout ' + (sub.status === 'approved' ? 'ok' : 'bad')}><${Icon} name="info" /><div><b>ملاحظة المراجع:</b> ${sub.review_note}</div></div>`}
    ${actions}
  </div>`;
}

// ---------------------------------------------------------------- activity
const ACT = {
  'account.created': ['user', 'info', 'تم إنشاء الحساب'],
  'account.activated': ['check', 'ok', 'تم تفعيل الحساب'],
  'account.reinstated': ['check', 'ok', 'أُعيد تفعيل الحساب'],
  'account.kicked': ['ban', 'bad', 'تم إيقاف الحساب'],
  'account.updated': ['edit', '', 'تحديث بيانات الحساب'],
  'role.changed': ['shield', 'info', 'تغيير الدور'],
  'rank.changed': ['star', 'accent', 'رتبة جديدة'],
  'rank.saved': ['star', '', 'حفظ رتبة'],
  'rank.deleted': ['trash', '', 'حذف رتبة'],
  'task.claimed': ['tasks', 'accent', 'استلام مهمة'],
  'task.assigned': ['tasks', 'accent', 'مهمة مسندة'],
  'task.published': ['market', 'info', 'نشر مهمة عامة'],
  'task.submitted': ['upload', 'warn', 'تسليم مهمة'],
  'task.approved': ['check', 'ok', 'قبول المهمة'],
  'task.rejected': ['x', 'bad', 'التسليم يحتاج تعديل'],
  'task.cancelled': ['x', '', 'إلغاء مهمة'],
  'task.overdue': ['timer', 'bad', 'مهمة متأخرة'],
  'warning.issued': ['alert', 'bad', 'تحذير'],
  'notice.issued': ['alert', 'warn', 'تنبيه'],
  'warning.revoked': ['check', 'ok', 'إلغاء تحذير'],
  'ledger.bonus': ['coins', 'ok', 'مكافأة'],
  'ledger.manual': ['coins', 'ok', 'إضافة مستحقات'],
  'ledger.deduction': ['coins', 'bad', 'خصم'],
  'ledger.payout': ['wallet', 'info', 'صرف المستحقات'],
  'settings.updated': ['settings', '', 'تحديث إعدادات الديسكورد'],
};
const ROLE_AR = { owner: 'المالك', admin: 'مشرف', developer: 'مطوّر' };

function describe(a) {
  const d = a.details ?? {};
  const task = d.seq ? `${taskNo(d.seq)} — ${d.title ?? ''}` : d.title;
  switch (a.action) {
    case 'task.approved': return [task, Number(d.amount) ? `+${money(d.amount, d.currency)}` : null].filter(Boolean).join(' · ');
    case 'task.rejected': return [task, d.note].filter(Boolean).join(' · ');
    case 'task.cancelled': return [task, d.reason].filter(Boolean).join(' · ');
    case 'account.kicked': case 'warning.issued': case 'notice.issued': return d.reason;
    case 'warning.revoked': return d.reason;
    case 'role.changed': return `${ROLE_AR[d.from] ?? d.from} ← ${ROLE_AR[d.to] ?? d.to}`;
    case 'rank.changed': return d.rank ?? 'بدون رتبة';
    case 'rank.saved': case 'rank.deleted': return d.name;
    case 'ledger.bonus': case 'ledger.manual': case 'ledger.deduction':
      return [money(Math.abs(d.amount), d.currency), d.note].filter(Boolean).join(' · ');
    case 'ledger.payout': return money(d.amount, d.currency);
    default: return task ?? null;
  }
}

export function Timeline({ items, showPeople }) {
  const now = useNow(60000);
  if (!items?.length) return html`<${Empty} title="لا يوجد نشاط بعد" text="كل ما يحدث في حسابك سيظهر هنا." tone="muted" />`;
  return html`<div class="timeline">${items.map((a, i) => {
    const [icon, tone, title] = ACT[a.action] ?? ['dots', '', a.action];
    const detail = describe(a);
    return html`<div class="tl-item" style=${`--i:${i}`} key=${a.id}>
      <span class=${'tl-ico ' + tone}><${Icon} name=${icon} /></span>
      <div class="tl-body">
        <div class="t">${title}${showPeople && a.target?.display_name ? html` <span class="faint">— ${a.target.display_name}</span>` : ''}</div>
        ${detail && html`<div class="d">${detail}</div>`}
        <div class="w" title=${dateTime(a.created_at)}>${ago(a.created_at, now)}${showPeople && a.actor?.display_name ? ` · بواسطة ${a.actor.display_name}` : ''}</div>
      </div>
    </div>`;
  })}</div>`;
}

// ---------------------------------------------------------------- warnings
export function WarningCard({ w, i = 0, tasks = [], actions, who }) {
  const isWarning = w.kind === 'warning';
  const ded = Object.entries(w.deductions ?? {});
  const related = tasks.filter((t) => (w.task_ids ?? []).includes(t.id));
  return html`<article class=${'card warn-card ' + w.kind + (w.status === 'revoked' ? ' revoked' : '')} style=${`--i:${i}`}>
    <span class="side"></span>
    <div class="grow stack stack-sm">
      <div class="row between row-wrap">
        <div class="row" style="gap:8px">
          <${Badge} tone=${isWarning ? 'bad' : 'warn'}>${isWarning ? 'تحذير' : 'تنبيه'}</${Badge}>
          ${w.status === 'revoked' && html`<${Badge}>أُلغي</${Badge}>`}
          ${who}
        </div>
        <span class="faint" style="font-size:12.5px">${dateTime(w.created_at)}</span>
      </div>
      <div class="prose" style="color:var(--text)">${w.reason}</div>
      ${related.length > 0 && html`<div class="row row-wrap" style="gap:6px">${related.map((t) => html`<span class="chip"><${Icon} name="tasks" />${taskNo(t.seq)} ${t.title}</span>`)}</div>`}
      ${isWarning && Number(w.deduction_pct) > 0 && html`<div class="row row-wrap" style="gap:6px">
        <span class="chip" style="color:var(--bad)"><${Icon} name="arrowDown" />خصم ${num(w.deduction_pct)}%</span>
        ${ded.map(([c, v]) => html`<span class="chip">−${money(v, c)}</span>`)}
        ${!ded.length && html`<span class="faint" style="font-size:12.5px">لم يكن هناك رصيد للخصم</span>`}
      </div>`}
      ${w.status === 'revoked' && w.revoke_reason && html`<div class="faint" style="font-size:12.5px">سبب الإلغاء: ${w.revoke_reason}</div>`}
      ${actions}
    </div>
  </article>`;
}

// ---------------------------------------------------------------- money
export function balancesFrom(rows) {
  const out = {};
  for (const r of rows ?? []) out[r.currency] = Number(r.balance ?? r.amount ?? 0);
  return out;
}

export function BalanceTiles({ balances = {} }) {
  return html`<div class="grid-3">${CURRENCY_KEYS.map((c, i) => html`<div class="card stat spot" style=${`--i:${i}`}>
    <div class="k"><span>${CURRENCIES[c].ar}</span><span class="ic"><${Icon} name="coins" /></span></div>
    <div class="v"><span class=${(balances[c] ?? 0) < 0 ? 'neg' : ''}>${num(balances[c] ?? 0)}</span><small>${CURRENCIES[c].short}</small></div>
    <div class="foot">${(balances[c] ?? 0) > 0 ? 'مستحق لم يُصرف بعد' : 'لا يوجد رصيد مستحق'}</div>
  </div>`)}</div>`;
}

export function LedgerTable({ entries, showDev }) {
  if (!entries?.length) return html`<${Empty} title="لا توجد حركات مالية" text="المكافآت والخصومات والصرف ستظهر هنا." tone="muted" />`;
  return html`<div class="table-wrap"><table class="table">
    <thead><tr>${showDev && html`<th>المطوّر</th>`}<th>النوع</th><th class="hide-sm">التفاصيل</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
    <tbody>${entries.map((e, i) => html`<tr style=${`--i:${i}`} key=${e.id}>
      ${showDev && html`<td>${e.developer?.display_name ?? '—'}</td>`}
      <td><${Badge} tone=${e.amount > 0 ? 'ok' : e.kind === 'payout' ? 'info' : 'bad'} plain>${LEDGER_KIND[e.kind] ?? e.kind}</${Badge}></td>
      <td class="hide-sm muted" style="max-width:340px">${e.note ?? '—'}</td>
      <td class=${'nowrap mono ' + (e.amount > 0 ? 'pos' : 'neg')}>${signed(e.amount)} <span class="faint">${CURRENCIES[e.currency]?.short ?? e.currency}</span></td>
      <td class="nowrap faint">${date(e.created_at)}</td>
    </tr>`)}</tbody>
  </table></div>`;
}

export function PersonCell({ p, sub }) {
  return html`<div class="cell-user"><${Avatar} src=${p?.discord_avatar} name=${p?.display_name} size="sm" />
    <div style="min-width:0"><div class="name">${p?.display_name ?? '—'}</div>${sub && html`<div class="sub">${sub}</div>`}</div></div>`;
}
