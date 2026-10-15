import { html, useState } from '../../lib/html.js';
import { useQuery, useInterval, invalidate } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { navigate } from '../../lib/router.js';
import { errorText } from '../../lib/errors.js';
import { duration, taskNo } from '../../lib/format.js';
import { Button, SkeletonCards, Empty, ErrorBox, Drawer, Skeleton } from '../../ui/components.js';
import { confirmDialog, toast } from '../../ui/overlays.js';
import { PageHead } from '../../ui/page.js';
import { TaskCard, TaskStatus, TaskFacts, TaskImages } from '../../ui/domain.js';

export function Market({ profile }) {
  const q = useQuery(() => api.openTasks(), [], ['tasks']);
  const [claiming, setClaiming] = useState(null);
  const [preview, setPreview] = useState(null);
  useInterval(() => q.reload(), 30000);

  const claim = async (t) => {
    const ok = await confirmDialog({
      title: `استلام المهمة ${taskNo(t.seq)}`,
      text: t.duration_minutes
        ? `ستُسند المهمة إليك وتبدأ مدتها (${duration(t.duration_minutes)}) من الآن. متأكد؟`
        : 'ستُسند المهمة إليك ولن يستطيع أحد غيرك استلامها. متأكد؟',
      confirm: 'استلام',
    });
    if (!ok) return;
    setClaiming(t.id);
    try {
      await api.claim(t.id);
      toast.ok('تم استلام المهمة', 'ستجدها في مهامي وفي روم مهامك بالديسكورد.');
      invalidate('tasks', 'overview');
      navigate('/tasks?open=' + t.id);
    } catch (err) {
      toast.bad('تعذّر الاستلام', errorText(err));
      q.reload();
    } finally {
      setClaiming(null);
    }
  };

  const list = q.data ?? [];
  return html`<div class="page">
    <${PageHead} title="المهام المتاحة" sub="مهام عامة لأي مطوّر — أول من يستلم المهمة تصبح له. يمكنك الاستلام من هنا أو من الديسكورد." />
    ${q.error ? html`<${ErrorBox} error=${q.error} onRetry=${q.reload} />`
      : q.loading && !q.data ? html`<${SkeletonCards} n=${3} />`
      : list.length ? html`<div class="task-grid">${list.map((t, i) => html`<${TaskCard} key=${t.id} task=${t} i=${i} onOpen=${() => setPreview(t)}
          action=${html`<span onClick=${(e) => e.stopPropagation()}><${Button} size="sm" variant="primary" loading=${claiming === t.id} onClick=${() => claim(t)}>استلام</${Button}></span>`} />`)}</div>`
      : html`<${Empty} title="لا توجد مهام متاحة الآن" text="عند نشر مهمة عامة جديدة ستظهر هنا فوراً، وسيصلك تنبيه." />`}
    ${preview && html`<${Drawer} onClose=${() => setPreview(null)}
        head=${html`<div class="grow row" style="gap:10px"><span class="mono faint">${taskNo(preview.seq)}</span><${TaskStatus} task=${preview} /></div>`}
        footer=${(close) => html`<${Button} variant="primary" loading=${claiming === preview.id} onClick=${async () => { await claim(preview); close(); }}>استلام المهمة</${Button}><${Button} variant="ghost" onClick=${close}>إغلاق</${Button}>`}>
        <div class="stack stack-lg">
          <h2 style="margin:0;font-family:var(--font-display);font-size:21px;line-height:1.4">${preview.title}</h2>
          <${TaskFacts} task=${preview} />
          <section class="stack stack-sm"><div class="label">شرح المهمة</div><div class="prose">${preview.description}</div></section>
          ${preview.images?.length > 0 && html`<section class="stack stack-sm"><div class="label">الصور</div><${TaskImages} paths=${preview.images} /></section>`}
        </div>
      </${Drawer}>`}
  </div>`;
}
