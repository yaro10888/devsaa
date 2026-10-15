import { html, useState, useMemo } from '../../lib/html.js';
import { useQuery, useAppState, isOwner, invalidate } from '../../lib/store.js';
import { admin, api } from '../../lib/api.js';
import { setQuery } from '../../lib/router.js';
import { errorText } from '../../lib/errors.js';
import { ACCOUNT_STATUS, ROLES, specAr, date, dateTime } from '../../lib/format.js';
import { Icon, DiscordIcon } from '../../ui/icons.js';
import { Badge, Button, Input, Seg, Tabs, Drawer, Avatar, RankTag, SkeletonRows, Empty, ErrorBox, Skeleton } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { TaskCard, Timeline, WarningCard, LedgerTable, BalanceTiles, balancesFrom, PersonCell } from '../../ui/domain.js';
import { canManage, WarnModal, LedgerModal, PayoutModal, KickModal, EditProfileModal, RankModal, RoleModal } from './modals.js';

export function Accounts({ route, profile }) {
  const q = useQuery(() => admin.profiles(), [], ['profiles']);
  const [status, setStatus] = useState(route.query.get('status') || 'all');
  const [search, setSearch] = useState('');
  const open = route.query.get('id');

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((p) => (status === 'all' || p.status === status)
      && (!s || [p.display_name, p.email, p.discord_username, p.roblox_username].some((v) => String(v ?? '').toLowerCase().includes(s))));
  }, [q.data, status, search]);
  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, active: 0, kicked: 0 };
    for (const p of q.data ?? []) { c.all++; c[p.status]++; }
    return c;
  }, [q.data]);

  return html`<div class="page">
    <${PageHead} title="الحسابات" sub="كل الحسابات وطلبات الانضمام. اضغط على أي حساب لعرض تفاصيله وإدارته." />
    <div class="toolbar">
      <${Seg} value=${status} onChange=${setStatus} options=${[
        { value: 'all', label: `الكل ${counts.all}` },
        { value: 'pending', label: `بانتظار التفعيل ${counts.pending}` },
        { value: 'active', label: `مفعّل ${counts.active}` },
        { value: 'kicked', label: `موقوف ${counts.kicked}` },
      ]} />
      <div class="grow"></div>
      <${Input} icon="search" value=${search} onInput=${(e) => setSearch(e.currentTarget.value)} placeholder="بحث بالاسم أو البريد أو ديسكورد…" />
    </div>
    <section class="card">
      ${q.error ? html`<div class="card-body"><${ErrorBox} error=${q.error} onRetry=${q.reload} /></div>`
        : q.loading && !q.data ? html`<${SkeletonRows} n=${6} />`
        : list.length === 0 ? html`<${Empty} title="لا توجد حسابات مطابقة" tone="muted" />`
        : html`<div class="table-wrap"><table class="table">
          <thead><tr><th>الحساب</th><th class="hide-sm">ديسكورد</th><th class="hide-sm">روبلوكس</th><th>المجال</th><th>الحالة</th><th class="hide-sm">الانضمام</th></tr></thead>
          <tbody>${list.map((p, i) => html`<tr key=${p.id} class="clickable" style=${`--i:${i}`} onClick=${() => setQuery('id', p.id)}>
            <td><${PersonCell} p=${p} sub=${html`<span class="ltr">${p.email}</span>`} /></td>
            <td class="hide-sm ltr" style="text-align:start">${p.discord_username ? '@' + p.discord_username : '—'}${p.discord_username && !p.discord_id ? html` <span title="لم يُربط بعد" style="color:var(--warn)">•</span>` : ''}</td>
            <td class="hide-sm ltr" style="text-align:start">${p.roblox_username ?? '—'}</td>
            <td><div class="row" style="gap:6px">${p.role === 'developer' ? specAr(p.specialization) : html`<${Badge} tone="accent" plain>${ROLES[p.role]}</${Badge}>`}<${RankTag} rank=${p.rank} /></div></td>
            <td><${Badge} tone=${ACCOUNT_STATUS[p.status]?.tone} pulse=${p.status === 'pending'}>${ACCOUNT_STATUS[p.status]?.ar}</${Badge}></td>
            <td class="hide-sm faint nowrap">${date(p.created_at)}</td>
          </tr>`)}</tbody>
        </table></div>`}
    </section>
    ${open && html`<${AccountDrawer} key=${open} id=${open} me=${profile} onClose=${() => setQuery('id', null)} />`}
  </div>`;
}

export function AccountDrawer({ id, me, onClose }) {
  const st = useAppState();
  const q = useQuery(() => api.profile(id), [id], ['profiles']);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState('');
  const p = q.data;
  const manage = p && canManage(me, p);

  const activate = async () => {
    setBusy('activate');
    try {
      await admin.activate(p.id);
      toast.ok(p.status === 'kicked' ? 'تمت إعادة تفعيل الحساب' : 'تم تفعيل الحساب', 'سيجهّز البوت رومات المطوّر ويراسله.');
      invalidate('profiles', 'activity');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر التفعيل', errorText(err));
    } finally {
      setBusy('');
    }
  };
  const repair = async () => {
    if (!(await confirmDialog({ title: 'إصلاح رومات الديسكورد', text: 'سيتأكد البوت من وجود الكاتيجوري والرومات والصلاحيات، وينشئ الناقص منها.', confirm: 'تشغيل' }))) return;
    try {
      await admin.repairChannels(p.id);
      admin.kickWorker();
      toast.ok('تمت جدولة الإصلاح', 'تابع النتيجة من صفحة عمليات البوت.');
    } catch (err) {
      toast.bad('تعذّر التنفيذ', errorText(err));
    }
  };

  const Modal = modal && { warn: WarnModal, ledger: LedgerModal, payout: PayoutModal, kick: KickModal, edit: EditProfileModal, rank: RankModal, role: RoleModal }[modal];

  return html`<${Drawer} onClose=${onClose}
    head=${p ? html`<div class="grow row" style="gap:12px;min-width:0">
        <${Avatar} src=${p.discord_avatar} name=${p.display_name} />
        <div style="min-width:0"><b style="display:block;font-family:var(--font-display)">${p.display_name}</b>
          <div class="row" style="gap:6px"><${Badge} tone=${ACCOUNT_STATUS[p.status]?.tone}>${ACCOUNT_STATUS[p.status]?.ar}</${Badge}>${p.role !== 'developer' && html`<${Badge} tone="accent" plain>${ROLES[p.role]}</${Badge}>`}<${RankTag} rank=${p.rank} /></div></div>
      </div>` : html`<div class="grow"><${Skeleton} h=${36} w=${200} /></div>`}
    footer=${p && manage && html`
      ${p.status !== 'active' && html`<${Button} variant="ok" icon="check" loading=${busy === 'activate'} onClick=${activate}>${p.status === 'kicked' ? 'إعادة التفعيل' : 'تفعيل الحساب'}</${Button}>`}
      ${p.status === 'active' && p.id !== me.id && html`<${Button} icon="alert" onClick=${() => setModal('warn')}>تحذير</${Button}>`}
      ${p.status === 'active' && html`<${Button} icon="coins" onClick=${() => setModal('ledger')}>حركة مالية</${Button}>`}
      ${p.status === 'active' && html`<${Button} icon="wallet" onClick=${() => setModal('payout')}>صرف</${Button}>`}
      <${Button} icon="edit" onClick=${() => setModal('edit')}>تعديل</${Button}>
      <${Button} icon="star" onClick=${() => setModal('rank')}>الرتبة</${Button}>
      ${isOwner(st.profile) && p.role !== 'owner' && html`<${Button} icon="shield" onClick=${() => setModal('role')}>الدور</${Button}>`}
      ${p.status === 'active' && html`<${Button} icon="wrench" onClick=${repair}>إصلاح الرومات</${Button}>`}
      ${p.status !== 'kicked' && p.role !== 'owner' && p.id !== me.id && html`<${Button} variant="danger" icon="ban" onClick=${() => setModal('kick')}>${p.status === 'pending' ? 'رفض' : 'إيقاف'}</${Button}>`}
    `}>
    ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
      : !p ? html`<div class="stack"><${Skeleton} h=${80} /><${Skeleton} h=${160} /></div>`
      : html`<div class="stack">
        ${p.status === 'pending' && html`<div class="callout warn"><${Icon} name="timer" /><div>هذا الحساب أكّد ديسكورد وينتظر التفعيل. بعد التفعيل سيُنشئ البوت له كاتيجوري ورومات خاصة ويراسله.</div></div>`}
        ${p.status === 'kicked' && p.status_reason && html`<div class="callout bad"><${Icon} name="ban" /><div><b>سبب الإيقاف:</b> ${p.status_reason}</div></div>`}
        ${!manage && html`<div class="callout"><${Icon} name="lock" /><div>لا يمكنك إدارة هذا الحساب.</div></div>`}
        <${Tabs} value=${tab} onChange=${setTab} tabs=${[
          { value: 'overview', label: 'نظرة عامة' }, { value: 'tasks', label: 'المهام' }, { value: 'warnings', label: 'التحذيرات' },
          { value: 'money', label: 'المالية' }, { value: 'activity', label: 'السجل' },
        ]} />
        ${tab === 'overview' && html`<${Overview} p=${p} />`}
        ${tab === 'tasks' && html`<${DevTasks} id=${p.id} />`}
        ${tab === 'warnings' && html`<${DevWarnings} id=${p.id} />`}
        ${tab === 'money' && html`<${DevMoney} id=${p.id} />`}
        ${tab === 'activity' && html`<${DevActivity} id=${p.id} />`}
      </div>`}
    ${Modal && html`<${Modal} developer=${p} onClose=${() => setModal(null)} />`}
  </${Drawer}>`;
}

function Overview({ p }) {
  return html`<div class="stack">
    <div class="kv">
      <div><span>البريد الإلكتروني</span><b class="ltr">${p.email}</b></div>
      <div><span>العمر</span><b>${p.age ?? '—'}</b></div>
      <div><span>المجال</span><b>${specAr(p.specialization)}</b></div>
      <div><span>روبلوكس</span><b class="ltr">${p.roblox_username ?? '—'}</b></div>
      <div><span>ديسكورد</span><b class="ltr">${p.discord_username ? '@' + p.discord_username : '—'}</b></div>
      <div><span>معرّف ديسكورد</span><b class="mono" style="font-size:12.5px">${p.discord_id ?? 'غير مربوط'}</b></div>
      <div><span>تاريخ التسجيل</span><b>${dateTime(p.created_at)}</b></div>
      <div><span>تاريخ التفعيل</span><b>${p.activated_at ? dateTime(p.activated_at) : '—'}</b></div>
    </div>
    <div class="card card-pad stack stack-sm">
      <div class="row" style="gap:8px"><${DiscordIcon} size="16" /><b>مساحة الديسكورد</b></div>
      ${p.discord_category_id
        ? html`<div class="row row-wrap" style="gap:6px"><span class="chip"><${Icon} name="hash" />مهامك!</span><span class="chip"><${Icon} name="hash" />سجلك!</span><span class="chip"><${Icon} name="hash" />تحذيراتك!</span></div>`
        : html`<div class="hint">${p.status === 'active' ? 'لم تُنشأ الرومات بعد — استخدم «إصلاح الرومات».' : 'تُنشأ عند تفعيل الحساب.'}</div>`}
    </div>
  </div>`;
}

function DevTasks({ id }) {
  const q = useQuery(() => admin.devTasks(id), [id], ['tasks']);
  if (q.loading && !q.data) return html`<${SkeletonRows} n=${3} />`;
  if (!q.data?.length) return html`<${Empty} title="لا توجد مهام" tone="muted" />`;
  return html`<div class="stack">${q.data.map((t, i) => html`<${TaskCard} key=${t.id} task=${t} i=${i} onOpen=${() => { location.hash = '#/admin/tasks?task=' + t.id; }} />`)}</div>`;
}

function DevWarnings({ id }) {
  const q = useQuery(() => admin.devWarnings(id), [id], ['warnings']);
  if (q.loading && !q.data) return html`<${SkeletonRows} n=${3} />`;
  if (!q.data?.length) return html`<${Empty} title="لا توجد تحذيرات" tone="muted" />`;
  return html`<div class="stack">${q.data.map((w, i) => html`<${WarningCard} key=${w.id} w=${w} i=${i} />`)}</div>`;
}

function DevMoney({ id }) {
  const bal = useQuery(() => admin.devBalances(id), [id], ['ledger']);
  const led = useQuery(() => admin.devLedger(id), [id], ['ledger']);
  return html`<div class="stack">
    <${BalanceTiles} balances=${balancesFrom(bal.data)} />
    <div class="card">${led.loading && !led.data ? html`<${SkeletonRows} n=${3} />` : html`<${LedgerTable} entries=${led.data} />`}</div>
  </div>`;
}

function DevActivity({ id }) {
  const q = useQuery(() => admin.devActivity(id), [id], ['activity']);
  if (q.loading && !q.data) return html`<${SkeletonRows} n=${4} />`;
  return html`<${Timeline} items=${q.data} />`;
}
