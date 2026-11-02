import { html } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { CURRENCIES, CURRENCY_KEYS, greeting, num, specAr, count } from '../../lib/format.js';
import { Icon } from '../../ui/icons.js';
import { Stat, RankTag, SkeletonRows, Empty, Due } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { TaskStatus, Price, Timeline } from '../../ui/domain.js';

export function DevHome({ profile }) {
  const ov = useQuery(() => api.overview(), [profile.id], ['overview', 'tasks', 'ledger', 'warnings']);
  const tasks = useQuery(() => api.myTasks(profile.id), [profile.id], ['tasks', 'submissions']);
  const activity = useQuery(() => api.myActivity(profile.id, 10), [profile.id], ['activity']);
  const o = ov.data;
  const balances = o?.balances ?? {};
  const main = CURRENCY_KEYS.filter((c) => Number(balances[c]) !== 0);
  const current = (tasks.data ?? []).filter((t) => ['in_progress', 'submitted'].includes(t.status));

  return html`<div class="page">
    <${PageHead}
      crumb=${html`<span>${greeting()}</span>`}
      title=${profile.display_name}
      sub=${html`<span class="row row-wrap" style="gap:8px">${specAr(profile.specialization)} <${RankTag} rank=${profile.rank} /></span>`}
      actions=${html`<a class="btn" href="#/market"><${Icon} name="market" /><span>تصفّح المهام المتاحة</span></a>`} />

    <div class="stats">
      <${Stat} label="المستحقات الحالية" icon="wallet" tone="accent" foot=${main.length > 1 ? main.slice(1).map((c) => `${num(balances[c])} ${CURRENCIES[c].ar}`).join(' · ') : 'رصيدك غير المصروف'}>
        ${main.length ? html`<span>${num(balances[main[0]])}</span><small>${CURRENCIES[main[0]].ar}</small>` : html`<span>0</span>`}
      </${Stat}>
      <${Stat} label="قيد التنفيذ" icon="timer" tone="info" value=${o?.tasks?.in_progress ?? 0} foot=${o?.tasks?.overdue ? html`<span class="neg">متأخرة: ${o.tasks.overdue}</span>` : `قيد المراجعة: ${o?.tasks?.submitted ?? 0}`} />
      <${Stat} label="مهام مكتملة" icon="check" tone="ok" value=${o?.tasks?.completed ?? 0} foot="منذ انضمامك" />
      <${Stat} label="تحذيرات فعّالة" icon="alert" tone=${o?.warnings?.active ? 'bad' : ''} value=${o?.warnings?.active ?? 0} foot=${count(o?.warnings?.notices, ['تنبيه واحد', 'تنبيهان', 'تنبيهات', 'تنبيهاً'], 'لا توجد تنبيهات')} />
    </div>

    ${o?.tasks?.available > 0 && html`<div class="callout accent section clickable" onClick=${() => navigate('/market')}>
      <${Icon} name="market" /><div class="grow">متاح للاستلام الآن: <b>${count(o.tasks.available, ['مهمة واحدة', 'مهمتان', 'مهام', 'مهمة'])}</b> — أول من يستلم تصبح له.</div><${Icon} name="chevL" />
    </div>`}

    <div class="grid-2 section" style="align-items:start">
      <section class="card">
        <div class="card-head"><h3>مهامك الحالية</h3><a class="btn btn-ghost btn-sm" href="#/tasks">الكل</a></div>
        ${tasks.loading && !tasks.data ? html`<${SkeletonRows} n=${3} />`
          : current.length ? current.slice(0, 6).map((t, i) => html`<div class="list-row clickable" style=${`--i:${i}`} onClick=${() => navigate('/tasks?open=' + t.id)}>
              <div class="grow" style="min-width:0">
                <div class="row" style="gap:8px"><span class="mono faint" style="font-size:12px">#${String(t.seq).padStart(4, '0')}</span><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</b></div>
                <div class="row row-wrap" style="gap:10px;margin-top:4px"><${TaskStatus} task=${t} /><${Due} task=${t} compact /></div>
              </div>
              <${Price} amount=${t.price_amount} currency=${t.price_currency} />
            </div>`)
          : html`<${Empty} title="لا توجد مهام حالياً" text="استلم مهمة من المهام المتاحة أو انتظر مهمة من الإدارة." action=${html`<a class="btn btn-sm" href="#/market">المهام المتاحة</a>`} />`}
      </section>
      <section class="card">
        <div class="card-head"><h3>آخر النشاط</h3><a class="btn btn-ghost btn-sm" href="#/activity">السجل الكامل</a></div>
        <div class="card-body">${activity.loading && !activity.data ? html`<${SkeletonRows} n=${4} />` : html`<${Timeline} items=${activity.data} />`}</div>
      </section>
    </div>
  </div>`;
}
