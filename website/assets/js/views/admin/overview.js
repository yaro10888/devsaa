import { html, useState } from '../../lib/html.js';
import { useQuery, invalidate, useNow } from '../../lib/store.js';
import { admin } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { errorText } from '../../lib/errors.js';
import { CURRENCIES, CURRENCY_KEYS, num, specAr, ago, taskNo } from '../../lib/format.js';
import { Icon, DiscordIcon } from '../../ui/icons.js';
import { Stat, Button, SkeletonRows, Empty, Badge } from '../../ui/components.js';
import { toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { Timeline, PersonCell, Price } from '../../ui/domain.js';
import { TaskFormModal } from './tasks.js';

export function AdminOverview() {
  const now = useNow(30000);
  const dash = useQuery(() => admin.dashboard(), [], ['profiles', 'tasks', 'submissions', 'warnings', 'ledger', 'jobs']);
  const pending = useQuery(async () => (await admin.profiles()).filter((p) => p.status === 'pending'), [], ['profiles']);
  const subs = useQuery(() => admin.pendingSubmissions(), [], ['submissions']);
  const activity = useQuery(() => admin.activity(12), [], ['activity']);
  const [busy, setBusy] = useState('');
  const [creating, setCreating] = useState(false);
  const d = dash.data;

  const activate = async (p) => {
    setBusy(p.id);
    try {
      await admin.activate(p.id);
      toast.ok(`تم تفعيل ${p.display_name}`);
      invalidate('profiles', 'activity');
      admin.kickWorker();
    } catch (err) {
      toast.bad('تعذّر التفعيل', errorText(err));
    } finally {
      setBusy('');
    }
  };

  const lastJob = d?.jobs?.last_done_at;
  const botTone = d?.jobs?.failed ? 'bad' : d?.jobs?.pending > 3 ? 'warn' : 'ok';

  return html`<div class="page">
    <${PageHead} title="لوحة الإدارة" sub="ملخّص سريع لكل ما يحتاج انتباهك."
      actions=${html`<${Button} variant="primary" icon="plus" onClick=${() => setCreating(true)}>مهمة جديدة</${Button}>`} />
    <div class="stats">
      <${Stat} label="بانتظار التفعيل" icon="users" tone="warn" value=${d?.accounts?.pending ?? 0} foot=${`الحسابات المفعّلة: ${d?.accounts?.active ?? 0}`} />
      <${Stat} label="تسليمات للمراجعة" icon="inbox" tone="accent" value=${d?.tasks?.submitted ?? 0} foot=${`قيد التنفيذ: ${d?.tasks?.in_progress ?? 0}`} />
      <${Stat} label="مهام متأخرة" icon="timer" tone=${d?.tasks?.overdue ? 'bad' : ''} value=${d?.tasks?.overdue ?? 0} foot=${`مهام عامة متاحة: ${d?.tasks?.open ?? 0}`} />
      <${Stat} label="تحذيرات (30 يوم)" icon="alert" tone="info" value=${d?.warnings_30d ?? 0} foot=${`مهام مكتملة إجمالاً: ${d?.tasks?.completed ?? 0}`} />
    </div>

    <div class="grid-2 section" style="align-items:start">
      <div class="stack">
        <section class="card">
          <div class="card-head"><h3>طلبات بانتظار التفعيل</h3><a class="btn btn-ghost btn-sm" href="#/admin/accounts?status=pending">الكل</a></div>
          ${pending.loading && !pending.data ? html`<${SkeletonRows} n=${2} />`
            : !pending.data?.length ? html`<${Empty} title="لا توجد طلبات جديدة" tone="muted" />`
            : pending.data.slice(0, 6).map((p, i) => html`<div class="list-row" style=${`--i:${i}`} key=${p.id}>
                <div class="grow clickable" onClick=${() => navigate('/admin/accounts?id=' + p.id)}><${PersonCell} p=${p} sub=${`${specAr(p.specialization)} · @${p.discord_username ?? '—'} · ${ago(p.created_at, now)}`} /></div>
                <${Button} size="sm" variant="ok" icon="check" loading=${busy === p.id} onClick=${() => activate(p)}>تفعيل</${Button}>
              </div>`)}
        </section>
        <section class="card">
          <div class="card-head"><h3>تسليمات بانتظار المراجعة</h3><a class="btn btn-ghost btn-sm" href="#/admin/tasks?status=submitted">الكل</a></div>
          ${subs.loading && !subs.data ? html`<${SkeletonRows} n=${2} />`
            : !subs.data?.length ? html`<${Empty} title="لا شيء للمراجعة" text="أي تسليم جديد سيظهر هنا فوراً." tone="muted" />`
            : subs.data.slice(0, 6).map((s, i) => html`<div class="list-row clickable" style=${`--i:${i}`} key=${s.id} onClick=${() => navigate('/admin/tasks?task=' + s.task_id)}>
                <div class="grow"><${PersonCell} p=${s.developer} sub=${`${taskNo(s.task?.seq)} — ${s.task?.title ?? ''}`} /></div>
                <div style="text-align:end"><${Price} amount=${s.task?.price_amount} currency=${s.task?.price_currency} /><div class="faint" style="font-size:12px">${ago(s.created_at, now)}</div></div>
              </div>`)}
        </section>
      </div>
      <div class="stack">
        <section class="card card-pad stack">
          <div class="row between"><b>المستحقات غير المصروفة</b><a class="btn btn-ghost btn-sm" href="#/admin/finance">المالية</a></div>
          <div class="grid-3">${CURRENCY_KEYS.map((c) => html`<div class="money"><span class="faint" style="font-size:12.5px">${CURRENCIES[c].ar}</span><div class="money-row"><span class="num">${num(d?.owed?.[c] ?? 0)}</span><span class="cur">${CURRENCIES[c].short}</span></div></div>`)}</div>
        </section>
        <section class="card card-pad stack stack-sm clickable" onClick=${() => navigate('/admin/bot')}>
          <div class="row between">
            <div class="row" style="gap:10px"><span class=${'ibox ' + botTone}><${DiscordIcon} size="18" /></span><div><b>البوت</b><div class="hint">${lastJob ? `آخر عملية ناجحة ${ago(lastJob, now)}` : 'لا توجد عمليات بعد'}</div></div></div>
            <div class="row" style="gap:6px">${d?.jobs?.pending ? html`<${Badge} tone="warn">بالانتظار: ${d.jobs.pending}</${Badge}>` : null}${d?.jobs?.failed ? html`<${Badge} tone="bad">فشلت: ${d.jobs.failed}</${Badge}>` : html`<${Badge} tone="ok">يعمل</${Badge}>`}</div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3>آخر النشاط</h3><a class="btn btn-ghost btn-sm" href="#/admin/logs">السجل</a></div>
          <div class="card-body">${activity.loading && !activity.data ? html`<${SkeletonRows} n=${4} />` : html`<${Timeline} items=${activity.data} showPeople />`}</div>
        </section>
      </div>
    </div>
    ${creating && html`<${TaskFormModal} onClose=${() => setCreating(false)} />`}
  </div>`;
}
