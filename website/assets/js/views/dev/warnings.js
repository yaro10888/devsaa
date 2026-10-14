import { html } from '../../lib/html.js';
import { useQuery } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { SkeletonRows, Empty, ErrorBox } from '../../ui/components.js';
import { PageHead } from '../../ui/page.js';
import { WarningCard } from '../../ui/domain.js';

export function MyWarnings({ profile }) {
  const q = useQuery(async () => {
    const warnings = await api.myWarnings(profile.id);
    const ids = [...new Set(warnings.flatMap((w) => w.task_ids ?? []))];
    const tasks = await api.tasksByIds(ids).catch(() => []);
    return { warnings, tasks };
  }, [profile.id], ['warnings']);
  const list = q.data?.warnings ?? [];
  const active = list.filter((w) => w.status === 'active');

  return html`<div class="page">
    <${PageHead} title="التحذيرات" sub="التنبيهات لا تؤثر على مستحقاتك، أما التحذير الفعلي فقد يتضمن خصماً بنسبة من رصيدك." />
    ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
      : q.loading && !q.data ? html`<${SkeletonRows} n=${3} />`
      : list.length ? html`<div class="stack">
          ${active.length === 0 && html`<div class="callout ok"><div>لا توجد تحذيرات فعّالة على حسابك حالياً.</div></div>`}
          ${list.map((w, i) => html`<${WarningCard} key=${w.id} w=${w} i=${i} tasks=${q.data.tasks} />`)}
        </div>`
      : html`<${Empty} title="سجلّك نظيف" text="لا توجد أي تنبيهات أو تحذيرات. استمر كذا." />`}
  </div>`;
}
